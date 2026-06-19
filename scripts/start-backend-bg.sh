#!/usr/bin/env bash
# Start backend in background using packaged JAR (stable, survives terminal close)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="/tmp/fm-backend.log"
PIDFILE="/tmp/fm-backend.pid"

port_in_use() {
  lsof -ti:8080 >/dev/null 2>&1
}

if port_in_use; then
  if curl -sf -o /dev/null -w "" http://127.0.0.1:8080/api/auth/login \
      -X POST -H "Content-Type: application/json" -d '{"mobile":"x","password":"y"}' 2>/dev/null \
      || curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/api/auth/login \
      -X POST -H "Content-Type: application/json" -d '{"mobile":"x","password":"y"}' | grep -qE '401|400'; then
    echo "Backend already running on port 8080"
    exit 0
  fi
  echo "Port 8080 is busy but API not responding. Run: ./scripts/stop-backend.sh"
  exit 1
fi

if [[ -f "$PIDFILE" ]]; then
  OLD_PID=$(cat "$PIDFILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null || true
    sleep 1
  fi
  rm -f "$PIDFILE"
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/.env.local"
set +a

JAR="$ROOT/backend/target/famous-mobiles-api-1.0.0.jar"
if [[ ! -f "$JAR" ]]; then
  echo "Building backend JAR..."
  mvn -f "$ROOT/backend/pom.xml" -DskipTests package -q
fi

mkdir -p "$(dirname "$LOG")"
: > "$LOG"

if command -v setsid >/dev/null 2>&1; then
  setsid java -jar "$JAR" >> "$LOG" 2>&1 < /dev/null &
else
  nohup java -jar "$JAR" >> "$LOG" 2>&1 < /dev/null &
fi
echo $! > "$PIDFILE"
disown 2>/dev/null || true

echo "Backend starting (pid $(cat "$PIDFILE"))..."
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/api/auth/login \
    -X POST -H "Content-Type: application/json" -d '{"mobile":"x","password":"y"}' 2>/dev/null) || CODE="000"
  if [[ "$CODE" == "401" || "$CODE" == "400" ]]; then
    echo "Backend ready at http://localhost:8080/api"
    echo "Log: tail -f $LOG"
    echo ""
    echo "Login at http://localhost:3000/login"
    echo "  Mobile:   ${ADMIN_MOBILE:-9000000000}"
    echo "  Password: ${ADMIN_PASSWORD:-Admin@123}"
    exit 0
  fi
  sleep 1
done

echo "Backend failed to start. Last log lines:"
tail -20 "$LOG"
exit 1
