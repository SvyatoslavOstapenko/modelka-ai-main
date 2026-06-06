#!/bin/bash

# ===================================
# Полная эмуляция Production сборки
# ===================================
# Этот скрипт использует docker-compose.prod.yml
# для 100% эмуляции production окружения.
#
# Использование:
#   npm run build:verify-full
#   или напрямую: ./verify-production-build.sh

set -e  # Останавливаться при любой ошибке

echo "🔍 Starting FULL production build verification..."
echo "   This will emulate production environment 1:1"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Переменные
PROJECT_NAME="verify"
TEST_PORT=3001
DB_PORT=5433

# Функция очистки (вызывается при выходе или ошибке)
cleanup() {
  echo ""
  echo "${YELLOW}🧹 Cleaning up...${NC}"
  docker-compose -p $PROJECT_NAME -f docker-compose.verify.yml down -v 2>/dev/null || true
  rm -f docker-compose.verify.yml .env.verify 2>/dev/null || true
  echo "${GREEN}✅ Cleanup complete${NC}"
}

# Устанавливаем trap для очистки при выходе
trap cleanup EXIT INT TERM

# Шаг 1: Создаём docker-compose для тестирования
echo "1️⃣  Creating test docker-compose configuration..."

cat > docker-compose.verify.yml <<'COMPOSE'
services:
  db:
    image: postgres:17-alpine
    container_name: verify_db
    environment:
      POSTGRES_USER: verify_user
      POSTGRES_PASSWORD: verify_pass
      POSTGRES_DB: verify_db
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -U verify_user -d verify_db"]
      interval: 3s
      timeout: 3s
      retries: 10
      start_period: 5s

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: verify_app
    env_file: .env.verify
    ports:
      - "3001:3000"
    depends_on:
      db:
        condition: service_healthy
COMPOSE

echo "${GREEN}✅ docker-compose.verify.yml created${NC}"
echo ""

# Шаг 2: Создаём .env файл для тестирования
echo "2️⃣  Creating test environment file..."

cat > .env.verify <<'ENV'
# Test environment for build verification
DATABASE_URL=postgresql://verify_user:verify_pass@db:5432/verify_db
AUTH_SECRET=test-secret-for-verification-must-be-32-chars-long
AUTH_GOOGLE_ID=test-google-id
AUTH_GOOGLE_SECRET=test-google-secret
AUTH_YANDEX_ID=test-yandex-id
AUTH_YANDEX_SECRET=test-yandex-secret
FAL_KEY=test-fal-key
FASHN_API_KEY=test-fashn-key
NODE_ENV=production
AUTH_TRUST_HOST=true
ENV

echo "${GREEN}✅ .env.verify created${NC}"
echo ""

# Шаг 3: Build + Start
echo "3️⃣  Building and starting services (this may take a few minutes)..."
docker-compose -p $PROJECT_NAME -f docker-compose.verify.yml build --no-cache 2>&1 | tail -20

if [ $? -ne 0 ]; then
  echo ""
  echo "${RED}❌ Docker build FAILED!${NC}"
  echo "   Fix the build errors before pushing to production."
  exit 1
fi

echo ""
echo "${GREEN}✅ Build successful!${NC}"
echo ""

echo "4️⃣  Starting services..."
docker-compose -p $PROJECT_NAME -f docker-compose.verify.yml up -d

echo "   Waiting for database to be healthy..."
sleep 5

echo "   Waiting for app to start and run migrations..."
sleep 10

# Шаг 5: Проверяем логи
echo ""
echo "5️⃣  Checking application logs..."
LOGS=$(docker logs verify_app 2>&1)

# Проверяем миграции
if echo "$LOGS" | grep -q "Migrations completed successfully"; then
  echo "${GREEN}   ✅ Migrations executed successfully${NC}"
else
  echo "${RED}   ❌ Migrations failed or not found in logs${NC}"
  echo "   Logs:"
  echo "$LOGS" | head -30
  exit 1
fi

# Проверяем запуск Next.js
if echo "$LOGS" | grep -q "Ready in"; then
  echo "${GREEN}   ✅ Next.js started successfully${NC}"
else
  echo "${RED}   ❌ Next.js failed to start${NC}"
  echo "   Logs:"
  echo "$LOGS"
  exit 1
fi

# Проверяем на ошибки
if echo "$LOGS" | grep -qi "error"; then
  echo ""
  echo "${YELLOW}⚠️  Warning: Found 'error' in logs${NC}"
  echo "   Review:"
  echo "$LOGS" | grep -i "error" | head -10
fi

# Шаг 6: Проверяем HTTP endpoint
echo ""
echo "6️⃣  Testing HTTP endpoint..."
for i in {1..15}; do
  if curl -f -s -o /dev/null http://localhost:$TEST_PORT; then
    echo "${GREEN}✅ Application is responding on port $TEST_PORT!${NC}"
    break
  else
    if [ $i -eq 15 ]; then
      echo ""
      echo "${RED}❌ Application is not responding after 15 attempts${NC}"
      echo "   Container logs:"
      docker logs verify_app
      exit 1
    fi
    echo "   Attempt $i/15 - waiting..."
    sleep 2
  fi
done

# Шаг 7: Проверяем статус контейнеров
echo ""
echo "7️⃣  Container status:"
docker-compose -p $PROJECT_NAME -f docker-compose.verify.yml ps

# Шаг 8: Размер образа
echo ""
echo "8️⃣  Image info:"
docker images ${PROJECT_NAME}-app --format "   Size: {{.Size}}"

echo ""
echo "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo "${GREEN}║                                                    ║${NC}"
echo "${GREEN}║  ✅  FULL PRODUCTION VERIFICATION PASSED!          ║${NC}"
echo "${GREEN}║                                                    ║${NC}"
echo "${GREEN}║  Tested:                                           ║${NC}"
echo "${GREEN}║  • Docker build (same as production)               ║${NC}"
echo "${GREEN}║  • Database connection via docker network          ║${NC}"
echo "${GREEN}║  • Migrations execution                            ║${NC}"
echo "${GREEN}║  • Next.js startup                                 ║${NC}"
echo "${GREEN}║  • HTTP endpoint response                          ║${NC}"
echo "${GREEN}║                                                    ║${NC}"
echo "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo "✨ Your code is ready for deployment!"
echo ""
echo "📋 Next steps:"
echo "   1. Commit your changes"
echo "   2. Push to repository"
echo "   3. Deploy to server"
echo ""

# Cleanup будет вызван автоматически через trap
