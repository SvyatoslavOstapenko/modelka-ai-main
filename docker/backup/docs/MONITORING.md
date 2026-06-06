# 📊 Мониторинг и Алёртинг для Production

## 🎯 Цель
Понять когда что-то пошло не так и получить уведомление **до того**, как это заметят пользователи.

---

## 🚨 Что может пойти не так?

### Сценарии катастроф

| Проблема | Признаки | Решение |
|----------|----------|---------|
| 💥 **БД упала** | Приложение не может подключиться | Перезапуск контейнера |
| 🔥 **БД повреждена** | Ошибки при запросах, corrupt data | Восстановление из бэкапа |
| 💾 **Диск заполнен** | Docker не может писать логи/данные | Очистка диска, увеличение volume |
| 🔌 **Бэкапы не создаются** | Нет новых файлов в S3 | Проверка логов backup контейнера |
| 🌐 **Нет доступа к S3** | Бэкапы не загружаются | Проверка сети, credentials |
| ⚡ **Сервер перегружен** | Медленные запросы, таймауты | Увеличение ресурсов |

---

## 📡 Уровни мониторинга

### Уровень 1: Базовый (бесплатно)
- ✅ Docker healthchecks
- ✅ Логи контейнеров
- ✅ Скрипты проверки

### Уровень 2: Продвинутый (рекомендуется)
- ✅ Telegram бот с алертами
- ✅ Простой мониторинг (uptime checks)
- ✅ Мониторинг дискового пространства

### Уровень 3: Enterprise
- Prometheus + Grafana
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Платные сервисы (Datadog, New Relic)

---

## 🛠️ Уровень 1: Базовый мониторинг (делаем сейчас)

### 1. Скрипт проверки здоровья системы

Создайте файл `check-health.sh`:

```bash
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
```

**Использование:**
```bash
chmod +x check-health.sh
./check-health.sh
```

**Автоматическая проверка каждый час:**
```bash
# Добавить в crontab сервера
crontab -e

# Добавить строку:
0 * * * * cd /path/to/web && ./check-health.sh >> /var/log/health-check.log 2>&1
```

---

## 🔔 Уровень 2: Telegram Алёрты (настраиваем сейчас)

### Шаг 1: Создание Telegram бота

1. Найдите [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Получите **TOKEN** (например: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Шаг 2: Получение Chat ID

1. Найдите вашего бота в Telegram
2. Отправьте ему `/start`
3. Откройте: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Найдите `"chat":{"id":123456789}` - это ваш **CHAT_ID**

### Шаг 3: Скрипт алёртов

Создайте `telegram-alert.sh`:

```bash
#!/bin/bash
# Отправка уведомлений в Telegram

TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN"
TELEGRAM_CHAT_ID="YOUR_CHAT_ID"

send_alert() {
  local MESSAGE="$1"
  local EMOJI="${2:-⚠️}"

  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="${TELEGRAM_CHAT_ID}" \
    -d text="${EMOJI} ${MESSAGE}" \
    -d parse_mode="HTML" > /dev/null
}

# Запуск проверки
if ! ./check-health.sh > /tmp/health-check-output.txt 2>&1; then
  # Если проверка провалилась - отправляем алерт
  OUTPUT=$(cat /tmp/health-check-output.txt)
  send_alert "🚨 <b>ПРОБЛЕМА НА СЕРВЕРЕ!</b>

$OUTPUT

Сервер: $(hostname)
Время: $(date '+%Y-%m-%d %H:%M:%S')" "🚨"
fi
```

**Настройка:**
```bash
# Заменить токены
nano telegram-alert.sh

# Сделать исполняемым
chmod +x telegram-alert.sh

# Добавить в crontab (каждые 30 минут)
crontab -e
*/30 * * * * cd /path/to/web && ./telegram-alert.sh
```

### Шаг 4: Алерт при успешном бэкапе

Модифицируем `backup.sh` чтобы отправлять уведомления:

```bash
# В конце backup.sh добавить:

# Отправка уведомления
if [ -f "/telegram-alert.sh" ]; then
  /telegram-alert.sh "✅ Бэкап создан успешно!

📦 Файл: ${BACKUP_FILE}
📊 Размер: ${BACKUP_SIZE}
🕐 Время: $(date '+%Y-%m-%d %H:%M:%S')" "✅"
fi
```

---

## 📈 Простой мониторинг доступности

### Использование UptimeRobot (бесплатно)

1. Зарегистрируйтесь на [uptimerobot.com](https://uptimerobot.com)
2. Создайте мониторинг для вашего домена:
   - **Type**: HTTPS
   - **URL**: `https://modelka-ai.ru`
   - **Interval**: 5 минут
3. Настройте уведомления (Email/Telegram/SMS)

### Или простой скрипт проверки доступности

```bash
#!/bin/bash
# ping-check.sh

URL="https://modelka-ai.ru"

if ! curl -sf "$URL" > /dev/null; then
  ./telegram-alert.sh "🔴 Сайт недоступен!

URL: $URL
Время: $(date '+%Y-%m-%d %H:%M:%S')

Проверьте контейнеры!" "🔴"
fi
```

---

## 🆚 Когда восстанавливать БД vs Когда восстанавливать Snapshot сервера?

### 📦 Восстановление БД из бэкапа

**Когда использовать:**
- ✅ Проблема **только с данными** БД (corrupt data, случайное удаление)
- ✅ Приложение работает, но данные неправильные
- ✅ Хотите откатиться к конкретной точке времени (6 часов назад)
- ✅ Быстрое восстановление (15-30 минут)

**Команда:**
```bash
cd /path/to/web/docker/backup/tools
./restore-db.sh latest
```

**Преимущества:**
- Быстрее (скачивается только БД, не весь сервер)
- Точечное восстановление (только данные)
- Можно восстановить на другой сервер

**Недостатки:**
- Восстанавливает только БД, не файлы приложения

---

### 💿 Восстановление Snapshot сервера (Яндекс)

**Когда использовать:**
- ✅ **Катастрофа на уровне сервера** (взлом, сбой ОС, повреждение диска)
- ✅ Потеряны файлы приложения, конфиги
- ✅ Docker не запускается
- ✅ Хотите откатить **ВСЁ** к вчерашнему состоянию

**Команда (в Yandex Cloud):**
1. Остановите VM
2. Создайте новый диск из snapshot
3. Подключите к VM
4. Запустите VM

**Преимущества:**
- Восстанавливает **весь сервер** (ОС, файлы, БД, конфиги)
- Полная копия на момент snapshot

**Недостатки:**
- Медленнее (весь диск)
- Теряете изменения с момента последнего snapshot

---

### 🤔 Как выбрать?

| Ситуация | Решение |
|----------|---------|
| Случайно удалили данные из БД | 📦 Восстановление БД |
| База повреждена (corrupt) | 📦 Восстановление БД |
| Хотите откатить к конкретному времени | 📦 Восстановление БД |
| Сервер взломан | 💿 Snapshot сервера |
| ОС не загружается | 💿 Snapshot сервера |
| Потеряны файлы приложения | 💿 Snapshot сервера |
| Docker не работает | 💿 Snapshot сервера |

---

## 🎯 Стратегия бэкапов (3-2-1 Rule)

### Рекомендуемая настройка:

1. **3 копии данных:**
   - Оригинал (на сервере в `/var/lib/docker/volumes`)
   - Бэкапы БД в S3 (каждые 6 часов)
   - Snapshots сервера в Яндекс (каждый день)

2. **2 типа носителей:**
   - S3 (объектное хранилище)
   - Snapshots (блочное хранилище)

3. **1 копия офф-сайт:**
   - S3 в Яндексе (географически удалённо от сервера)

### Настройка Lifecycle Policy в Yandex S3

```bash
# Сохраняем:
# - Все бэкапы за последние 7 дней
# - Один бэкап в день за последний месяц
# - Один бэкап в месяц за последний год
```

В консоли Yandex Cloud → Object Storage → Правила жизненного цикла:
```json
{
  "Rules": [
    {
      "Id": "DeleteOldBackups",
      "Status": "Enabled",
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

---

## 📝 Чеклист для Production

### Перед запуском на сервере:

- [ ] Тестовый бэкап создан и загружен в S3
- [ ] Тестовое восстановление из бэкапа прошло успешно
- [ ] Скрипт `check-health.sh` запускается
- [ ] Telegram алерты настроены и работают
- [ ] Cron задачи добавлены (health check каждый час)
- [ ] Snapshots в Яндекс настроены (каждый день)
- [ ] Lifecycle policy в S3 настроен
- [ ] Мониторинг uptime настроен (UptimeRobot)

### Регулярное обслуживание:

- [ ] **Каждую неделю**: проверить что бэкапы создаются
- [ ] **Каждый месяц**: тестовое восстановление из бэкапа
- [ ] **Каждый квартал**: тестовое восстановление из snapshot
- [ ] **Каждые 6 месяцев**: обновить Docker образы

---

## 🚀 Команды для быстрого реагирования

### БД упала
```bash
# Перезапустить БД
docker-compose -f docker-compose.prod.yml restart db

# Проверить логи
docker logs db --tail 100

# Если не помогло - восстановить из бэкапа
cd docker/backup/tools
./restore-db.sh latest
```

### Приложение не отвечает
```bash
# Проверить статус
docker ps

# Перезапустить приложение
docker-compose -f docker-compose.prod.yml restart app

# Логи
docker logs modelka_app --tail 100
```

### Диск заполнен
```bash
# Проверить что занимает место
du -sh /var/lib/docker/volumes/*
docker system df

# Очистить
docker system prune -a --volumes
docker logs --tail 0 -f <container> # Очистить логи
```

### Полная катастрофа
```bash
# 1. Создать новый сервер
# 2. Восстановить из snapshot (если нужны файлы)
# 3. Или развернуть с нуля и восстановить БД:
git pull
docker-compose -f docker-compose.prod.yml up -d
cd docker/backup/tools
./restore-db.sh latest
```

---

## 📞 Контакты для экстренных ситуаций

Создайте файл `EMERGENCY.md` с контактами:
- Админ сервера
- Доступы к Яндекс Cloud
- Доступы к S3
- Ссылка на документацию
- План восстановления (runbook)

---

**Следующий шаг**: Настроить Telegram алёрты и запустить first backup на продакшене!
