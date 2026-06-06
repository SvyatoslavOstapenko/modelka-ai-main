# 🚚 Миграция PostgreSQL на отдельный VPS

## Архитектура: До и После

### Текущая (монолитная):
```
┌─────────────────────────────────────┐
│        VPS 1 (Основной)             │
│                                     │
│  ┌──────────┐  ┌──────────────┐    │
│  │   App    │──│  PostgreSQL  │    │
│  │ (Next.js)│  │      17      │    │
│  └──────────┘  └──────────────┘    │
│                                     │
│  Traefik, Backup                    │
└─────────────────────────────────────┘
```

### Целевая (распределённая):
```
┌─────────────────────────┐      ┌─────────────────────────┐
│   VPS 1 (App Server)    │      │  VPS 2 (DB Server)      │
│                         │      │                         │
│  ┌──────────┐           │      │  ┌──────────────┐       │
│  │   App    │───────────┼──────┼─>│  PostgreSQL  │       │
│  │ (Next.js)│  Private  │      │  │      17      │       │
│  └──────────┘  Network  │      │  └──────────────┘       │
│                         │      │                         │
│  Traefik                │      │  Backup → S3            │
└─────────────────────────┘      └─────────────────────────┘
```

---

## 📋 Преимущества разделения

### ✅ Производительность
- Изолированные ресурсы (CPU, RAM, I/O)
- БД не конкурирует с App за ресурсы
- Можно масштабировать независимо

### ✅ Безопасность
- БД не доступна из интернета
- Только приватная сеть между серверами
- Меньше attack surface

### ✅ Отказоустойчивость
- Можно перезагрузить App без затрагивания БД
- Легче настроить репликацию БД
- Проще делать апгрейды

### ✅ Масштабируемость
- Можно добавить read-replicas
- Вертикальное масштабирование БД отдельно
- Горизонтальное масштабирование App отдельно

---

## 🔧 Подготовка к миграции

### 1. Требования к VPS 2 (DB Server)

**Минимум:**
- CPU: 2 cores
- RAM: 4GB (рекомендую 8GB)
- Disk: 50GB SSD (или больше, в зависимости от роста БД)
- Network: 100 Mbit/s+

**Операционная система:**
- Ubuntu 22.04 LTS (рекомендую) или 24.04 LTS

**Сеть:**
- Private Network между VPS 1 и VPS 2 (обязательно!)
- Firewall настроен для блокировки публичного доступа к PostgreSQL

### 2. Создание приватной сети

В Yandex Cloud:
```bash
# Создать приватную сеть
yc vpc network create --name modelka-private-net

# Создать subnet для App
yc vpc subnet create \
  --name app-subnet \
  --network-name modelka-private-net \
  --range 10.0.1.0/24

# Создать subnet для DB
yc vpc subnet create \
  --name db-subnet \
  --network-name modelka-private-net \
  --range 10.0.2.0/24

# Привязать VPS к сети
yc compute instance update vps1 --network-interface subnet-name=app-subnet
yc compute instance update vps2 --network-interface subnet-name=db-subnet
```

---

## 📦 Сценарий миграции

### Вариант 1: Zero-downtime (рекомендуется)

```
1. Настроить VPS 2
2. Поднять PostgreSQL на VPS 2
3. Настроить репликацию VPS1 → VPS2
4. Переключить App на VPS2
5. Остановить PostgreSQL на VPS1
```

### Вариант 2: С коротким downtime

```
1. Настроить VPS 2
2. Создать финальный бэкап на VPS 1
3. Остановить приложение (downtime начался)
4. Восстановить бэкап на VPS 2
5. Переключить App на VPS 2
6. Запустить приложение (downtime закончился)
```

---

## 🚀 Пошаговая инструкция (Zero-downtime)

### Шаг 1: Настройка VPS 2 (DB Server)

```bash
# На VPS 2
# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установить docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Создать директорию для проекта
mkdir -p ~/postgres-server
cd ~/postgres-server
```

Создайте `docker-compose.yml` на VPS 2:

```yaml
version: '3.8'

services:
  db:
    image: postgres:17-alpine
    container_name: postgres_primary
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      # Включить репликацию
      POSTGRES_INITDB_ARGS: "-c wal_level=replica -c max_wal_senders=3"
    command: >
      postgres
      -c shared_buffers=1GB
      -c effective_cache_size=3GB
      -c maintenance_work_mem=256MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
      -c work_mem=8MB
      -c min_wal_size=2GB
      -c max_wal_size=8GB
      -c max_connections=200
      -c listen_addresses='*'
      -c wal_level=replica
      -c max_wal_senders=5
      -c wal_keep_size=1GB
    ports:
      # Открыть только для приватной сети
      - "10.0.2.1:5432:5432"
    volumes:
      - ./pg-data:/var/lib/postgresql/data
      - "/etc/localtime:/etc/localtime:ro"
    networks:
      - db-network
    shm_size: 2g
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backup на DB сервере
  backup:
    build:
      context: .
      dockerfile: Dockerfile.backup
    container_name: db_backup
    restart: unless-stopped
    env_file: .env
    environment:
      POSTGRES_HOST: db
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
      S3_BUCKET: ${S3_BUCKET}
      S3_REGION: ${S3_REGION}
      S3_ENDPOINT: ${S3_ENDPOINT}
      S3_PREFIX: db-backups
      TZ: Europe/Moscow
    networks:
      - db-network
    depends_on:
      - db
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "2"

  # Monitoring (опционально)
  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: postgres_exporter
    restart: unless-stopped
    environment:
      DATA_SOURCE_NAME: "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?sslmode=disable"
    ports:
      - "9187:9187"
    networks:
      - db-network
    depends_on:
      - db

networks:
  db-network:
    driver: bridge
```

### Шаг 2: Настройка репликации (для zero-downtime)

На VPS 1 (старая БД):

```bash
# Создать пользователя для репликации
docker exec db psql -U modelka_user -d postgres -c "
  CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'repl_password_123';
"

# Разрешить подключение с VPS 2
docker exec db bash -c "echo 'host replication replicator 10.0.2.0/24 md5' >> /var/lib/postgresql/data/pg_hba.conf"
docker exec db psql -U modelka_user -c "SELECT pg_reload_conf();"
```

На VPS 2:

```bash
# Создать базовый бэкап с VPS 1
docker run --rm \
  -v $(pwd)/pg-data:/var/lib/postgresql/data \
  postgres:17-alpine \
  pg_basebackup -h 10.0.1.X -U replicator -D /var/lib/postgresql/data -P -R

# Запустить PostgreSQL в режиме replica
docker-compose up -d db
```

### Шаг 3: Обновление App на VPS 1

Обновите `.env` на VPS 1:

```bash
# Старое (локальное)
DATABASE_URL=postgres://modelka_user:password@localhost:5432/modelka_db

# Новое (VPS 2 через приватную сеть)
DATABASE_URL=postgres://modelka_user:password@10.0.2.X:5432/modelka_db
```

Обновите `docker-compose.prod.yml` на VPS 1:

```yaml
services:
  # Удалить или закомментировать секцию db
  # db:
  #   ...

  app:
    # ... остальное без изменений
    environment:
      DATABASE_URL: ${DATABASE_URL}
    # Убрать зависимость от локальной БД
    # depends_on:
    #   db:
    #     condition: service_healthy
```

### Шаг 4: Переключение

```bash
# На VPS 1
# Остановить приложение
docker-compose -f docker-compose.prod.yml stop app

# Повысить replica до primary на VPS 2
docker exec postgres_primary psql -U modelka_user -c "SELECT pg_promote();"

# Запустить приложение с новой БД
docker-compose -f docker-compose.prod.yml up -d app

# Проверить подключение
docker logs modelka_app
```

---

## 🔒 Настройка безопасности

### 1. Firewall на VPS 2

```bash
# Разрешить только приватную сеть
sudo ufw allow from 10.0.1.0/24 to any port 5432
sudo ufw deny 5432

# SSH только с определённых IP
sudo ufw allow from YOUR_IP to any port 22

# Включить firewall
sudo ufw enable
```

### 2. PostgreSQL pg_hba.conf

```bash
# Только приватная сеть
host    all             all             10.0.1.0/24            md5
host    replication     all             10.0.1.0/24            md5

# Запретить всё остальное
host    all             all             0.0.0.0/0              reject
```

### 3. SSL/TLS для PostgreSQL (рекомендуется)

```bash
# Сгенерировать сертификаты
openssl req -new -x509 -days 365 -nodes -text -out server.crt -keyout server.key -subj "/CN=postgres"

# Настроить PostgreSQL
docker exec postgres_primary bash -c "
  cp /path/to/server.crt /var/lib/postgresql/data/
  cp /path/to/server.key /var/lib/postgresql/data/
  chmod 600 /var/lib/postgresql/data/server.key
"

# Включить SSL
docker exec postgres_primary psql -U modelka_user -c "
  ALTER SYSTEM SET ssl = on;
  SELECT pg_reload_conf();
"
```

---

## 📊 Мониторинг распределённой системы

### Grafana + Prometheus

```yaml
# На VPS 1 или отдельном сервере
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
```

`prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'postgres'
    static_configs:
      - targets: ['10.0.2.X:9187']  # postgres-exporter на VPS 2
```

---

## 🔄 План отката (Rollback)

Если что-то пошло не так:

```bash
# 1. Остановить App на VPS 1
docker-compose -f docker-compose.prod.yml stop app

# 2. Вернуть DATABASE_URL на localhost
sed -i 's/10.0.2.X/localhost/g' .env

# 3. Запустить локальную БД
docker-compose -f docker-compose.prod.yml up -d db

# 4. Восстановить последний бэкап (если нужно)
./restore-db.sh latest

# 5. Запустить App
docker-compose -f docker-compose.prod.yml up -d app
```

---

## 📝 Чеклист миграции

### Подготовка:
- [ ] Заказать VPS 2
- [ ] Настроить приватную сеть
- [ ] Настроить firewall
- [ ] Скопировать файлы конфигурации

### Миграция:
- [ ] Создать финальный бэкап на VPS 1
- [ ] Поднять PostgreSQL на VPS 2
- [ ] Восстановить бэкап на VPS 2
- [ ] Настроить репликацию (для zero-downtime)
- [ ] Обновить .env на VPS 1
- [ ] Переключить приложение
- [ ] Проверить работоспособность

### После миграции:
- [ ] Проверить логи приложения
- [ ] Проверить логи БД
- [ ] Протестировать функциональность
- [ ] Настроить мониторинг
- [ ] Настроить алерты
- [ ] Обновить документацию

---

## 💡 Дополнительные советы

### 1. Connection Pooling

При разделении App и DB **обязательно** используйте connection pooling:

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

// Настройка connection pool
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + "?connection_limit=20&pool_timeout=10"
    }
  }
})
```

### 2. Latency мониторинг

Следите за латентностью между App и DB:

```bash
# Проверка пинга
ping -c 10 10.0.2.X

# Должно быть < 1-2ms в приватной сети
```

### 3. Резервная БД (HA setup)

Для критичных проектов настройте read-replica:

```
VPS 2 (Primary) → VPS 3 (Standby)
                ↓
              VPS 1 (App)
```

---

## 🎯 Итоговая рекомендация

**Когда разделять БД:**
- ✅ БД > 10GB
- ✅ > 1000 активных пользователей
- ✅ Высокая нагрузка на I/O
- ✅ Нужна высокая доступность

**Стоимость:**
- VPS 2 (4GB RAM, 2 CPU): ~$10-20/месяц
- Трафик в приватной сети: бесплатно
- Итого: +$10-20/месяц за значительное улучшение

**Начните с простого:**
1. Сейчас: монолитная архитектура (всё на VPS 1)
2. Фаза 1: разделить БД на VPS 2 (когда БД > 5GB)
3. Фаза 2: добавить read-replica (когда > 5000 users)
4. Фаза 3: добавить load balancer для App (когда > 10000 users)

Не усложняйте раньше времени!
