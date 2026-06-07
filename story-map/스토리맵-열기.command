#!/bin/zsh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
PORT="${STORY_MAP_PORT:-8765}"
if ! lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  python3 server.py >/tmp/story-map-server.log 2>&1 &
  sleep 1
fi
open "http://127.0.0.1:${PORT}"
