# Unit Тесты для Fashn.ai HTTP-клиента

## Настройка тестовой инфраструктуры

Для запуска unit тестов необходимо установить и настроить Vitest.

### 1. Установка зависимостей

```bash
cd web
npm install -D vitest @vitest/ui
```

### 2. Создание конфигурации Vitest

Создайте файл `web/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3. Добавление скриптов в package.json

Добавьте в раздел `scripts`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 4. (Опционально) Настройка coverage

Для измерения покрытия кода тестами:

```bash
npm install -D @vitest/coverage-v8
```

Добавьте в `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.test.ts', 'src/lib/**/__tests__/**'],
    },
  },
  // ...
});
```

---

## Запуск тестов

### Режим watch (разработка)

```bash
npm test
```

Тесты будут автоматически перезапускаться при изменении файлов.

### Одиночный запуск

```bash
npm run test:run
```

### UI режим (интерактивный)

```bash
npm run test:ui
```

Откроется браузерный интерфейс с детальной информацией о тестах.

### Coverage отчет

```bash
npm run test:coverage
```

HTML отчет будет доступен в `web/coverage/index.html`.

---

## Структура тестов

### Файл: `fashn.test.ts`

Содержит unit тесты для:

- ✅ `startVirtualTryOn()` - запуск генерации
- ✅ `getPredictionStatus()` - проверка статуса
- ✅ Кастомные классы ошибок (FashnRateLimitError, FashnApiError, и др.)
- ✅ Утилитарные функции (mapFashnStatusToDbStatus, extractFirstResultUrl)
- ✅ Валидация входных параметров (Zod)

### Покрытие тестами

**Тест кейс 1**: ✅ Успешная отправка
- Проверка формирования body
- Проверка webhook_url
- Проверка headers (Authorization)

**Тест кейс 2**: ✅ Обработка 429 ошибки
- Проверка throw FashnRateLimitError
- Проверка retryAfter значения

**Тест кейс 3**: ✅ Валидация параметров
- Zod валидация невалидных URLs
- Zod валидация обязательных полей
- Проверка значений по умолчанию

**Тест кейс 4**: ✅ Обработка других ошибок
- 400 - FashnValidationError
- 401 - FashnAuthError
- 500 - FashnServerError

---

## Mock стратегия

Тесты используют `vi.fn()` для мокирования `global.fetch`:

```typescript
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ id: 'pred_abc123', status: 'queued' }),
});
```

Это позволяет:
- ✅ Тестировать без реальных API вызовов
- ✅ Контролировать ответы API
- ✅ Тестировать edge cases (ошибки, таймауты)
- ✅ Быстрое выполнение тестов

---

## Интеграционные тесты

В файле есть `describe.skip()` блок для интеграционных тестов.

**ВНИМАНИЕ**: Интеграционные тесты требуют:
- ✅ Реальный FASHN_API_KEY
- ✅ Публично доступные URL изображений
- ⚠️ Потратят API кредиты
- ⏱️ Займут ~30-60 секунд

Для запуска:

```typescript
// Убрать .skip из describe.skip()
describe('Интеграционные тесты', () => {
  // ...
});
```

```bash
npm run test:run -- --testTimeout=60000
```

---

## CI/CD интеграция

### GitHub Actions

Создайте `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        working-directory: ./web
        run: npm ci

      - name: Run tests
        working-directory: ./web
        run: npm run test:run

      - name: Generate coverage
        working-directory: ./web
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./web/coverage/coverage-final.json
```

---

## Лучшие практики

### ✅ DO

- ✅ Пишите тесты для каждой новой функции
- ✅ Используйте моки для внешних API
- ✅ Тестируйте edge cases и ошибки
- ✅ Поддерживайте coverage >80%
- ✅ Запускайте тесты перед коммитом

### ❌ DON'T

- ❌ НЕ коммитьте `.skip()` тесты без комментария
- ❌ НЕ используйте реальные API ключи в unit тестах
- ❌ НЕ делайте тесты зависимыми друг от друга
- ❌ НЕ пропускайте тестирование ошибок

---

## Troubleshooting

### Ошибка: "Cannot find module '@/lib/fashn'"

**Решение**: Проверьте alias в `vitest.config.ts`:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Ошибка: "fetch is not defined"

**Решение**: Убедитесь что используется Node.js 18+ (где fetch является глобальным).

Или установите polyfill:

```bash
npm install -D node-fetch
```

```typescript
// В начале теста
import fetch from 'node-fetch';
global.fetch = fetch as any;
```

### Медленные тесты

**Решение**: Убедитесь что все `fetch` замокированы и нет реальных HTTP запросов.

---

## Дальнейшие шаги

- [ ] Настроить Vitest в проекте
- [ ] Запустить тесты локально
- [ ] Настроить pre-commit hook для запуска тестов
- [ ] Интегрировать в CI/CD пайплайн
- [ ] Настроить coverage отчеты
- [ ] Добавить badge с покрытием в README

---

**Автор**: Claude Sonnet 4.5
**Проект**: Modelka AI B2B SaaS Platform
