#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API="${NEXT_PUBLIC_API_URL:-http://localhost:8080/api}"
WEB="${PUBLIC_APP_URL:-http://localhost:3000}"

pass=0
fail=0

check() {
  local name="$1"
  local ok="$2"
  if [[ "$ok" == "1" ]]; then
    echo "  OK   $name"
    pass=$((pass + 1))
  else
    echo "  FAIL $name"
    fail=$((fail + 1))
  fi
}

echo "==> Famous Mobiles local smoke test"
echo ""

# Backend up
code=$(curl -s -o /dev/null -w "%{http_code}" "$API/auth/login" -X POST -H "Content-Type: application/json" -d '{"mobile":"x","password":"y"}' || true)
[[ "$code" == "401" || "$code" == "400" ]] && backend_up=1 || backend_up=0
check "Backend reachable at $API" "$backend_up"

# Frontend up
web_code=$(curl -s -o /dev/null -w "%{http_code}" "$WEB/login" || true)
[[ "$web_code" == "200" || "$web_code" == "307" ]] && frontend_up=1 || frontend_up=0
check "Frontend reachable at $WEB" "$frontend_up"

# DB migration (mobile column)
if command -v psql >/dev/null 2>&1 && [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
  mobile_col=$(psql -h localhost -U "$DB_USER" -d famousmobiles -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mobile'" 2>/dev/null || echo "")
  [[ "$mobile_col" == "1" ]] && migration_ok=1 || migration_ok=0
  check "Database migration V2 (users.mobile)" "$migration_ok"
else
  check "Database migration V2 (users.mobile)" "0"
fi

# Admin login (uses .env.local — output suppressed)
if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
  login_code=$(curl -s -o /dev/null -w "%{http_code}" "$API/auth/login" -X POST -H "Content-Type: application/json" \
    -d "{\"mobile\":\"${ADMIN_MOBILE:-9000000000}\",\"password\":\"${ADMIN_PASSWORD}\"}" || true)
  [[ "$login_code" == "200" ]] && login_ok=1 || login_ok=0
  check "Admin login (mobile + password)" "$login_ok"
else
  check "Admin login (mobile + password)" "0"
fi

echo ""
echo "Result: $pass passed, $fail failed"
if [[ "$fail" -gt 0 ]]; then
  echo ""
  echo "Tips:"
  echo "  1. Start PostgreSQL: brew services start postgresql@16"
  echo "  2. Start backend:   ./scripts/start-backend.sh"
  echo "  3. Start frontend:  cd frontend && NEXT_PUBLIC_API_URL=http://localhost:8080/api npm run dev"
  exit 1
fi

echo ""
echo "Local app ready:"
echo "  Staff:    $WEB"
echo "  Login:    $WEB/login"
echo "  Tracking: $WEB/track"
echo "  Admin mobile: ${ADMIN_MOBILE:-9000000000} (password in .env.local)"
