#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found. Copy .env.production.example to .env and edit it first."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "==> Pulling latest code..."
git pull origin main

echo "==> Ensuring certbot webroot exists..."
mkdir -p certbot/www

echo "==> Building and starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "==> Waiting for backend..."
sleep 15
docker compose ps

echo ""
echo "Deploy complete!"
echo "  Staff app:    ${PUBLIC_APP_URL:-http://YOUR_SERVER_IP}"
echo "  Tracking:     ${PUBLIC_APP_URL:-http://YOUR_SERVER_IP}/track"
echo ""
echo "View logs:  docker compose logs -f"
echo "Stop:       docker compose down"
