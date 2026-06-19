#!/usr/bin/env bash
# Run the Spring Boot JAR with env from .env.local (foreground)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v java >/dev/null 2>&1; then
  echo "ERROR: Java not found. Install JDK 21+ (e.g. brew install openjdk@21)"
  exit 1
fi

if ! pg_isready -h localhost -p 5432 -q 2>/dev/null; then
  echo "ERROR: PostgreSQL is not running on localhost:5432"
  echo "  brew services start postgresql@16"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/.env.local"
set +a

JAR="$ROOT/backend/target/famous-mobiles-api-1.0.0.jar"
if [[ ! -f "$JAR" ]]; then
  echo "Building backend JAR (first run, ~30s)..."
  mvn -f "$ROOT/backend/pom.xml" -DskipTests package -q
fi

echo "Starting backend at http://localhost:8080/api"
exec java -jar "$JAR"
