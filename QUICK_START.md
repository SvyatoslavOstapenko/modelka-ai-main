# Quick Start - Production Build Safety

## Первоначальная настройка (один раз)

```bash
cd web
npm run hooks:install
```

Это установит автоматическую проверку перед каждым `git push`.

## Перед каждым пушем в main

### Быстрая проверка (2-3 минуты)
```bash
npm run build:verify
```

### Полная проверка (рекомендуется, 3-5 минут)
```bash
npm run build:verify-full
```

## Обычный workflow

```bash
# 1. Разработка
npm run dev:start

# 2. Коммит
git add .
git commit -m "feat: описание"

# 3. Push (hook запустится автоматически)
git push

# Если hook блокирует push:
# - Исправьте ошибки
# - Или используйте --no-verify (НЕ рекомендуется!)
```

## Что проверяет hook

1. ✅ ESLint (ошибки кода)
2. ✅ Docker build (продакшен сборка)
3. ✅ Переменные окружения
4. ✅ Зависимости

## Если что-то пошло не так

### Build failed

```bash
# Проверьте локально
npm run build

# Проверьте Docker
npm run build:verify-full
```

### Добавили новую переменную окружения

1. Добавьте в `.env.example`
2. Добавьте в `Dockerfile` (если нужна при сборке)
3. Обновите `PROD_ENV_FILE` в GitHub Secrets

### Production сломался после деплоя

```bash
# На сервере проверьте логи
docker logs modelka_app

# Откатите коммит
git revert HEAD
git push
```

## Полезные ссылки

- [Подробный гайд](docs/PRODUCTION_BUILD_GUIDE.md)
- [Основная документация](../CLAUDE.md)
- [Troubleshooting](docs/EMERGENCY_GUIDE.md)

## Частые ошибки

| Ошибка | Решение |
|--------|---------|
| `AUTH_SECRET must be 32+ chars` | Проверьте Dockerfile, должно быть 32+ символа |
| `MODULE_NOT_FOUND` | `npm install` + проверьте импорты |
| `Container exits immediately` | Проверьте логи: `docker logs <name>` |
| `Database connection failed` | Проверьте DATABASE_URL в .env |

## Emergency: Пропустить проверку

```bash
# НЕ РЕКОМЕНДУЕТСЯ! Только в крайнем случае
git push --no-verify
```

**Помните**: Лучше потратить 5 минут на проверку сейчас, чем часы на исправление сломанного продакшена!
