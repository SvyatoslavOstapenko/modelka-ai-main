#!/bin/bash
# Скрипт для настройки мониторинга на сервере

echo "=== 📊 Настройка мониторинга ==="
echo ""

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Путь к скриптам
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "1. Делаю скрипты исполняемыми..."
chmod +x "$SCRIPT_DIR/check-health.sh"
chmod +x "$SCRIPT_DIR/telegram-alert.sh"
echo -e "${GREEN}✓${NC} Готово"
echo ""

echo "2. Тестирую скрипт проверки здоровья..."
if "$SCRIPT_DIR/check-health.sh"; then
  echo -e "${GREEN}✓${NC} Проверка здоровья работает"
else
  echo -e "${YELLOW}⚠${NC} Есть проблемы, но скрипт работает"
fi
echo ""

echo "3. Настройка Telegram алёртов..."
echo ""
echo "Для настройки Telegram уведомлений:"
echo "1. Создайте бота через @BotFather в Telegram"
echo "2. Получите TOKEN от BotFather"
echo "3. Отправьте боту /start"
echo "4. Откройте: https://api.telegram.org/bot<TOKEN>/getUpdates"
echo "5. Найдите chat.id в ответе"
echo ""
echo "Затем отредактируйте файл telegram-alert.sh и замените:"
echo "  TELEGRAM_BOT_TOKEN=\"YOUR_BOT_TOKEN_HERE\""
echo "  TELEGRAM_CHAT_ID=\"YOUR_CHAT_ID_HERE\""
echo ""
echo "Или экспортируйте переменные окружения:"
echo "  export TELEGRAM_BOT_TOKEN=\"123456:ABC-DEF...\""
echo "  export TELEGRAM_CHAT_ID=\"123456789\""
echo ""

echo "4. Настройка cron задач..."
echo ""
echo "Добавьте в crontab следующие строки:"
echo ""
echo "# Проверка здоровья каждый час"
echo "0 * * * * cd $SCRIPT_DIR/.. && ./tools/check-health.sh >> /var/log/health-check.log 2>&1"
echo ""
echo "# Telegram алёрт каждые 30 минут"
echo "*/30 * * * * cd $SCRIPT_DIR/.. && ./tools/telegram-alert.sh"
echo ""
echo "Команда для добавления:"
echo "  crontab -e"
echo ""

echo -e "${GREEN}✓${NC} Базовая настройка завершена!"
echo ""
echo "Следующие шаги:"
echo "1. Настроить Telegram бота (см. выше)"
echo "2. Добавить cron задачи"
echo "3. Настроить UptimeRobot или аналог для внешнего мониторинга"
echo "4. Настроить Lifecycle Policy в Yandex S3"
echo ""
echo "Документация: ../docs/MONITORING.md"
