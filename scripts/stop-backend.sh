#!/usr/bin/env bash
# Stop background backend
set -euo pipefail
PIDFILE="/tmp/fm-backend.pid"

stop_pid() {
  local pid=$1
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    sleep 2
    kill -9 "$pid" 2>/dev/null || true
    echo "Stopped process $pid"
  fi
}

if [[ -f "$PIDFILE" ]]; then
  stop_pid "$(cat "$PIDFILE")"
  rm -f "$PIDFILE"
fi

# Also stop anything on port 8080 from this app
for pid in $(lsof -ti:8080 2>/dev/null || true); do
  stop_pid "$pid"
done

echo "Backend stopped."
