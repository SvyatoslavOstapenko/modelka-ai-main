#!/bin/bash
# Скрипт для тестирования бэкапа на Ubuntu сервере

set -e

echo "=== 🧪 Тест системы бэкапов ==="
echo ""

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Проверка контейнера
echo -e "${YELLOW}[1/5] Проверка контейнера backup...${NC}"
if docker ps | grep -q db_backup; then
    echo -e "${GREEN}✓ Контейнер db_backup работает${NC}"
else
    echo -e "${RED}✗ Контейнер db_backup не запущен!${NC}"
    echo "Запустите: docker-compose -f docker-compose.prod.yml up -d backup"
    exit 1
fi
echo ""

# 2. Проверка PostgreSQL
echo -e "${YELLOW}[2/5] Проверка подключения к PostgreSQL...${NC}"
if docker exec db_backup pg_isready -h db -U modelka_user > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL доступен${NC}"
else
    echo -e "${RED}✗ PostgreSQL недоступен!${NC}"
    exit 1
fi
echo ""

# 3. Проверка S3
echo -e "${YELLOW}[3/5] Проверка подключения к Yandex S3...${NC}"
if docker exec db_backup bash -c 'aws s3 ls s3://$S3_BUCKET/ --endpoint-url $S3_ENDPOINT' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Yandex S3 доступен${NC}"
else
    echo -e "${RED}✗ Yandex S3 недоступен! Проверьте credentials${NC}"
    exit 1
fi
echo ""

# 4. Создание тестового бэкапа
echo -e "${YELLOW}[4/5] Создание тестового бэкапа...${NC}"
docker exec db_backup /scripts/backup.sh
echo ""

# 5. Проверка бэкапов в S3
echo -e "${YELLOW}[5/5] Проверка бэкапов в S3...${NC}"
BACKUP_COUNT=$(docker exec db_backup bash -c 'aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ --endpoint-url $S3_ENDPOINT' 2>/dev/null | wc -l)

if [ $BACKUP_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ Найдено бэкапов в S3: $BACKUP_COUNT${NC}"
    echo ""
    echo "Последние 3 бэкапа:"
    docker exec db_backup bash -c 'aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ --endpoint-url $S3_ENDPOINT --human-readable' | tail -3
else
    echo -e "${RED}✗ Бэкапы в S3 не найдены${NC}"
    exit 1
fi
echo ""

# Итоговый отчёт
echo "=== ✅ Результаты тестирования ==="
echo -e "${GREEN}✓ Все проверки пройдены успешно!${NC}"
echo ""
echo "Расписание: каждые 6 часов (00:00, 06:00, 12:00, 18:00 MSK)"
echo "Локация: Yandex S3 (бакет из \$S3_BUCKET/db-backups/)"
echo ""
echo "Проверить логи: docker logs db_backup"
echo "Список бэкапов: docker exec db_backup bash -c 'aws s3 ls s3://\$S3_BUCKET/\$S3_PREFIX/ --endpoint-url \$S3_ENDPOINT'"
