#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
set -a
# shellcheck disable=SC1091
source "$PROJECT_DIR/.env"
set +a

API_DIR="$PROJECT_DIR/backend"
UI_DIR="$PROJECT_DIR/frontend"
BACKEND_PORT="${BACKEND_PORT:-3022}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

[[ -d "$API_DIR/node_modules" && -d "$UI_DIR/node_modules" ]] || { echo 'Install dependencies explicitly in backend and frontend first' >&2; exit 1; }
[[ "${ALLOW_SCHEMA_MIGRATION:-}" == "true" ]] || { echo 'ALLOW_SCHEMA_MIGRATION=true is required' >&2; exit 1; }
[[ "${#JWT_SECRET}" -ge 32 && -n "${GOVERNANCE_TENANT_ID:-}" && -n "${DATABASE_URL:-}" ]] || { echo 'JWT_SECRET (32+ characters), GOVERNANCE_TENANT_ID, and DATABASE_URL are required' >&2; exit 1; }
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $port is already in use; refusing to terminate another process." >&2; exit 1; fi
done

(cd "$API_DIR" && node scripts/prepareRuntime.js)
(cd "$API_DIR" && PORT="$BACKEND_PORT" node server.js) &
api_pid=$!
(cd "$UI_DIR" && PORT="$FRONTEND_PORT" BROWSER=none npm start) &
ui_pid=$!
cleanup(){ kill "$api_pid" "$ui_pid" 2>/dev/null || true; wait "$api_pid" "$ui_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
wait "$api_pid"
