#!/bin/bash
set -e

echo "[$(date)] Starting PostgreSQL backup..."

# Функция для отправки статуса в healthchecks.io
send_healthcheck() {
  local status=$1
  if [ -n "${HEALTHCHECK_URL}" ]; then
    if [ "$status" = "success" ]; then
      curl -fsS -m 10 --retry 3 "${HEALTHCHECK_URL}" > /dev/null 2>&1 || echo "[$(date)] Warning: Failed to send healthcheck ping"
    else
      curl -fsS -m 10 --retry 3 "${HEALTHCHECK_URL}/fail" > /dev/null 2>&1 || echo "[$(date)] Warning: Failed to send healthcheck fail"
    fi
  fi
}

# Проверка обязательных переменных
: ${POSTGRES_HOST:?}
: ${POSTGRES_DB:?}
: ${POSTGRES_USER:?}
: ${POSTGRES_PASSWORD:?}
: ${S3_BUCKET:?}
: ${S3_ENDPOINT:?}

# Генерация имени файла с временной меткой
BACKUP_FILE="backup-$(date +%Y-%m-%d_%H-%M-%S).sql.gz"
TEMP_FILE="/tmp/${BACKUP_FILE}"

# Создание бэкапа
echo "[$(date)] Dumping database ${POSTGRES_DB}..."
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --clean --if-exists \
  | gzip > "${TEMP_FILE}"

# Проверка что файл создан
if [ ! -f "${TEMP_FILE}" ]; then
  echo "[$(date)] ERROR: Backup file was not created!" >&2
  echo "failed" > /tmp/last_backup_status
  send_healthcheck "fail"
  exit 1
fi

BACKUP_SIZE=$(du -h "${TEMP_FILE}" | cut -f1)
echo "[$(date)] Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Настройка AWS CLI для S3-compatible endpoint
export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}"
export AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}"
export AWS_DEFAULT_REGION="${S3_REGION:-ru-central1}"

# Загрузка в S3
S3_KEY="${S3_PREFIX:-db-backups}/${BACKUP_FILE}"
echo "[$(date)] Uploading to s3://${S3_BUCKET}/${S3_KEY}..."

# Yandex S3 требует использования s3api и правильной конфигурации
aws s3api put-object \
  --bucket "${S3_BUCKET}" \
  --key "${S3_KEY}" \
  --body "${TEMP_FILE}" \
  --endpoint-url "${S3_ENDPOINT}"

if [ $? -eq 0 ]; then
  echo "[$(date)] ✓ Backup uploaded successfully!"
  echo "success" > /tmp/last_backup_status
  send_healthcheck "success"
else
  echo "[$(date)] ERROR: Failed to upload backup to S3!" >&2
  echo "failed" > /tmp/last_backup_status
  send_healthcheck "fail"
  exit 1
fi

# Удаление временного файла
rm -f "${TEMP_FILE}"

echo "[$(date)] Backup completed!"
