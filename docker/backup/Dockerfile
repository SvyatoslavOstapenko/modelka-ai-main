FROM postgres:17-alpine

# Установка AWS CLI, supercronic и curl для healthchecks
RUN apk add --no-cache \
  aws-cli \
  supercronic \
  bash \
  gzip \
  curl

# Создание директории для скриптов
WORKDIR /scripts

# Копирование скрипта бэкапа
COPY scripts/backup.sh /scripts/backup.sh
# Конвертация Windows line endings в Unix и установка прав
RUN sed -i 's/\r$//' /scripts/backup.sh && chmod +x /scripts/backup.sh

# Создание crontab файла
COPY scripts/crontab /scripts/crontab
RUN sed -i 's/\r$//' /scripts/crontab

# Healthcheck
HEALTHCHECK --interval=1m --timeout=5s \
  CMD pgrep supercronic > /dev/null || exit 1

# Запуск supercronic с crontab
CMD ["supercronic", "/scripts/crontab"]
