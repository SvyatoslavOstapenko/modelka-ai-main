#!/bin/bash
# Скрипт для восстановления PostgreSQL из бэкапа

set -e

echo "=== 🔄 Восстановление PostgreSQL из бэкапа ==="
echo ""

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Параметры
BACKUP_DATE=${1:-""}

if [ -z "$BACKUP_DATE" ]; then
    echo -e "${YELLOW}Использование:${NC}"
    echo "  $0 latest                    # Восстановить последний бэкап"
    echo "  $0 2025-12-07_18-00-00       # Восстановить конкретный бэкап"
    echo ""
    echo "Доступные бэкапы:"
    docker exec db_backup bash -c '
      aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ \
        --endpoint-url $S3_ENDPOINT \
        --recursive \
        --human-readable | tail -10
    '
    exit 1
fi

# Найти бэкап
if [ "$BACKUP_DATE" == "latest" ]; then
    echo -e "${YELLOW}Поиск последнего бэкапа...${NC}"
    BACKUP_FILE=$(docker exec db_backup bash -c '
      aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ \
        --endpoint-url $S3_ENDPOINT \
        --recursive | \
      sort -r | \
      head -1 | \
      awk "{print \$4}"
    ')
else
    BACKUP_FILE="db-backups/backup-${BACKUP_DATE}.sql.gz"
fi

echo -e "${GREEN}Выбран бэкап: $BACKUP_FILE${NC}"
echo ""

# Проверка существования бэкапа
if ! docker exec db_backup bash -c "aws s3 ls s3://\$S3_BUCKET/${BACKUP_FILE} --endpoint-url \$S3_ENDPOINT" > /dev/null 2>&1; then
    echo -e "${RED}✗ Бэкап не найден в S3!${NC}"
    exit 1
fi

# Размер бэкапа
BACKUP_SIZE=$(docker exec db_backup bash -c "
  aws s3 ls s3://\$S3_BUCKET/${BACKUP_FILE} \
    --endpoint-url \$S3_ENDPOINT \
    --human-readable | awk '{print \$3, \$4}'
")
echo "Размер бэкапа: $BACKUP_SIZE"
echo ""

# Подтверждение
echo -e "${RED}⚠️  ВНИМАНИЕ: Это ЗАМЕНИТ текущую базу данных!${NC}"
echo -e "${RED}⚠️  Все текущие данные будут удалены!${NC}"
echo ""
read -p "Вы уверены? Введите 'yes' для продолжения: " confirm

if [ "$confirm" != "yes" ]; then
    echo "Отменено."
    exit 0
fi
echo ""

# Скачивание бэкапа
echo -e "${YELLOW}[1/5] Скачивание бэкапа из S3...${NC}"
docker exec db_backup bash -c "
  aws s3 cp \
    s3://\$S3_BUCKET/${BACKUP_FILE} \
    /tmp/restore.sql.gz \
    --endpoint-url \$S3_ENDPOINT
"
echo -e "${GREEN}✓ Бэкап скачан${NC}"
echo ""

# Остановка приложения
echo -e "${YELLOW}[2/5] Остановка приложения...${NC}"
docker-compose -f docker-compose.prod.yml stop app
echo -e "${GREEN}✓ Приложение остановлено${NC}"
echo ""

# Отключение активных соединений
echo -e "${YELLOW}[3/5] Отключение активных соединений к БД...${NC}"
docker exec db psql -U modelka_user -d postgres -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'modelka_db' AND pid <> pg_backend_pid();
" > /dev/null 2>&1 || true
echo -e "${GREEN}✓ Соединения отключены${NC}"
echo ""

# Восстановление
echo -e "${YELLOW}[4/5] Восстановление базы данных...${NC}"
docker exec db_backup bash -c "
  gunzip -c /tmp/restore.sql.gz | \
  PGPASSWORD=\$POSTGRES_PASSWORD psql \
    -h \$POSTGRES_HOST \
    -U \$POSTGRES_USER \
    -d \$POSTGRES_DB \
    --quiet
"
echo -e "${GREEN}✓ База данных восстановлена${NC}"
echo ""

# Очистка
docker exec db_backup rm -f /tmp/restore.sql.gz

# Запуск приложения
echo -e "${YELLOW}[5/5] Запуск приложения...${NC}"
docker-compose -f docker-compose.prod.yml start app
sleep 3
echo -e "${GREEN}✓ Приложение запущено${NC}"
echo ""

# Проверка
echo "=== Проверка восстановления ==="
TABLE_COUNT=$(docker exec db psql -U modelka_user -d modelka_db -t -c "
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = 'public'
")
echo "Таблиц восстановлено: $(echo $TABLE_COUNT | tr -d ' ')"
echo ""

echo -e "${GREEN}✅ База данных успешно восстановлена!${NC}"
echo ""
echo "Проверьте работоспособность приложения:"
echo "  docker logs -f modelka_app"
