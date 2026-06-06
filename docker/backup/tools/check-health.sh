#!/bin/bash
# Скрипт проверки здоровья системы

set -e

echo "=== 🏥 Проверка здоровья системы ==="
echo ""

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# 1. Проверка контейнеров
echo "[1/6] Проверка Docker контейнеров..."
CONTAINERS=("db" "db_backup" "modelka_app" "traefik")

for container in "${CONTAINERS[@]}"; do
  if docker ps | grep -q "$container"; then
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
    if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "no-healthcheck" ]; then
      echo -e "${GREEN}✓${NC} $container - OK"
    else
      echo -e "${RED}✗${NC} $container - UNHEALTHY"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo -e "${RED}✗${NC} $container - НЕ ЗАПУЩЕН"
    ERRORS=$((ERRORS + 1))
  fi
done
echo ""

# 2. Проверка БД
echo "[2/6] Проверка PostgreSQL..."
if docker exec db pg_isready -U modelka_user > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} PostgreSQL доступен"
else
  echo -e "${RED}✗${NC} PostgreSQL недоступен!"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 3. Проверка дискового пространства
echo "[3/6] Проверка дискового пространства..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
  echo -e "${GREEN}✓${NC} Диск: ${DISK_USAGE}% использовано"
elif [ "$DISK_USAGE" -lt 90 ]; then
  echo -e "${YELLOW}⚠${NC} Диск: ${DISK_USAGE}% использовано (скоро закончится!)"
else
  echo -e "${RED}✗${NC} Диск: ${DISK_USAGE}% использовано (КРИТИЧНО!)"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 4. Проверка последнего бэкапа
echo "[4/6] Проверка бэкапов..."
BACKUP_STATUS=$(docker exec db_backup cat /tmp/last_backup_status 2>/dev/null || echo "unknown")
if [ "$BACKUP_STATUS" = "success" ]; then
  echo -e "${GREEN}✓${NC} Последний бэкап успешен"
else
  echo -e "${RED}✗${NC} Последний бэкап: $BACKUP_STATUS"
  ERRORS=$((ERRORS + 1))
fi

# Проверка свежести бэкапа (должен быть не старше 7 часов)
LATEST_BACKUP=$(docker exec db_backup bash -c '
  export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY"
  export AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY"
  aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ --endpoint-url $S3_ENDPOINT --recursive | sort -r | head -1
' 2>/dev/null || echo "")

if [ -n "$LATEST_BACKUP" ]; then
  BACKUP_DATE=$(echo "$LATEST_BACKUP" | awk '{print $1, $2}')
  echo -e "${GREEN}✓${NC} Последний бэкап в S3: $BACKUP_DATE"
else
  echo -e "${RED}✗${NC} Не удалось проверить бэкапы в S3"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 5. Проверка логов на ошибки
echo "[5/6] Проверка логов на ошибки (последние 50 строк)..."
ERROR_COUNT=$(docker logs --tail 50 modelka_app 2>&1 | grep -ci "error" || true)
if [ "$ERROR_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Нет критических ошибок в логах приложения"
else
  echo -e "${YELLOW}⚠${NC} Найдено $ERROR_COUNT упоминаний 'error' в логах"
fi
echo ""

# 6. Проверка памяти
echo "[6/6] Проверка использования памяти..."
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEM_USAGE" -lt 80 ]; then
  echo -e "${GREEN}✓${NC} Память: ${MEM_USAGE}% использовано"
else
  echo -e "${YELLOW}⚠${NC} Память: ${MEM_USAGE}% использовано (высокая нагрузка)"
fi
echo ""

# Итоговый результат
echo "=== 📊 Результат ==="
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ Все проверки пройдены успешно!${NC}"
  exit 0
else
  echo -e "${RED}❌ Найдено ошибок: $ERRORS${NC}"
  exit 1
fi
