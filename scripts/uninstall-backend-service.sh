#!/usr/bin/env bash
set -euo pipefail
LABEL="com.famousmobiles.backend"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
UID_NUM="$(id -u)"

if [[ -f "$PLIST" ]]; then
  launchctl bootout "gui/${UID_NUM}" "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
fi

"$(dirname "$0")/stop-backend.sh" 2>/dev/null || true
echo "Backend service removed."
