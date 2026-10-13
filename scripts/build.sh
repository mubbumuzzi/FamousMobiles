#!/usr/bin/env bash
# Build and restart all production services on the server
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Checking environment..."
if [[ ! -f .env ]]; then
  echo "ERROR: .env not found in $ROOT_DIR!"
  echo "Please create or copy .env first."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "==> Pulling latest code..."
git pull origin main || true

echo "==> Creating required directories..."
mkdir -p certbot/www data/uploads

echo "==> Rebuilding and starting all Docker services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "==> Waiting 15 seconds for backend and database to initialize..."
sleep 15

echo "==> Container status:"
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

echo ""
echo "==> Testing backend API..."
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/api || true)

if [[ "$STATUS_CODE" == "200" || "$STATUS_CODE" == "401" || "$STATUS_CODE" == "404" ]]; then
  echo "SUCCESS: Backend is responding (HTTP $STATUS_CODE)!"
  echo ""
  echo "App is live at:"
  echo "  Staff:    ${PUBLIC_APP_URL:-http://13.140.146.12:8080}"
  echo "  Tracking: ${PUBLIC_APP_URL:-http://13.140.146.12:8080}/track"
  echo "  API:      ${PUBLIC_APP_URL:-http://13.140.146.12:8080}/api"
else
  echo "WARNING: Backend returned HTTP $STATUS_CODE (or not ready yet)."
  echo "Displaying latest backend logs to diagnose:"
  echo "--------------------------------------------------------"
  docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=30 backend
  echo "--------------------------------------------------------"
  echo "To view live logs: docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
fi
