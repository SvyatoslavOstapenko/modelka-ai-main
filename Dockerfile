# 1. Base image (Node 22 is now LTS since October 2024)
FROM node:22-alpine AS base

# 2. Dependencies (all, for building)
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# 3. Production dependencies only (for migrate script)
FROM base AS deps-prod
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# 4. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Компилируем мигратор из TS в JS
RUN npx tsc src/db/migrate.ts --outDir ./dist-migrate --module commonjs --target es2020 --esModuleInterop --skipLibCheck

# Собираем Next.js с dummy переменными для компиляции
# ВАЖНО: Эти значения используются только во время сборки (build time)
# Реальные значения будут загружены из .env во время запуска (runtime)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
    AUTH_SECRET="build-time-secret-min-32-chars-long-dummy-value" \
    AUTH_GOOGLE_ID="dummy-google-id" \
    AUTH_GOOGLE_SECRET="dummy-google-secret" \
    AUTH_YANDEX_ID="dummy-yandex-id" \
    AUTH_YANDEX_SECRET="dummy-yandex-secret" \
    FAL_KEY="dummy-fal-key" \
    FASHN_API_KEY="dummy-fashn-key" \
    AUTH_TRUST_HOST="true" \
    S3_ACCESS_KEY="dummy-s3-access-key" \
    S3_SECRET_KEY="dummy-s3-secret-key" \
    S3_ASSETS_BUCKET="dummy-bucket" \
    S3_REGION="ru-central1" \
    S3_ENDPOINT="https://storage.yandexcloud.net" \
    npm run build

# 5. Runner (Production)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Создаём non-root пользователя (одной командой для меньшего размера)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Копируем приложение (Standalone) - СНАЧАЛА!
# Standalone включает минимальный node_modules для Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Копируем production-зависимости ПОВЕРХ standalone (для миграций)
# drizzle-orm/postgres-js нужен для migrate.js
COPY --from=deps-prod --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps-prod --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres

# Копируем скрипт миграций и SQL файлы
COPY --from=builder --chown=nextjs:nodejs /app/dist-migrate/migrate.js ./migrate.js
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

USER nextjs

EXPOSE 3000

# Healthcheck определён в docker-compose.prod.yml (там больше контроля)

# Запуск: миграции → сервер
# Миграции выполняются при каждом старте контейнера (idempotent operation)
CMD ["sh", "-c", "node migrate.js && node server.js"]