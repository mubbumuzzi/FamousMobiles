#!/usr/bin/env bash
# Prints admin credentials from .env.local — password syncs on backend start when ADMIN_SYNC_ON_START=true
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a
# shellcheck disable=SC1091
source "$ROOT/.env.local"
set +a
echo "Admin login:"
echo "  Mobile:   ${ADMIN_MOBILE:-9000000000}"
echo "  Password: ${ADMIN_PASSWORD:-Admin@123}"
echo ""
echo "Start backend: ./scripts/start-backend.sh"
