#!/usr/bin/env bash
# Run this ON THE SERVER after SSH login (first-time or update)
set -euo pipefail

APP_DIR="${1:-/var/FamousMobiles}"
REPO="https://github.com/mubbumuzzi/FamousMobiles.git"

echo "==> Checking Docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [[ ! -d .git ]]; then
  echo "==> Cloning repository..."
  git clone "$REPO" .
else
  echo "==> Pulling latest code..."
  git pull origin main
fi

if [[ ! -f .env ]]; then
  echo ""
  echo "ERROR: .env missing in $APP_DIR"
  echo "From your Mac, copy it:"
  echo "  scp .env YOUR_USER@13.140.146.12:$APP_DIR/.env"
  echo ""
  echo "Or create .env from .env.production.example and edit values."
  exit 1
fi

chmod +x scripts/deploy.sh
./scripts/deploy.sh

set -a
# shellcheck disable=SC1091
source .env
set +a

echo ""
echo "Open firewall port 8080 if needed:"
echo "  sudo ufw allow 8080/tcp && sudo ufw allow OpenSSH && sudo ufw enable"
echo ""
echo "App URLs:"
echo "  Staff:    ${PUBLIC_APP_URL:-http://13.140.146.12:8080}"
echo "  Tracking: ${PUBLIC_APP_URL:-http://13.140.146.12:8080}/track"
