#!/usr/bin/env bash
# Install a macOS LaunchAgent so the backend auto-starts and stays running
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.famousmobiles.backend"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
JAR="$ROOT/backend/target/famous-mobiles-api-1.0.0.jar"
LOG="/tmp/fm-backend.log"
JAVA_BIN="$(command -v java)"

if [[ -z "$JAVA_BIN" ]]; then
  echo "ERROR: Java not found. Install JDK 21+ (e.g. brew install openjdk@21)"
  exit 1
fi

if [[ ! -f "$JAR" ]]; then
  echo "Building backend JAR..."
  mvn -f "$ROOT/backend/pom.xml" -DskipTests package -q
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/.env.local"
set +a

# Build EnvironmentVariables XML from sourced .env.local
ENV_XML=""
for key in DB_URL DB_USER DB_PASSWORD JWT_SECRET JWT_REFRESH_SECRET UPLOAD_DIR \
  PUBLIC_APP_URL CORS_ORIGINS ADMIN_EMAIL ADMIN_PASSWORD ADMIN_MOBILE ADMIN_SYNC_ON_START SERVER_PORT; do
  val="${!key:-}"
  if [[ -n "$val" ]]; then
    esc="${val//&/&amp;}"
    esc="${esc//</&lt;}"
    esc="${esc//>/&gt;}"
    ENV_XML="${ENV_XML}  <key>${key}</key><string>${esc}</string>"$'\n'
  fi
done

mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${JAVA_BIN}</string>
    <string>-jar</string>
    <string>${JAR}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
${ENV_XML}  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG}</string>
  <key>StandardErrorPath</key>
  <string>${LOG}</string>
  <key>WorkingDirectory</key>
  <string>${ROOT}/backend</string>
</dict>
</plist>
EOF

UID_NUM="$(id -u)"
launchctl bootout "gui/${UID_NUM}" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/${UID_NUM}" "$PLIST"

echo "Backend service installed."
echo "  API:  http://localhost:8080/api"
echo "  Log:  tail -f ${LOG}"
echo "  Stop: ./scripts/uninstall-backend-service.sh"
echo ""
echo "Waiting for backend..."
for i in $(seq 1 45); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/api/auth/login \
    -X POST -H "Content-Type: application/json" -d '{"mobile":"x","password":"y"}' 2>/dev/null) || CODE="000"
  if [[ "$CODE" == "401" || "$CODE" == "400" ]]; then
    echo "Backend is ready. Refresh http://localhost:3000"
    exit 0
  fi
  sleep 1
done
echo "Service started but API not responding yet. Check: tail -f ${LOG}"
