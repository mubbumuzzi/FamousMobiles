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

# Parse JSON field from stdin (field path with dots, e.g. accessToken or revenueToday)
json_field() {
  python3 -c "import json,sys; d=json.load(sys.stdin); p='$1'.split('.');
for k in p: d=d.get(k) if isinstance(d,dict) else None
print('' if d is None else d)"
}

# POST login; prints accessToken on stdout, exits non-zero on failure
login_token() {
  local mobile="$1"
  local password="$2"
  local body http_code token
  body=$(curl -s -w "\n%{http_code}" "$API/auth/login" -X POST \
    -H "Content-Type: application/json" \
    -d "{\"mobile\":\"$mobile\",\"password\":\"$password\"}")
  http_code=$(echo "$body" | tail -n1)
  body=$(echo "$body" | sed '$d')
  [[ "$http_code" == "200" ]] || return 1
  token=$(echo "$body" | json_field accessToken)
  [[ -n "$token" ]] || return 1
  echo "$token"
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

ADMIN_TOKEN=""
TECH_TOKEN=""
TEST_TICKET_ID=""

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a

  # Admin login
  if ADMIN_TOKEN=$(login_token "${ADMIN_MOBILE:-9000000000}" "${ADMIN_PASSWORD}" 2>/dev/null); then
    check "Admin login (mobile + password)" "1"
  else
    check "Admin login (mobile + password)" "0"
  fi

  if [[ -n "$ADMIN_TOKEN" ]]; then
    auth="Authorization: Bearer $ADMIN_TOKEN"

    # Dashboard — admin sees revenue fields
    metrics=$(curl -s -w "\n%{http_code}" "$API/dashboard/metrics" -H "$auth")
    metrics_code=$(echo "$metrics" | tail -n1)
    metrics_body=$(echo "$metrics" | sed '$d')
    revenue_key=$(echo "$metrics_body" | python3 -c "import json,sys; d=json.load(sys.stdin); print('revenueToday' in d)" 2>/dev/null || echo "False")
    [[ "$metrics_code" == "200" && "$revenue_key" == "True" ]] && dash_ok=1 || dash_ok=0
    check "Admin dashboard includes revenue" "$dash_ok"

    # Core list endpoints
    for ep in tickets customers technicians; do
      ep_code=$(curl -s -o /dev/null -w "%{http_code}" "$API/$ep" -H "$auth" || true)
      [[ "$ep_code" == "200" ]] && ep_ok=1 || ep_ok=0
      check "GET /$ep" "$ep_ok"
    done

    # Create customer + ticket flow
    test_mobile="9$(date +%s | tail -c 10)"
    cust_resp=$(curl -s -w "\n%{http_code}" "$API/customers" -X POST -H "$auth" \
      -H "Content-Type: application/json" \
      -d "{\"fullName\":\"Smoke Test Customer\",\"mobile\":\"$test_mobile\"}")
    cust_code=$(echo "$cust_resp" | tail -n1)
    cust_body=$(echo "$cust_resp" | sed '$d')
    cust_id=$(echo "$cust_body" | json_field id)
    [[ "$cust_code" == "200" || "$cust_code" == "201" ]] && [[ -n "$cust_id" ]] && cust_ok=1 || cust_ok=0
    check "Create customer" "$cust_ok"

    if [[ "$cust_ok" == "1" ]]; then
      ticket_resp=$(curl -s -w "\n%{http_code}" "$API/tickets" -X POST -H "$auth" \
        -H "Content-Type: application/json" \
        -d "{\"customerId\":\"$cust_id\",\"deviceType\":\"MOBILE\",\"brand\":\"Samsung\",\"model\":\"A14\",\"color\":\"Black\",\"problemDescription\":\"Smoke test\",\"estimatedCost\":0,\"advancePaid\":0}")
      ticket_code=$(echo "$ticket_resp" | tail -n1)
      ticket_body=$(echo "$ticket_resp" | sed '$d')
      TEST_TICKET_ID=$(echo "$ticket_body" | json_field id)
      tracking=$(echo "$ticket_body" | json_field trackingNumber)
      [[ "$ticket_code" == "200" || "$ticket_code" == "201" ]] && [[ -n "$TEST_TICKET_ID" ]] && ticket_ok=1 || ticket_ok=0
      check "Create repair ticket" "$ticket_ok"

      if [[ "$ticket_ok" == "1" ]]; then
        status_resp=$(curl -s -o /dev/null -w "%{http_code}" "$API/tickets/$TEST_TICKET_ID/status" -X PATCH \
          -H "$auth" -H "Content-Type: application/json" \
          -d '{"status":"UNDER_DIAGNOSIS","remarks":"Smoke test status change"}' || true)
        [[ "$status_resp" == "200" ]] && status_ok=1 || status_ok=0
        check "Update ticket status (any-stage transition)" "$status_ok"

        timeline_code=$(curl -s -o /dev/null -w "%{http_code}" "$API/tickets/$TEST_TICKET_ID/timeline" -H "$auth" || true)
        [[ "$timeline_code" == "200" ]] && timeline_ok=1 || timeline_ok=0
        check "Ticket timeline (no LazyInitializationException)" "$timeline_ok"

        if [[ -n "$tracking" ]]; then
          track_code=$(curl -s -o /dev/null -w "%{http_code}" "$API/public/track/$tracking" || true)
          [[ "$track_code" == "200" ]] && track_ok=1 || track_ok=0
          check "Public tracking by number" "$track_ok"
        fi
      fi
    fi

    # Technician self-assign flow (create temp tech staff if needed)
    tech_mobile="8$(date +%s | tail -c 10)"
    tech_pw="SmokeTest@2026"
    user_resp=$(curl -s -w "\n%{http_code}" "$API/users" -X POST -H "$auth" \
      -H "Content-Type: application/json" \
      -d "{\"fullName\":\"Smoke Test Tech\",\"mobile\":\"$tech_mobile\",\"password\":\"$tech_pw\",\"role\":\"TECHNICIAN\"}")
    user_code=$(echo "$user_resp" | tail -n1)
    [[ "$user_code" == "200" || "$user_code" == "201" ]] && tech_user_ok=1 || tech_user_ok=0
    check "Create technician staff (auto-links profile)" "$tech_user_ok"

    if [[ "$tech_user_ok" == "1" ]] && TECH_TOKEN=$(login_token "$tech_mobile" "$tech_pw" 2>/dev/null); then
      check "Technician login" "1"
      tech_auth="Authorization: Bearer $TECH_TOKEN"

      # Revenue hidden from non-admin
      tech_metrics=$(curl -s "$API/dashboard/metrics" -H "$tech_auth")
      tech_revenue=$(echo "$tech_metrics" | json_field revenueToday)
      [[ -z "$tech_revenue" ]] && revenue_hidden=1 || revenue_hidden=0
      check "Staff dashboard hides revenue" "$revenue_hidden"

      tech_tickets_code=$(curl -s -o /dev/null -w "%{http_code}" "$API/tickets" -H "$tech_auth" || true)
      [[ "$tech_tickets_code" == "200" ]] && tech_tickets_ok=1 || tech_tickets_ok=0
      check "Technician can list tickets" "$tech_tickets_ok"

      if [[ -n "$TEST_TICKET_ID" ]]; then
        assign_code=$(curl -s -o /dev/null -w "%{http_code}" "$API/tickets/$TEST_TICKET_ID/assign-me" -X POST -H "$tech_auth" || true)
        [[ "$assign_code" == "200" ]] && assign_ok=1 || assign_ok=0
        check "Technician assign-me on ticket" "$assign_ok"
      fi
    else
      check "Technician login" "0"
    fi
  fi
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
  echo "  4. Unit tests:      cd backend && mvn test"
  exit 1
fi

echo ""
echo "Local app ready:"
echo "  Staff:    $WEB"
echo "  Login:    $WEB/login"
echo "  Tracking: $WEB/track"
echo "  Admin mobile: ${ADMIN_MOBILE:-9000000000} (password in .env.local)"
