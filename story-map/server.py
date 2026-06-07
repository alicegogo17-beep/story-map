#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import secrets
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("STORY_MAP_DATA_DIR", ROOT / "shared_maps")).resolve()
HOST = os.environ.get("STORY_MAP_HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT") or os.environ.get("STORY_MAP_PORT", "8765"))


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def map_path(share_id: str) -> Path:
    safe_id = "".join(char for char in share_id if char.isalnum() or char in {"-", "_"})
    return DATA_DIR / f"{safe_id}.json"


class StoryMapHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self._write_json(HTTPStatus.OK, {"ok": True})
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
        target = map_path(share_id)
        if not target.exists():
            self._write_json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return

        payload = json.loads(target.read_text("utf-8"))
        self._write_json(HTTPStatus.OK, payload)

    def _handle_create_map(self) -> None:
        try:
            payload = self._read_json_body()
        except ValueError:
            self._write_json(HTTPStatus.BAD_REQUEST, {"error": "invalid_json"})
            return

        map_payload = payload.get("map")
        if not isinstance(map_payload, dict):
            self._write_json(HTTPStatus.BAD_REQUEST, {"error": "invalid_map"})
            return

        ensure_data_dir()
        share_id = payload.get("shareId")
        if not isinstance(share_id, str) or not share_id.strip():
            share_id = secrets.token_urlsafe(6)

        now = utc_now()
        target = map_path(share_id)
        created_at = now
        if target.exists():
            try:
                existing = json.loads(target.read_text("utf-8"))
                created_at = existing.get("createdAt", now)
            except json.JSONDecodeError:
                created_at = now

        document = {
            "shareId": share_id,
            "createdAt": created_at,
            "updatedAt": now,
            "map": map_payload,
        }
        target.write_text(json.dumps(document, ensure_ascii=False, indent=2), encoding="utf-8")
        self._write_json(HTTPStatus.OK, document)

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

        ensure_data_dir()
        share_id = payload["shareId"]
        now = utc_now()
        target = map_path(share_id)
        created_at = now
        if target.exists():
            try:
                existing = json.loads(target.read_text("utf-8"))
                created_at = existing.get("createdAt", now)
            except json.JSONDecodeError:
                created_at = now

        document = {
            "shareId": share_id,
            "createdAt": created_at,
            "updatedAt": now,
            "map": map_payload,
        }
        target.write_text(json.dumps(document, ensure_ascii=False, indent=2), encoding="utf-8")
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
    ensure_data_dir()
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
