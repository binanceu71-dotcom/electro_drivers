#!/bin/bash
# ========================================================
# Electrodrivers Portal — Automated PostgreSQL Backup Script
# Place in cron: 0 3 * * * /app/scripts/backup-db.sh
# ========================================================

BACKUP_DIR="/var/backups/electrodrivers"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=14

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting Electrodrivers database backup..."

if [ -f "/.dockerenv" ] || docker ps 2>/dev/null | grep -q electrodrivers_postgres; then
    docker exec -t electrodrivers_postgres pg_dump -U electro_admin electrodrivers_db | gzip > "${BACKUP_FILE}"
else
    pg_dump -U electro_admin electrodrivers_db | gzip > "${BACKUP_FILE}"
fi

if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    echo "[$(date)] Backup completed successfully: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
else
    echo "[$(date)] ERROR: Backup failed!" >&2
    exit 1
fi

# Remove backups older than 14 days
find "${BACKUP_DIR}" -type f -name "db_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Old backups purged (retention: ${RETENTION_DAYS} days)."
