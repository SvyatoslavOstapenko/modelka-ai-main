This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🚨 Important: Production Build Safety

**Before pushing to main**, always verify your build works:

```bash
npm run build:verify-full    # Recommended before every push
npm run hooks:install         # One-time setup for automatic checks
```

📖 **Quick guides:**
- [QUICK_START.md](QUICK_START.md) - Commands cheatsheet
- [docs/PRODUCTION_BUILD_GUIDE.md](docs/PRODUCTION_BUILD_GUIDE.md) - Full guide on build process
- [../CLAUDE.md](../CLAUDE.md) - Complete project documentation

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Local Development Environment

### Prerequisites
- Docker Desktop installed and running
- Node.js 22+

### Environment Setup

1. **Create `.env.local`** in the project root with:
   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/modelka_local
   ```

2. **Start the local database**:
   ```bash
   npm run dev:db
   ```

3. **Push schema to local database**:
   ```bash
   npm run db:push
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:db` | Start local PostgreSQL in Docker (background) |
| `npm run dev:db:stop` | Stop local PostgreSQL |
| `npm run dev` | Start Next.js development server |
| `npm run db:push` | Push Drizzle schema to database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run build:verify` | Verify production Docker build locally |

### Database Configuration

| Environment | Configuration |
|-------------|---------------|
| Local Dev | Uses `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` from `.env.local` via `localhost:5432` |
| Production | Uses same credentials but via internal Docker networking |

### Build Verification

Before pushing changes, verify the production build works:
```bash
npm run build:verify
```
This builds the Docker image locally and automatically cleans up afterward.

## Production Deployment (VPS/Server)

### Quick Start (5 минут)

На сервере (Ubuntu/Debian):

```bash
# 1. Клонируйте репозиторий
git clone <your-repo-url>
cd web

# 2. Настройте .env файл
cp .env.example .env
nano .env  # Настройте все переменные

# 3. Запустите одной командой
chmod +x deploy-to-server.sh
./deploy-to-server.sh
```

Готово! Сайт доступен по адресу вашего сервера.

### Что включено в production сборку?

- ✅ **PostgreSQL 17** - база данных
- ✅ **Next.js приложение** - ваш сайт
- ✅ **Traefik** - reverse proxy с SSL
- ✅ **Автоматические бэкапы** - каждые 6 часов в Yandex S3
- ✅ **Мониторинг** - проверка здоровья системы
- ✅ **Логирование** - с ротацией

### Документация

| Документ | Описание |
|----------|----------|
| [docs/EMERGENCY_GUIDE.md](docs/EMERGENCY_GUIDE.md) | 🚨 Экстренное руководство (начните здесь!) |
| [docs/MONITORING.md](docker/backup/docs/MONITORING.md) | 📊 Мониторинг и алёртинг |
| [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md) | 🗺️ Карта проекта |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | 🔧 Решение проблем |
| [docs/TECHNICAL_REPORT.md](docs/TECHNICAL_REPORT.md) | 🏗️ Технический отчет |

### Быстрые команды

```bash
# Проверка здоровья системы
cd docker/backup/tools && ./check-health.sh

# Создать бэкап вручную
docker exec db_backup bash /scripts/backup.sh

# Восстановить из бэкапа
cd docker/backup/tools && ./restore-db.sh latest

# Перезапустить всё
docker-compose -f docker-compose.prod.yml restart

# Логи
docker logs modelka_app --tail 100
docker logs db --tail 100
docker logs db_backup --tail 100
```

### Мониторинг

После развёртывания настройте:

1. **Telegram алёрты** - получайте уведомления о проблемах
   ```bash
   nano docker/backup/tools/telegram-alert.sh
   ```

2. **Cron задачи** - автоматическая проверка каждый час
   ```bash
   crontab -e
   # Добавьте строки из docker/backup/tools/setup-monitoring.sh
   ```

3. **UptimeRobot** - внешний мониторинг доступности (бесплатно)

Полная инструкция: [docker/backup/docs/MONITORING.md](docker/backup/docs/MONITORING.md)

### Стратегия бэкапов

- **Бэкапы БД**: каждые 6 часов → Yandex S3 (хранение 90 дней)
- **Snapshots сервера**: каждый день → Yandex Cloud (хранение 7 дней)

**Когда использовать:**
- 📦 **Восстановление БД** - если проблема только с данными (15-30 мин)
- 💿 **Snapshot сервера** - если проблема с сервером/ОС (1-2 часа)

Подробнее: [EMERGENCY_GUIDE.md](EMERGENCY_GUIDE.md)

---

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
