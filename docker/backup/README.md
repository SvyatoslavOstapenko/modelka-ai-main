# 🗄️ Система автоматических бэкапов PostgreSQL → Yandex S3

## 📋 Краткое резюме

✅ **PostgreSQL 17** - полная поддержка
✅ **Yandex Object Storage** - s3api совместимость
✅ **Автоматические бэкапы** - каждые 6 часов
✅ **Простота** - кастомный образ без костылей
✅ **Надёжность** - проверенные инструменты (AWS CLI, Supercronic)
✅ **Безопасность** - credentials в env, логирование, healthcheck

---

## 🚀 Быстрый старт на Ubuntu сервере

### 1. Тестирование системы бэкапов

```bash
chmod +x test-backup.sh
./test-backup.sh
```

**Что проверяет:**
- Контейнер backup запущен
- PostgreSQL доступен
- Yandex S3 доступен
- Создаёт тестовый бэкап
- Проверяет загрузку в S3

### 2. Ручной запуск бэкапа

```bash
# Вариант 1: Прямой вызов
docker exec db_backup /scripts/backup.sh

# Вариант 2: Через bash (для логов)
docker exec db_backup bash /scripts/backup.sh

# Проверка логов
docker logs db_backup
```

### 3. Восстановление из бэкапа

```bash
chmod +x restore-db.sh

# Восстановить последний бэкап
./restore-db.sh latest

# Восстановить конкретный бэкап (узнать имя из списка)
docker exec db_backup bash -c 'aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ --endpoint-url $S3_ENDPOINT'
./restore-db.sh 2025-12-07_18-00-00
```

---

## 📁 Структура файлов

### Конфигурация Docker
- `docker-compose.prod.yml` - конфигурация backup сервиса (строки 72-107)
- `Dockerfile.backup` - образ для бэкапов (PostgreSQL 17 + AWS CLI + Supercronic)
- `backup-crontab` - расписание бэкапов (каждые 6 часов)

### Скрипты
- `backup-script.sh` - основной скрипт бэкапа (pg_dump + S3 upload)
- `test-backup.sh` - тестирование системы бэкапов
- `restore-db.sh` - восстановление БД из бэкапа

### Документация
- `BACKUP_AUDIT.md` - аудит безопасности и современности
- `RESTORE_GUIDE.md` - детальное руководство по восстановлению
- `BACKUPS_README.md` - этот файл

---

## ⚙️ Техническое описание

### Архитектура

```
┌─────────────────────────────────────────────┐
│  Supercronic (cron scheduler)               │
│  Запуск каждые 6 часов: 0 */6 * * *        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  backup-script.sh                           │
│  1. pg_dump -h db → /tmp/backup.sql.gz      │
│  2. aws s3api put-object → Yandex S3        │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
┌──────────────┐    ┌────────────────┐
│ PostgreSQL   │    │  Yandex S3     │
│ (internal)   │    │  (proxy)       │
└──────────────┘    └────────────────┘
```

### Сети Docker

- **internal** - изолированная сеть для БД (без интернета)
- **proxy** - сеть с доступом к интернету (для S3)
- backup находится в обеих сетях для доступа к БД и S3

### Технологии

| Компонент | Версия | Назначение |
|-----------|--------|------------|
| postgres | 17-alpine | Базовый образ с PostgreSQL 17 |
| aws-cli | latest | Загрузка в S3-совместимые хранилища |
| supercronic | 0.2.39 | Cron-планировщик для Docker |
| bash | latest | Выполнение скриптов |
| gzip | latest | Сжатие бэкапов |

---

## 🔐 Безопасность

### ✅ Реализовано

- Credentials в environment variables
- `.env` в `.gitignore`
- Проверка обязательных переменных
- Логирование с ротацией (max-size: 5m)
- Healthcheck для мониторинга
- Остановка при ошибках (`set -e`)

### ⚠️ Рекомендации для production

1. **Включить server-side encryption** в Yandex S3
2. **Настроить lifecycle policy** для автоудаления старых бэкапов
3. **Добавить уведомления** при ошибках (webhook/email)
4. **Тестировать восстановление** раз в месяц
5. **Использовать Docker secrets** вместо env vars
6. **Security scanning** образа (Trivy, Snyk)

---

## 📊 Мониторинг

### Проверка статуса

```bash
# Healthcheck статус
docker inspect db_backup | grep -A 10 Health

# Последний статус бэкапа
docker exec db_backup cat /tmp/last_backup_status

# Логи
docker logs --tail 50 db_backup
```

### Список бэкапов в S3

```bash
# Все бэкапы
docker exec db_backup bash -c '
  aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ \
    --endpoint-url $S3_ENDPOINT \
    --recursive \
    --human-readable
'

# Размер всех бэкапов
docker exec db_backup bash -c '
  aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ \
    --endpoint-url $S3_ENDPOINT \
    --recursive \
    --human-readable \
    --summarize
'
```

---

## 🔧 Настройка

### Изменить расписание

Отредактируйте `backup-crontab`:

```cron
# Каждые 12 часов
0 */12 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1

# Каждый день в 03:00
0 3 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1

# Каждый час
0 * * * * /scripts/backup.sh >> /var/log/backup.log 2>&1
```

После изменений:
```bash
docker-compose -f docker-compose.prod.yml build backup
docker-compose -f docker-compose.prod.yml up -d backup
```

### Изменить префикс в S3

В `docker-compose.prod.yml`:
```yaml
S3_PREFIX: production-backups  # вместо db-backups
```

---

## 🚨 Troubleshooting

### Контейнер не запускается

```bash
# Проверить логи
docker logs db_backup

# Проверить сети
docker network ls
docker network inspect web_internal
docker network inspect web_proxy
```

### Бэкап не загружается в S3

```bash
# Проверить доступ к S3
docker exec db_backup bash -c '
  aws s3 ls s3://$S3_BUCKET/ --endpoint-url $S3_ENDPOINT
'

# Проверить DNS
docker exec db_backup nslookup storage.yandexcloud.net

# Проверить credentials
docker exec db_backup env | grep S3
```

### База данных недоступна

```bash
# Проверить подключение
docker exec db_backup pg_isready -h db -U modelka_user

# Проверить сеть
docker exec db_backup ping -c 2 db
```

---

## 📈 Метрики

### RPO (Recovery Point Objective)
**До 6 часов** - максимальная потеря данных при катастрофе

Для уменьшения RPO:
- Увеличить частоту бэкапов (каждый час)
- Настроить WAL archiving для point-in-time recovery

### RTO (Recovery Time Objective)
**15-30 минут** - время восстановления

Включает:
- Скачивание из S3: 1-5 мин
- Восстановление БД: 5-20 мин
- Проверка и запуск: 5 мин

---

## 📞 Поддержка

### Документация

- **Аудит безопасности**: `BACKUP_AUDIT.md`
- **Восстановление БД**: `RESTORE_GUIDE.md`
- **Этот README**: `BACKUPS_README.md`

### Полезные команды

```bash
# Создать бэкап вручную
docker exec db_backup /scripts/backup.sh

# Посмотреть бэкапы в S3
docker exec db_backup bash -c 'aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ --endpoint-url $S3_ENDPOINT'

# Восстановить последний бэкап
./restore-db.sh latest

# Проверить статус
docker exec db_backup cat /tmp/last_backup_status

# Логи в реальном времени
docker logs -f db_backup
```

---

## 🎯 Следующие шаги

1. ✅ Протестировать на сервере: `./test-backup.sh`
2. ✅ Проверить автоматические бэкапы через 6 часов
3. ⚠️ Настроить lifecycle policy в Yandex S3 для ротации
4. ⚠️ Протестировать восстановление: `./restore-db.sh latest`
5. ⚠️ Настроить мониторинг/алерты (опционально)
6. ⚠️ Документировать recovery plan для команды

---

**Создано**: 2025-12-07
**Версия PostgreSQL**: 17
**Версия образа**: web-backup:latest
**Расписание**: Каждые 6 часов (00:00, 06:00, 12:00, 18:00 MSK)
**Локация S3**: s3://modelka-storage/db-backups/
