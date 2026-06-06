#!/bin/bash
# Отправка уведомлений в Telegram

# ⚠️ НАСТРОЙТЕ ЭТИ ПЕРЕМЕННЫЕ:
# 1. Создайте бота через @BotFather в Telegram
# 2. Получите TOKEN
# 3. Получите CHAT_ID через https://api.telegram.org/bot<TOKEN>/getUpdates

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-8262329547:AAHMxuDp3yQ3yENJgCvmr1E8lghA08mRb7s}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-819981869}"

# Функция отправки сообщения
send_alert() {
  local MESSAGE="$1"
  local EMOJI="${2:-⚠️}"

  # Проверка что токены настроены
  if [ "$TELEGRAM_BOT_TOKEN" = "YOUR_BOT_TOKEN_HERE" ] || [ "$TELEGRAM_CHAT_ID" = "YOUR_CHAT_ID_HERE" ]; then
    echo "⚠️  Telegram не настроен. Пропускаю отправку уведомления."
    echo "Настройте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в этом скрипте или через env переменные."
    return 0
  fi

  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="${TELEGRAM_CHAT_ID}" \
    -d text="${EMOJI} ${MESSAGE}" \
    -d parse_mode="HTML" > /dev/null

  if [ $? -eq 0 ]; then
    echo "✓ Telegram уведомление отправлено"
  else
    echo "✗ Ошибка отправки Telegram уведомления"
  fi
}

# Если скрипт запущен напрямую - запускаем проверку здоровья
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  # Получаем путь к директории скрипта
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  # Запуск проверки
  if ! "$SCRIPT_DIR/check-health.sh" > /tmp/health-check-output.txt 2>&1; then
    # Если проверка провалилась - отправляем алерт
    OUTPUT=$(cat /tmp/health-check-output.txt)
    send_alert "🚨 <b>ПРОБЛЕМА НА СЕРВЕРЕ!</b>

$OUTPUT

Сервер: $(hostname)
Время: $(date '+%Y-%m-%d %H:%M:%S')" "🚨"
  else
    echo "✓ Проверка здоровья пройдена, алёрт не требуется"
  fi

  # Очистка
  rm -f /tmp/health-check-output.txt
fi
