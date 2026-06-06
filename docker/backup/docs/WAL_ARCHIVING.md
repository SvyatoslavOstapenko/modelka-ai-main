# 📦 WAL Archiving для Point-in-Time Recovery (PITR)

## Что такое WAL Archiving?

**WAL (Write-Ahead Log)** - это журнал транзакций PostgreSQL, который записывается **перед** изменением данных. WAL archiving позволяет:

- ✅ Восстановить БД на **любую** секунду между бэкапами
- ✅ Минимизировать потерю данных (RPO почти = 0)
- ✅ Защита от сбоев дисков
- ✅ Репликация для отказоустойчивости

### Пример использования:

```
05:00 - Полный бэкап
05:00-11:59 - WAL архивы каждые N секунд
12:00 - Сбой БД
```

С WAL archiving можно восстановить БД на **11:58:45** (любую секунду!)
Без него - только на **05:00** (последний полный бэкап)

---

## 🚀 Настройка WAL Archiving для Yandex S3

### Вариант 1: Простой (с pg_receivewal)

Обновим `docker-compose.prod.yml`:

```yaml
# === DATABASE с WAL archiving ===
db:
  image: postgres:17-alpine
  container_name: db
  restart: unless-stopped
  environment:
    POSTGRES_USER: ${POSTGRES_USER}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_DB: ${POSTGRES_DB}
  command: >
    postgres
    -c wal_level=replica
    -c archive_mode=on
    -c archive_command='test ! -f /wal_archive/%f && cp %p /wal_archive/%f'
    -c archive_timeout=300
    -c max_wal_senders=3
  volumes:
    - ./pg-data:/var/lib/postgresql/data
    - ./wal-archive:/wal_archive  # WAL архив локально
    - "/etc/localtime:/etc/localtime:ro"
  # ... остальное без изменений

# === WAL S3 Uploader (отдельный контейнер) ===
wal-uploader:
  build:
    context: .
    dockerfile: Dockerfile.wal-uploader
  container_name: wal_uploader
  restart: unless-stopped
  env_file: .env
  environment:
    S3_ACCESS_KEY: ${S3_ACCESS_KEY}
    S3_SECRET_KEY: ${S3_SECRET_KEY}
    S3_BUCKET: ${S3_BUCKET}
    S3_REGION: ${S3_REGION}
    S3_ENDPOINT: ${S3_ENDPOINT}
    S3_PREFIX: wal-archives
    TZ: Europe/Moscow
  volumes:
    - ./wal-archive:/wal_archive:ro
  networks:
    - proxy
  depends_on:
    - db
  logging:
    driver: "json-file"
    options:
      max-size: "5m"
      max-file: "2"
```

### Создайте `Dockerfile.wal-uploader`:

```dockerfile
FROM alpine:latest

# Установка AWS CLI и inotify для мониторинга файлов
RUN apk add --no-cache \
    aws-cli \
    inotify-tools \
    bash

WORKDIR /scripts

# Скрипт для загрузки WAL в S3
COPY wal-upload.sh /scripts/upload.sh
RUN chmod +x /scripts/upload.sh

CMD ["/scripts/upload.sh"]
```

### Создайте `wal-upload.sh`:

```bash
#!/bin/bash
set -e

echo "WAL S3 Uploader started..."
echo "Monitoring: /wal_archive/"
echo "Uploading to: s3://${S3_BUCKET}/${S3_PREFIX}/"
echo ""

# Настройка AWS CLI
export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}"
export AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}"
export AWS_DEFAULT_REGION="${S3_REGION:-ru-central1}"

# Функция загрузки WAL файла в S3
upload_wal() {
    local file=$1
    local filename=$(basename "$file")

    # Пропускать .ready файлы
    if [[ "$filename" == *.ready ]]; then
        return
    fi

    echo "[$(date)] Uploading WAL: $filename"

    aws s3api put-object \
        --bucket "${S3_BUCKET}" \
        --key "${S3_PREFIX}/${filename}" \
        --body "$file" \
        --endpoint-url "${S3_ENDPOINT}" \
        --quiet

    if [ $? -eq 0 ]; then
        echo "[$(date)] ✓ Uploaded: $filename"
    else
        echo "[$(date)] ✗ Failed: $filename" >&2
    fi
}

# Загрузить существующие WAL файлы при старте
echo "Uploading existing WAL files..."
for file in /wal_archive/*; do
    if [ -f "$file" ] && [[ ! "$file" == *.ready ]]; then
        upload_wal "$file"
    fi
done
echo ""

# Мониторинг новых WAL файлов
echo "Watching for new WAL files..."
inotifywait -m -e close_write,moved_to /wal_archive/ | while read path action file; do
    if [[ "$file" != *.ready ]]; then
        upload_wal "${path}${file}"
    fi
done
```

---

### Вариант 2: Продвинутый (с pgBackRest)

**pgBackRest** - профессиональный инструмент для бэкапов PostgreSQL с WAL archiving.

```yaml
# === DATABASE ===
db:
  image: postgres:17-alpine
  # ... ваши настройки
  command: >
    postgres
    -c wal_level=replica
    -c archive_mode=on
    -c archive_command='pgbackrest --stanza=main archive-push %p'
    -c archive_timeout=60
  volumes:
    - ./pg-data:/var/lib/postgresql/data
    - ./pgbackrest:/etc/pgbackrest

# === pgBackRest ===
pgbackrest:
  image: pgbackrest/pgbackrest:latest
  container_name: pgbackrest
  restart: unless-stopped
  env_file: .env
  volumes:
    - ./pg-data:/var/lib/postgresql/data:ro
    - ./pgbackrest:/etc/pgbackrest
    - ./pgbackrest-repo:/var/lib/pgbackrest
  networks:
    - internal
    - proxy
  command: server
```

Конфигурация `pgbackrest.conf`:

```ini
[global]
repo1-type=s3
repo1-s3-endpoint=storage.yandexcloud.net
repo1-s3-bucket=modelka-storage
repo1-s3-region=ru-central1
repo1-s3-key=${S3_ACCESS_KEY}
repo1-s3-key-secret=${S3_SECRET_KEY}
repo1-path=/pgbackrest
repo1-retention-full=4
repo1-retention-diff=4

[main]
pg1-path=/var/lib/postgresql/data
pg1-port=5432
pg1-socket-path=/var/run/postgresql
```

---

## 🔧 Увеличение частоты обычных бэкапов

### Изменить на 1 час

Отредактируйте `backup-crontab`:

```cron
# Каждый час
0 * * * * /scripts/backup.sh >> /var/log/backup.log 2>&1
```

Пересобрать:
```bash
docker-compose -f docker-compose.prod.yml build backup
docker-compose -f docker-compose.prod.yml up -d backup
```

### Изменить на 30 минут

```cron
# Каждые 30 минут
*/30 * * * * /scripts/backup.sh >> /var/log/backup.log 2>&1
```

---

## 📊 Сравнение подходов

| Параметр | Обычные бэкапы (6ч) | Бэкапы (1ч) | WAL Archiving |
|----------|---------------------|-------------|---------------|
| RPO | До 6 часов | До 1 часа | Секунды |
| Размер | ~5-10 MB/бэкап | ~5-10 MB/бэкап | ~100-500 MB/день WAL |
| Сложность | Простая | Простая | Средняя |
| Стоимость S3 | Низкая | Средняя | Высокая |
| Восстановление | На момент бэкапа | На момент бэкапа | На любую секунду |

---

## 🎯 Рекомендации

### Для небольших проектов:
✅ Бэкапы каждый час (простота + достаточно для большинства)

### Для критичных данных:
✅ WAL Archiving (максимальная защита данных)

### Оптимальный вариант:
✅ Комбинация: полные бэкапы каждые 6ч + WAL archiving

---

## 🔄 Восстановление с PITR

### С WAL archives:

```bash
# 1. Скачать базовый бэкап
docker exec db_backup bash -c '
  aws s3 cp s3://$S3_BUCKET/db-backups/backup-2025-12-07_06-00-00.sql.gz \
    /tmp/base_backup.sql.gz \
    --endpoint-url $S3_ENDPOINT
'

# 2. Скачать WAL archives
mkdir -p ./wal-restore
docker run --rm \
  -v $(pwd)/wal-restore:/wal \
  -e AWS_ACCESS_KEY_ID=${S3_ACCESS_KEY} \
  -e AWS_SECRET_ACCESS_KEY=${S3_SECRET_KEY} \
  amazon/aws-cli \
  s3 sync \
    s3://modelka-storage/wal-archives/ \
    /wal/ \
    --endpoint-url https://storage.yandexcloud.net

# 3. Создать recovery.conf
cat > recovery.conf <<EOF
restore_command = 'cp /wal_archive/%f %p'
recovery_target_time = '2025-12-07 11:30:00'
EOF

# 4. Восстановить базовый бэкап
gunzip -c /tmp/base_backup.sql.gz | \
  docker exec -i db psql -U modelka_user -d modelka_db

# 5. Запустить recovery
docker cp recovery.conf db:/var/lib/postgresql/data/
docker cp ./wal-restore db:/wal_archive/
docker restart db
```

---

## 💰 Стоимость и оптимизация

### Yandex Object Storage цены (2025):

- Хранение: ~0.60₽/GB/месяц
- Операции: ~0.40₽/10000 запросов

### Расчёт для WAL archiving:

```
БД 10GB, WAL ~500MB/день

Обычные бэкапы (6ч):
  4 бэкапа/день × 10MB = 40MB/день = 1.2GB/месяц
  Стоимость: ~0.72₽/месяц

WAL archiving:
  500MB/день × 30 дней = 15GB/месяц
  Стоимость: ~9₽/месяц

Комбинация:
  1.2GB + 15GB = 16.2GB
  Стоимость: ~9.72₽/месяц
```

### Оптимизация:

1. **WAL compression** - уменьшает размер на 70-90%
2. **Lifecycle policy** - автоудаление старых WAL через 7 дней
3. **Differential backups** - вместо полных бэкапов

---

## 📝 Итоговая рекомендация

Для вашего проекта рекомендую:

### Фаза 1 (сейчас):
✅ Полные бэкапы каждые 6 часов (уже настроено)
✅ Хранение 30 дней в S3

### Фаза 2 (при росте):
✅ Увеличить частоту до 1 часа
✅ RPO: 1 час (приемлемо для большинства)

### Фаза 3 (для критичных данных):
✅ Добавить WAL archiving
✅ RPO: <1 минута
✅ Point-in-time recovery

Начните с простого, усложняйте по необходимости!
