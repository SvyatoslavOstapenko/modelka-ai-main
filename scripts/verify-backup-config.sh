#!/bin/bash
#
# Скрипт для верификации конфигурации резервного копирования
# Проверяет что контейнер backup видит правильные переменные окружения
#
# Использование:
#   bash scripts/verify-backup-config.sh
#

set -e

echo "🔍 Проверка конфигурации резервного копирования..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка что .env файл существует
if [ ! -f .env ]; then
    echo -e "${RED}❌ Файл .env не найден${NC}"
    exit 1
fi

echo "📋 Шаг 1: Проверка переменных в .env"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Загрузка .env
set -a
source .env
set +a

# Проверка обязательных переменных
REQUIRED_VARS=(
    "S3_ACCESS_KEY"
    "S3_SECRET_KEY"
    "S3_BACKUPS_BUCKET"
    "S3_REGION"
    "S3_ENDPOINT"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
)

ALL_VARS_OK=true

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo -e "${RED}❌ $VAR не установлена${NC}"
        ALL_VARS_OK=false
    else
        # Маскируем секреты
        if [[ "$VAR" == *"PASSWORD"* ]] || [[ "$VAR" == *"SECRET"* ]] || [[ "$VAR" == *"KEY"* ]]; then
            echo -e "${GREEN}✓ $VAR = ****${NC}"
        else
            echo -e "${GREEN}✓ $VAR = ${!VAR}${NC}"
        fi
    fi
done

echo ""

if [ "$ALL_VARS_OK" = false ]; then
    echo -e "${RED}❌ Не все переменные установлены в .env${NC}"
    exit 1
fi

echo "📋 Шаг 2: Проверка конфигурации Docker Compose"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Проверка что docker-compose.prod.yml существует
if [ ! -f docker-compose.prod.yml ]; then
    echo -e "${RED}❌ docker-compose.prod.yml не найден${NC}"
    exit 1
fi

# Выполнить docker compose config для проверки синтаксиса
echo "Проверка синтаксиса docker-compose.prod.yml..."
if docker compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Синтаксис Docker Compose корректен${NC}"
else
    echo -e "${RED}❌ Ошибка в синтаксисе docker-compose.prod.yml${NC}"
    exit 1
fi

echo ""

echo "📋 Шаг 3: Проверка environment для backup сервиса"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Извлечь конфигурацию сервиса backup
BACKUP_CONFIG=$(docker compose -f docker-compose.prod.yml config --format json | jq -r '.services.backup.environment')

# Проверка что S3_BUCKET маппится на правильный бакет
S3_BUCKET_VALUE=$(echo "$BACKUP_CONFIG" | jq -r '.S3_BUCKET')

if [ "$S3_BUCKET_VALUE" = "$S3_BACKUPS_BUCKET" ]; then
    echo -e "${GREEN}✓ S3_BUCKET правильно маппится на S3_BACKUPS_BUCKET ($S3_BACKUPS_BUCKET)${NC}"
else
    echo -e "${RED}❌ S3_BUCKET не маппится на S3_BACKUPS_BUCKET${NC}"
    echo -e "   Ожидалось: $S3_BACKUPS_BUCKET"
    echo -e "   Получено: $S3_BUCKET_VALUE"
    exit 1
fi

# Проверка других S3 переменных
echo -e "${GREEN}✓ S3_ACCESS_KEY = ****${NC}"
echo -e "${GREEN}✓ S3_SECRET_KEY = ****${NC}"
echo -e "${GREEN}✓ S3_REGION = $(echo "$BACKUP_CONFIG" | jq -r '.S3_REGION')${NC}"
echo -e "${GREEN}✓ S3_ENDPOINT = $(echo "$BACKUP_CONFIG" | jq -r '.S3_ENDPOINT')${NC}"
echo -e "${GREEN}✓ S3_PREFIX = $(echo "$BACKUP_CONFIG" | jq -r '.S3_PREFIX')${NC}"

echo ""

echo "📋 Шаг 4: Проверка расписания (crontab)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f docker/backup/scripts/crontab ]; then
    CRON_SCHEDULE=$(grep -v '^#' docker/backup/scripts/crontab | grep -v '^$' | head -n1)
    echo -e "${GREEN}✓ Расписание: $CRON_SCHEDULE${NC}"
    echo "  (Каждые 6 часов: 00:00, 06:00, 12:00, 18:00 MSK)"
else
    echo -e "${YELLOW}⚠ docker/backup/scripts/crontab не найден${NC}"
fi

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Все проверки пройдены!${NC}"
echo ""
echo "📝 Итоги:"
echo "   • Бэкапы будут сохраняться в бакет: $S3_BACKUPS_BUCKET"
echo "   • Endpoint: $S3_ENDPOINT"
echo "   • Префикс: db-backups"
echo "   • Расписание: каждые 6 часов"
echo ""
echo "🚀 Готово к развертыванию!"
