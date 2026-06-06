# Аудит системы бэкапов PostgreSQL → Yandex S3

## ✅ Безопасность

### Хорошо реализовано:
- ✅ **Credentials в environment variables**, не в коде
- ✅ **`.env` в `.gitignore`** - secrets не попадут в Git
- ✅ **`set -e`** в скрипте - останов при ошибках
- ✅ **Проверка обязательных переменных** - fail-fast
- ✅ **PGPASSWORD через env**, не аргументы командной строки
- ✅ **Healthcheck** - мониторинг состояния
- ✅ **Логирование ограничено** (max-size: 5m) - защита диска

### ⚠️ Потенциальные проблемы безопасности:

1. **Контейнер backup в двух сетях** (`internal` + `proxy`)
   - Имеет доступ и к БД и к интернету
   - Риск: если контейнер скомпрометирован, злоумышленник получит доступ к БД
   - **Решение**: Это необходимо для работы, но нужно минимизировать attack surface
   - **Рекомендация**: Регулярно обновлять образ, использовать security scanning

2. **Нет шифрования бэкапов**
   - Бэкапы в S3 не зашифрованы на клиенте
   - Риск: если S3 credentials утекут, бэкапы читаемы
   - **Решение**: Включить server-side encryption в Yandex S3 или добавить GPG шифрование

3. **Credentials в environment variables**
   - Видны через `docker inspect`
   - **Рекомендация**: Использовать Docker secrets в production

## ✅ Современность

- ✅ **PostgreSQL 17** - последняя версия (2024)
- ✅ **Alpine Linux** - современный, легковесный, безопасный
- ✅ **AWS CLI** - стандарт индустрии для S3
- ✅ **Supercronic** - современная cron-альтернатива для Docker
- ✅ **Docker healthchecks** - best practice

## ⚠️ Что можно улучшить

### 1. Нет ротации старых бэкапов
**Проблема**: Бэкапы накапливаются в S3 вечно → растут расходы

**Решение**: Добавить lifecycle policy в Yandex S3 или скрипт удаления старых бэкапов

### 2. Нет уведомлений об ошибках
**Проблема**: Если бэкап упал, никто не узнает

**Решение**: Добавить webhook/email уведомления

### 3. Нет проверки целостности
**Проблема**: Не проверяется, что бэкап можно восстановить

**Решение**: Периодически тестировать восстановление

### 4. Healthcheck только проверяет наличие файла
**Проблема**: Не проверяет содержимое (success/failed)

**Можно улучшить**:
```dockerfile
HEALTHCHECK --interval=5m --timeout=10s \
  CMD grep -q "success" /tmp/last_backup_status 2>/dev/null || exit 1
```

## ✅ Ubuntu vs Windows

На Ubuntu сервере всё будет работать **лучше**:
- ✅ Нет проблем с line endings (sed фиксит, но на Linux это и не нужно)
- ✅ Нет проблем с путями Git Bash
- ✅ Docker работает нативно (быстрее)
- ✅ Нет конвертации путей MSYS

**На сервере можно упростить Dockerfile** (убрать `sed -i 's/\r$//'`), но оставьте как есть для совместимости.

## ✅ Соответствие требованиям

| Требование | Статус | Примечание |
|------------|--------|------------|
| PostgreSQL 17 | ✅ | Поддерживается |
| Yandex S3 | ✅ | Работает через s3api |
| Автоматические бэкапы | ✅ | Каждые 6 часов |
| Простота (без костылей) | ✅ | Кастомный образ, но простой |
| Надёжность | ✅ | Проверенные инструменты |
| Безопасность | ⚠️ | Хорошо, но можно улучшить |

## 🔧 Команды для сервера Ubuntu

### Тестирование бэкапа:
```bash
# Вариант 1: Через bash (рекомендуется для логов)
docker exec db_backup bash /scripts/backup.sh

# Вариант 2: Прямой вызов (короче)
docker exec db_backup /scripts/backup.sh

# Проверка логов
docker logs db_backup

# Проверка последнего статуса
docker exec db_backup cat /tmp/last_backup_status
```

### Проверка расписания:
```bash
docker logs db_backup | grep crontab
```

### Список бэкапов в S3:
```bash
docker exec db_backup bash -c 'aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ --endpoint-url $S3_ENDPOINT'
```

## 📊 Мониторинг

### Проверка healthcheck:
```bash
docker inspect db_backup | grep -A 10 Health
```

### Размер бэкапов в S3:
```bash
docker exec db_backup bash -c 'aws s3 ls s3://$S3_BUCKET/$S3_PREFIX/ --endpoint-url $S3_ENDPOINT --recursive --human-readable --summarize'
```

## 🎯 Рекомендации для production

1. **Включить server-side encryption в Yandex S3**
2. **Настроить lifecycle policy для автоудаления старых бэкапов**
3. **Добавить уведомления при ошибках** (webhook/email)
4. **Периодически тестировать восстановление** (раз в месяц)
5. **Использовать Docker secrets вместо env vars** (для большей безопасности)
6. **Настроить monitoring/alerting** (Prometheus + Grafana)
7. **Документировать recovery plan**
