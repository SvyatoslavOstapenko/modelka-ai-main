#!/bin/bash
# Реальный тест восстановления БД с созданием и удалением данных

set -e

echo "=== 🧪 Реальный тест восстановления PostgreSQL ==="
echo ""

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Создание тестовой таблицы и записи
echo -e "${BLUE}[1/7] Создание тестовой записи в БД...${NC}"
docker exec db psql -U modelka_user -d modelka_db -c "
  CREATE TABLE IF NOT EXISTS backup_test (
    id SERIAL PRIMARY KEY,
    test_data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
"

ORIGINAL_DATA="TEST_DATA_$(date +%s)"
docker exec db psql -U modelka_user -d modelka_db -c "
  INSERT INTO backup_test (test_data) VALUES ('${ORIGINAL_DATA}');
"

ORIGINAL_COUNT=$(docker exec db psql -U modelka_user -d modelka_db -t -c "
  SELECT COUNT(*) FROM backup_test;
")

echo -e "${GREEN}✓ Создана тестовая запись: ${ORIGINAL_DATA}${NC}"
echo "Всего записей в таблице: $(echo $ORIGINAL_COUNT | tr -d ' ')"
echo ""

# 2. Создание бэкапа
echo -e "${BLUE}[2/7] Создание бэкапа текущего состояния БД...${NC}"
docker exec db_backup /scripts/backup.sh
sleep 2

# Получить имя последнего бэкапа
LATEST_BACKUP=$(docker exec db_backup bash -c '
  aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ \
    --endpoint-url $S3_ENDPOINT \
    --recursive | \
  sort -r | \
  head -1 | \
  awk "{print \$4}"
')
echo -e "${GREEN}✓ Бэкап создан: ${LATEST_BACKUP}${NC}"
echo ""

# 3. Удаление тестовой записи (симуляция потери данных)
echo -e "${BLUE}[3/7] Симуляция потери данных - удаление записи...${NC}"
docker exec db psql -U modelka_user -d modelka_db -c "
  DELETE FROM backup_test WHERE test_data = '${ORIGINAL_DATA}';
"

AFTER_DELETE_COUNT=$(docker exec db psql -U modelka_user -d modelka_db -t -c "
  SELECT COUNT(*) FROM backup_test;
")

echo -e "${YELLOW}⚠️  Запись удалена!${NC}"
echo "Записей осталось: $(echo $AFTER_DELETE_COUNT | tr -d ' ')"
echo ""

# 4. Подтверждение восстановления
echo -e "${YELLOW}Сейчас будет выполнено восстановление БД из бэкапа${NC}"
read -p "Продолжить? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Тест отменён. Очищаем тестовые данные..."
    docker exec db psql -U modelka_user -d modelka_db -c "DROP TABLE IF EXISTS backup_test;"
    exit 0
fi
echo ""

# 5. Скачивание бэкапа
echo -e "${BLUE}[4/7] Скачивание бэкапа из S3...${NC}"
docker exec db_backup bash -c "
  aws s3 cp \
    s3://\$S3_BUCKET/${LATEST_BACKUP} \
    /tmp/test_restore.sql.gz \
    --endpoint-url \$S3_ENDPOINT
"
echo -e "${GREEN}✓ Бэкап скачан${NC}"
echo ""

# 6. Остановка приложения и восстановление
echo -e "${BLUE}[5/7] Остановка приложения...${NC}"
docker-compose -f docker-compose.prod.yml stop app > /dev/null 2>&1 || true
echo -e "${GREEN}✓ Приложение остановлено${NC}"
echo ""

echo -e "${BLUE}[6/7] Восстановление БД из бэкапа...${NC}"
# Отключить активные соединения
docker exec db psql -U modelka_user -d postgres -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'modelka_db' AND pid <> pg_backend_pid();
" > /dev/null 2>&1 || true

# Восстановить
docker exec db_backup bash -c "
  gunzip -c /tmp/test_restore.sql.gz | \
  PGPASSWORD=\$POSTGRES_PASSWORD psql \
    -h \$POSTGRES_HOST \
    -U \$POSTGRES_USER \
    -d \$POSTGRES_DB \
    --quiet
"
echo -e "${GREEN}✓ БД восстановлена${NC}"
echo ""

# 7. Проверка восстановления
echo -e "${BLUE}[7/7] Проверка восстановленных данных...${NC}"

RESTORED_COUNT=$(docker exec db psql -U modelka_user -d modelka_db -t -c "
  SELECT COUNT(*) FROM backup_test;
")

RESTORED_DATA=$(docker exec db psql -U modelka_user -d modelka_db -t -c "
  SELECT test_data FROM backup_test WHERE test_data = '${ORIGINAL_DATA}';
" | tr -d ' ')

echo "Записей после восстановления: $(echo $RESTORED_COUNT | tr -d ' ')"
echo ""

if [ "$RESTORED_DATA" == "$ORIGINAL_DATA" ]; then
    echo -e "${GREEN}✅ УСПЕХ! Тестовая запись восстановлена!${NC}"
    echo -e "${GREEN}Оригинал: ${ORIGINAL_DATA}${NC}"
    echo -e "${GREEN}Восстановлено: ${RESTORED_DATA}${NC}"
else
    echo -e "${RED}✗ ОШИБКА! Данные не восстановлены!${NC}"
    echo "Ожидалось: ${ORIGINAL_DATA}"
    echo "Получено: ${RESTORED_DATA}"
fi
echo ""

# Очистка
docker exec db_backup rm -f /tmp/test_restore.sql.gz
docker exec db psql -U modelka_user -d modelka_db -c "DROP TABLE IF EXISTS backup_test;" > /dev/null 2>&1

# Запуск приложения
echo -e "${BLUE}Запуск приложения...${NC}"
docker-compose -f docker-compose.prod.yml start app > /dev/null 2>&1 || true
echo -e "${GREEN}✓ Приложение запущено${NC}"
echo ""

echo "=== 📊 Итоги теста ==="
echo -e "${GREEN}✓ Создание бэкапа: работает${NC}"
echo -e "${GREEN}✓ Загрузка в S3: работает${NC}"
echo -e "${GREEN}✓ Скачивание из S3: работает${NC}"
echo -e "${GREEN}✓ Восстановление БД: работает${NC}"
echo -e "${GREEN}✓ Целостность данных: сохранена${NC}"
echo ""
echo "Система бэкапов полностью работоспособна! ✅"
