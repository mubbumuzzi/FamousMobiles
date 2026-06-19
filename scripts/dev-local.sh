#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export $(grep -v '^#' .env.local | xargs)

echo "==> Starting backend on http://localhost:8080 ..."
cd backend
mvn -q spring-boot:run &
BACKEND_PID=$!

echo "==> Waiting for backend (30s)..."
sleep 30

echo "==> Starting frontend on http://localhost:3000 ..."
cd "$ROOT_DIR/frontend"
NEXT_PUBLIC_API_URL=http://localhost:8080/api npm run dev &
FRONTEND_PID=$!

echo ""
echo "Local dev running:"
echo "  Staff app:  http://localhost:3000"
echo "  Tracking:   http://localhost:3000/track"
echo "  API:        http://localhost:8080/api"
echo "  Login:      admin@famousmobiles.com / FamousMobiles@2026"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
