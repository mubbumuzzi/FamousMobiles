#!/usr/bin/env bash
# Check if backend API is reachable
set -euo pipefail
CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/api/auth/login \
  -X POST -H "Content-Type: application/json" -d '{"mobile":"x","password":"y"}' 2>/dev/null) || CODE="000"

if [[ "$CODE" == "401" || "$CODE" == "400" ]]; then
  echo "OK — Backend is running on http://localhost:8080/api"
  exit 0
fi

echo "DOWN — Backend not reachable (got HTTP $CODE)"
echo "Start it with: ./scripts/start-backend-bg.sh"
exit 1
