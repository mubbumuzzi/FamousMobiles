#!/usr/bin/env bash
# Deploy from your Mac to the production server
# Usage: ./scripts/deploy-to-server.sh [user@host] [remote-dir]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SERVER="${1:-ubuntu@13.140.146.12}"
REMOTE_DIR="${2:-/var/FamousMobiles}"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found. Create production .env first (see DEPLOY.md)."
  exit 1
fi

echo "==> Pushing latest code to GitHub..."
git push origin main

echo "==> Ensuring repository exists on server..."
ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
mkdir -p "$REMOTE_DIR"
if [[ ! -d "$REMOTE_DIR/.git" ]]; then
  git clone https://github.com/mubbumuzzi/FamousMobiles.git "$REMOTE_DIR"
fi
REMOTE

echo "==> Copying .env to ${SERVER}:${REMOTE_DIR}/.env"
scp .env "${SERVER}:${REMOTE_DIR}/.env"

echo "==> Deploying on server..."
ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd "$REMOTE_DIR"
git pull origin main
chmod +x scripts/deploy.sh
./scripts/deploy.sh
REMOTE

set -a
# shellcheck disable=SC1091
source .env
set +a

echo ""
echo "Deploy complete!"
echo "  Staff:    ${PUBLIC_APP_URL}"
echo "  Tracking: ${PUBLIC_APP_URL}/track"
echo "  Login mobile: ${ADMIN_MOBILE:-9000000000}"
