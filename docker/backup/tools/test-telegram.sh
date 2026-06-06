#!/bin/bash
# Тест Telegram уведомлений

echo "=== 📱 Тест Telegram бота ==="
echo ""

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-8262329547:AAHMxuDp3yQ3yENJgCvmr1E8lghA08mRb7s}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-819981869}"

echo "Проверка настроек:"
echo "  BOT_TOKEN: ${TELEGRAM_BOT_TOKEN:0:20}..."
echo "  CHAT_ID: $TELEGRAM_CHAT_ID"
echo ""

# Проверка что Chat ID настроен
if [ "$TELEGRAM_CHAT_ID" = "YOUR_CHAT_ID_HERE" ]; then
  echo -e "${RED}✗${NC} CHAT_ID не настроен!"
  echo ""
  echo "Инструкция:"
  echo "1. Найдите вашего бота в Telegram"
  echo "2. Отправьте ему /start"
  echo "3. Откройте в браузере:"
  echo "   https://api.telegram.org/bot8262329547:AAHMxuDp3yQ3yENJgCvmr1E8lghA08mRb7s/getUpdates"
  echo "4. Найдите \"chat\":{\"id\":ЧИСЛО} - это ваш CHAT_ID"
  echo "5. Вставьте в скрипт telegram-alert.sh:"
  echo "   TELEGRAM_CHAT_ID=\"ваш_chat_id\""
  echo ""
  exit 1
fi

echo "Отправка тестового сообщения..."

RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d chat_id="${TELEGRAM_CHAT_ID}" \
  -d text="✅ <b>Тест уведомлений</b>

Если вы видите это сообщение - Telegram бот настроен правильно! 🎉

Время: $(date '+%Y-%m-%d %H:%M:%S')
Сервер: $(hostname)" \
  -d parse_mode="HTML")

# Проверка ответа
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo -e "${GREEN}✓${NC} Тестовое сообщение отправлено успешно!"
  echo ""
  echo "Проверьте Telegram - вы должны были получить сообщение от бота."
  echo ""
  echo -e "${GREEN}Настройка завершена!${NC}"
  echo ""
  echo "Следующие шаги:"
  echo "1. Добавьте в crontab для автоматических проверок:"
  echo "   crontab -e"
  echo "   */30 * * * * cd $(pwd)/.. && ./tools/telegram-alert.sh"
  echo ""
  echo "2. Проверьте работу алёртов вручную:"
  echo "   ./telegram-alert.sh"
  echo ""
  exit 0
else
  echo -e "${RED}✗${NC} Ошибка отправки сообщения!"
  echo ""
  echo "Ответ от Telegram API:"
  echo "$RESPONSE"
  echo ""
  echo "Возможные причины:"
  echo "- Неправильный CHAT_ID"
  echo "- Неправильный BOT_TOKEN"
  echo "- Вы не отправили боту /start"
  echo ""
  exit 1
fi
