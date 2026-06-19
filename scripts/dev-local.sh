#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.local ]]; then
  echo "ERROR: .env.local not found."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

free_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "==> Stopping process on port $port..."
    kill $pids 2>/dev/null || true
    sleep 2
  fi
}

free_port 8080
free_port 3000

echo "==> Starting backend on http://localhost:8080 ..."
cd backend
mvn -q spring-boot:run &
BACKEND_PID=$!

echo "==> Waiting for backend..."
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/auth/login -X POST \
    -H "Content-Type: application/json" -d '{"mobile":"x","password":"y"}' || true)
  if [[ "$code" == "401" || "$code" == "400" ]]; then
    echo "    Backend ready."
    break
  fi
  sleep 2
done

echo "==> Starting frontend on http://localhost:3000 ..."
cd "$ROOT_DIR/frontend"
NEXT_PUBLIC_API_URL=http://localhost:8080/api npm run dev &
FRONTEND_PID=$!

echo ""
echo "Local dev running:"
echo "  Staff app:  http://localhost:3000"
echo "  Tracking:   http://localhost:3000/track"
echo "  API:        http://localhost:8080/api"
echo "  Login:      mobile ${ADMIN_MOBILE:-9000000000} / (see .env.local ADMIN_PASSWORD)"
echo ""
echo "Run smoke test: ./scripts/test-local.sh"
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
