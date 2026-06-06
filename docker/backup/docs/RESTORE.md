# 🔄 Руководство по восстановлению PostgreSQL из бэкапа

## Сценарии восстановления

### 1. Полная потеря данных (disaster recovery)
### 2. Откат к определённой точке времени
### 3. Миграция на новый сервер
### 4. Восстановление отдельных таблиц

---

## 🚨 Сценарий 1: Полная потеря данных

### Шаг 1: Список доступных бэкапов

```bash
# Посмотреть все бэкапы в S3
docker exec db_backup bash -c '
  aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ \
    --endpoint-url $S3_ENDPOINT \
    --recursive \
    --human-readable
'
```

Вывод будет примерно таким:
```
2025-12-07 12:13:16    4.0 KiB db-backups/backup-2025-12-07_12-13-16.sql.gz
2025-12-07 18:00:00    5.2 KiB db-backups/backup-2025-12-07_18-00-00.sql.gz
```

### Шаг 2: Скачать нужный бэкап

```bash
# Определить имя файла для восстановления
BACKUP_FILE="backup-2025-12-07_18-00-00.sql.gz"

# Скачать из S3
docker exec db_backup bash -c "
  aws s3 cp \
    s3://\$S3_BUCKET/\$S3_PREFIX/${BACKUP_FILE} \
    /tmp/${BACKUP_FILE} \
    --endpoint-url \$S3_ENDPOINT
"
```

### Шаг 3: Остановить приложение

```bash
docker-compose -f docker-compose.prod.yml stop app
```

### Шаг 4: Восстановить базу данных

```bash
# Вариант A: Полная замена БД (ОПАСНО - удалит все данные!)
docker exec db_backup bash -c "
  gunzip -c /tmp/${BACKUP_FILE} | \
  PGPASSWORD=\$POSTGRES_PASSWORD psql \
    -h \$POSTGRES_HOST \
    -U \$POSTGRES_USER \
    -d \$POSTGRES_DB
"

# Вариант B: В новую БД (безопаснее для проверки)
# Сначала создать новую БД для теста
docker exec db psql -U modelka_user -d postgres -c "CREATE DATABASE modelka_db_restore;"

# Восстановить в неё
docker exec db_backup bash -c "
  gunzip -c /tmp/${BACKUP_FILE} | \
  PGPASSWORD=\$POSTGRES_PASSWORD psql \
    -h \$POSTGRES_HOST \
    -U \$POSTGRES_USER \
    -d modelka_db_restore
"
```

### Шаг 5: Проверка данных

```bash
# Проверить таблицы
docker exec db psql -U modelka_user -d modelka_db -c "\dt"

# Проверить количество записей в важных таблицах
docker exec db psql -U modelka_user -d modelka_db -c "
  SELECT
    'users' as table_name, COUNT(*) as count FROM users
  UNION ALL
  SELECT 'posts', COUNT(*) FROM posts;
"
```

### Шаг 6: Запустить приложение

```bash
docker-compose -f docker-compose.prod.yml start app
```

### Шаг 7: Проверить работоспособность

```bash
# Проверить логи приложения
docker logs -f modelka_app

# Проверить healthcheck
docker ps | grep modelka_app
```

---

## 🕐 Сценарий 2: Откат к определённой точке времени

Используйте тот же процесс, но выберите бэкап с нужной датой:

```bash
# Найти бэкап за конкретную дату
docker exec db_backup bash -c '
  aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ \
    --endpoint-url $S3_ENDPOINT \
    --recursive | grep "2025-12-01"
'
```

---

## 🚀 Сценарий 3: Миграция на новый сервер

### На новом сервере:

```bash
# 1. Клонировать репозиторий
git clone <your-repo>
cd web

# 2. Настроить .env (скопировать со старого сервера)
cp .env.example .env
# Заполнить credentials

# 3. Запустить только БД
docker-compose -f docker-compose.prod.yml up -d db

# 4. Скачать последний бэкап из S3 локально
mkdir -p ./temp-backups

docker run --rm \
  -v $(pwd)/temp-backups:/backups \
  -e AWS_ACCESS_KEY_ID=${S3_ACCESS_KEY} \
  -e AWS_SECRET_ACCESS_KEY=${S3_SECRET_KEY} \
  amazon/aws-cli \
  s3 cp \
    s3://modelka-storage/db-backups/ \
    /backups/ \
    --endpoint-url https://storage.yandexcloud.net \
    --recursive

# 5. Восстановить последний бэкап
LATEST_BACKUP=$(ls -t ./temp-backups/*.sql.gz | head -1)

gunzip -c "$LATEST_BACKUP" | \
  docker exec -i db psql -U modelka_user -d modelka_db

# 6. Удалить временные файлы
rm -rf ./temp-backups

# 7. Запустить все сервисы
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📋 Сценарий 4: Восстановление отдельных таблиц

### Если нужно восстановить только определённые таблицы:

```bash
# 1. Скачать бэкап
BACKUP_FILE="backup-2025-12-07_18-00-00.sql.gz"

docker exec db_backup bash -c "
  aws s3 cp \
    s3://\$S3_BUCKET/\$S3_PREFIX/${BACKUP_FILE} \
    /tmp/${BACKUP_FILE} \
    --endpoint-url \$S3_ENDPOINT
"

# 2. Извлечь SQL для конкретной таблицы
docker exec db_backup bash -c "
  gunzip -c /tmp/${BACKUP_FILE} | \
  grep -A 1000 'CREATE TABLE users' | \
  grep -B 1000 'CREATE TABLE posts' > /tmp/users_only.sql
"

# 3. Восстановить только эту таблицу
docker exec db psql -U modelka_user -d modelka_db -f /tmp/users_only.sql
```

**Внимание**: Этот метод работает только для простых случаев. Для сложных схем лучше использовать pg_restore с --table.

---

## ⚡ Быстрое восстановление (скрипт)

Создайте файл `restore.sh`:

```bash
#!/bin/bash
set -e

echo "=== PostgreSQL Restore Script ==="
echo ""

# Параметры
BACKUP_DATE=${1:-"latest"}

if [ "$BACKUP_DATE" == "latest" ]; then
  echo "Searching for latest backup..."
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

echo "Using backup: $BACKUP_FILE"
echo ""

# Подтверждение
read -p "This will REPLACE the database. Are you sure? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

# Скачивание
echo "Downloading backup from S3..."
docker exec db_backup bash -c "
  aws s3 cp \
    s3://\$S3_BUCKET/${BACKUP_FILE} \
    /tmp/restore.sql.gz \
    --endpoint-url \$S3_ENDPOINT
"

# Остановка приложения
echo "Stopping application..."
docker-compose -f docker-compose.prod.yml stop app

# Восстановление
echo "Restoring database..."
docker exec db_backup bash -c "
  gunzip -c /tmp/restore.sql.gz | \
  PGPASSWORD=\$POSTGRES_PASSWORD psql \
    -h \$POSTGRES_HOST \
    -U \$POSTGRES_USER \
    -d \$POSTGRES_DB
"

# Очистка
docker exec db_backup rm -f /tmp/restore.sql.gz

# Запуск приложения
echo "Starting application..."
docker-compose -f docker-compose.prod.yml start app

echo ""
echo "✓ Database restored successfully!"
echo "✓ Application restarted"
```

Использование:
```bash
chmod +x restore.sh

# Восстановить последний бэкап
./restore.sh

# Восстановить конкретный бэкап
./restore.sh 2025-12-07_18-00-00
```

---

## 🧪 Тестирование восстановления (рекомендуется делать раз в месяц)

```bash
#!/bin/bash
# test-restore.sh

echo "Testing database restore..."

# Создать тестовую БД
docker exec db createdb -U modelka_user test_restore

# Скачать последний бэкап
LATEST=$(docker exec db_backup bash -c '
  aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ \
    --endpoint-url $S3_ENDPOINT \
    --recursive | \
  sort -r | head -1 | awk "{print \$4}"
')

docker exec db_backup bash -c "
  aws s3 cp s3://\$S3_BUCKET/${LATEST} /tmp/test.sql.gz \
    --endpoint-url \$S3_ENDPOINT
"

# Восстановить в тестовую БД
docker exec db_backup bash -c "
  gunzip -c /tmp/test.sql.gz | \
  PGPASSWORD=\$POSTGRES_PASSWORD psql \
    -h \$POSTGRES_HOST \
    -U \$POSTGRES_USER \
    -d test_restore
"

# Проверить
TABLES=$(docker exec db psql -U modelka_user -d test_restore -t -c "
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = 'public'
")

echo "Restored $TABLES tables"

# Удалить тестовую БД
docker exec db dropdb -U modelka_user test_restore

# Очистка
docker exec db_backup rm -f /tmp/test.sql.gz

echo "✓ Restore test completed successfully!"
```

---

## 🚨 Troubleshooting

### Ошибка: "database is being accessed by other users"

```bash
# Отключить все соединения
docker exec db psql -U modelka_user -d postgres -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'modelka_db' AND pid <> pg_backend_pid();
"
```

### Ошибка: "out of memory"

Бэкап слишком большой для восстановления в памяти:
```bash
# Увеличить shm_size в docker-compose
# db:
#   shm_size: 2g  # Было 1g
```

### Бэкап не скачивается из S3

```bash
# Проверить credentials
docker exec db_backup env | grep S3

# Проверить доступ к S3
docker exec db_backup bash -c '
  aws s3 ls s3://$S3_BUCKET/ --endpoint-url $S3_ENDPOINT
'
```

---

## 📝 Чеклист восстановления

- [ ] Выбрать нужный бэкап из S3
- [ ] Создать копию текущей БД (если есть данные)
- [ ] Остановить приложение
- [ ] Скачать бэкап из S3
- [ ] Восстановить БД
- [ ] Проверить данные
- [ ] Запустить приложение
- [ ] Проверить работоспособность
- [ ] Удалить временные файлы
- [ ] Задокументировать инцидент

---

## ⏱️ RTO/RPO

**RPO (Recovery Point Objective)**: До 6 часов
- Бэкапы делаются каждые 6 часов
- В худшем случае потеря данных за последние 6 часов

**RTO (Recovery Time Objective)**: 15-30 минут
- Зависит от размера бэкапа
- Включает скачивание из S3 + восстановление + проверку

Для критичных данных рекомендуется:
- Увеличить частоту бэкапов (каждый час)
- Настроить WAL archiving для point-in-time recovery
