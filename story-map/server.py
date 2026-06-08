#!/usr/bin/env python3

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


ROOT = Path(__file__).resolve().parent
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
HOST = os.environ.get("STORY_MAP_HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT") or os.environ.get("STORY_MAP_PORT", "8765"))


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def is_supabase_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


def create_share_id() -> str:
    import secrets
    return secrets.token_urlsafe(9).replace("-", "").replace("_", "")[:12]


def supabase_headers(*, prefer: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def supabase_request(
    method: str,
    path: str,
    *,
    params: dict[str, str] | None = None,
    payload: object | None = None,
    prefer: str | None = None,
) -> tuple[int, object]:
    if not is_supabase_configured():
        raise RuntimeError("supabase_not_configured")

    query = f"?{urlencode(params)}" if params else ""
    url = f"{SUPABASE_URL}/rest/v1/{path}{query}"
    body = None
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    request = Request(
        url,
        data=body,
        method=method,
        headers=supabase_headers(prefer=prefer),
    )

    try:
        with urlopen(request) as response:
            raw = response.read().decode("utf-8") or "null"
            return response.status, json.loads(raw)
    except HTTPError as error:
        raw = error.read().decode("utf-8") or "null"
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {"message": raw}
        return error.code, parsed
    except URLError as error:
        raise RuntimeError(f"upstream_unreachable: {error.reason}") from error


class StoryMapHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self._write_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "supabaseConfigured": is_supabase_configured(),
                },
            )
            return

        if parsed.path.startswith("/api/maps/"):
            share_id = parsed.path.removeprefix("/api/maps/").strip("/")
            self._handle_get_map(share_id)
            return

        if parsed.path.startswith("/share/"):
            self.path = "/index.html"
            return super().do_GET()

        return super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/maps":
            self._handle_create_map()
            return

        self.send_error(HTTPStatus.NOT_FOUND)

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/maps/"):
            share_id = parsed.path.removeprefix("/api/maps/").strip("/")
            self._handle_update_map(share_id)
            return

        self.send_error(HTTPStatus.NOT_FOUND)

    def _read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length)
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as error:
            raise ValueError("invalid_json") from error

    def _handle_get_map(self, share_id: str) -> None:
        try:
            status, payload = supabase_request(
                "GET",
                "story_maps",
                params={
                    "select": "share_id,created_at,updated_at,map_json",
                    "share_id": f"eq.{share_id}",
                    "limit": "1",
                },
            )
        except RuntimeError as error:
            self._write_json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(error)})
            return

        if status >= 400:
            self._write_json(HTTPStatus(status), {"error": payload})
            return

        rows = payload if isinstance(payload, list) else []
        if not rows:
            self._write_json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return

        record = rows[0]
        document = {
            "shareId": record.get("share_id", share_id),
            "createdAt": record.get("created_at", utc_now()),
            "updatedAt": record.get("updated_at", utc_now()),
            "map": record.get("map_json") or {},
        }
        self._write_json(HTTPStatus.OK, document)

    def _handle_create_map(self) -> None:
        try:
            payload = self._read_json_body()
        except ValueError:
            self._write_json(HTTPStatus.BAD_REQUEST, {"error": "invalid_json"})
            return

        self._handle_create_map_with_payload(payload)

    def _handle_update_map(self, share_id: str) -> None:
        try:
            payload = self._read_json_body()
        except ValueError:
            self._write_json(HTTPStatus.BAD_REQUEST, {"error": "invalid_json"})
            return

        payload["shareId"] = share_id
        self._handle_create_map_with_payload(payload)

    def _handle_create_map_with_payload(self, payload: dict) -> None:
        map_payload = payload.get("map")
        if not isinstance(map_payload, dict):
            self._write_json(HTTPStatus.BAD_REQUEST, {"error": "invalid_map"})
            return

        share_id = payload.get("shareId")
        if not isinstance(share_id, str) or not share_id.strip():
            share_id = create_share_id()

        now = utc_now()
        record = {
            "share_id": share_id,
            "title": map_payload.get("title", "") if isinstance(map_payload, dict) else "",
            "map_json": map_payload,
            "updated_at": now,
        }

        try:
            status, response_payload = supabase_request(
                "POST",
                "story_maps",
                params={
                    "on_conflict": "share_id",
                    "select": "share_id,created_at,updated_at,map_json",
                },
                payload=[record],
                prefer="resolution=merge-duplicates,return=representation",
            )
        except RuntimeError as error:
            self._write_json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(error)})
            return

        if status >= 400:
            self._write_json(HTTPStatus(status), {"error": response_payload})
            return

        rows = response_payload if isinstance(response_payload, list) else []
        created = rows[0] if rows else record
        document = {
            "shareId": created.get("share_id", share_id),
            "createdAt": created.get("created_at", now),
            "updatedAt": created.get("updated_at", now),
            "map": created.get("map_json") or map_payload,
        }
        self._write_json(HTTPStatus.OK, document)

    def _write_json(self, status: HTTPStatus, payload: dict) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)


def run() -> None:
    server = ThreadingHTTPServer((HOST, PORT), StoryMapHandler)
    print(f"Story Map server running at http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    run()
