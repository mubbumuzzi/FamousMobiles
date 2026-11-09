#!/bin/bash
set -euo pipefail

# Famous Mobiles — Automated PostgreSQL Database Backup Script
# Usage: ./scripts/backup-db.sh [backup_dir]

BACKUP_DIR="${1:-./data/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/famousmobiles_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

echo "========================================================="
echo " Famous Mobiles DB Backup: $(date)"
echo " Destination: ${BACKUP_FILE}"
echo "========================================================="

DB_USER="${DB_USER:-famousmobiles}"
DB_NAME="${DB_NAME:-famousmobiles}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

if command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -q 'postgres'; then
    echo "Dumping via Docker container (postgres)..."
    docker exec -t "$(docker ps --filter "name=postgres" -q | head -n 1)" \
        pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_FILE}"
elif command -v pg_dump &> /dev/null; then
    echo "Dumping via host pg_dump tool..."
    PGPASSWORD="${DB_PASSWORD:-famousmobiles}" pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_FILE}"
else
    echo "ERROR: Neither docker nor pg_dump was found in PATH." >&2
    exit 1
fi

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "Backup created successfully: ${BACKUP_FILE} (${FILE_SIZE})"

# Retention: Purge backups older than RETENTION_DAYS
echo "Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "famousmobiles_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm -f {} \; || true

echo "Backup complete: $(date)"
