# Структура проекта Modelka.ai

## 📁 Общая структура

```
modelka-ai/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (app)/                    # Группа маршрутов приложения
│   │   │   └── layout.tsx            # Layout для авторизованных страниц
│   │   ├── actions/                  # Server Actions
│   │   │   ├── _core/                # Базовые actions (credits, validation)
│   │   │   ├── generate.ts           # Actions для генерации
│   │   │   ├── credits.ts            # Управление кредитами
│   │   │   ├── product-to-model.ts   # Product-to-Model логика
│   │   │   └── types.ts              # Типы для actions
│   │   ├── api/                      # API Routes
│   │   │   ├── assets/               # Управление ассетами
│   │   │   ├── auth/                 # NextAuth.js endpoints
│   │   │   ├── generate/             # Endpoints генерации (legacy)
│   │   │   ├── generations/          # Статус и синхронизация
│   │   │   └── webhooks/             # Webhooks от Fashn.ai
│   │   ├── app/                      # Страницы приложения
│   │   │   ├── billing/              # Страница биллинга
│   │   │   ├── gallery/              # Галерея результатов
│   │   │   ├── generate/             # Страницы генерации
│   │   │   │   ├── product-to-model/ # Product to Model
│   │   │   │   ├── try-on/           # Virtual Try-On
│   │   │   │   ├── face-to-model/    # Face to Model
│   │   │   │   ├── model-create/     # Model Create
│   │   │   │   ├── model-swap/       # Model Swap
│   │   │   │   ├── edit/             # Image Edit
│   │   │   │   ├── background-change/ # Background Change
│   │   │   │   └── video/            # Image to Video
│   │   │   └── profile/              # Профиль пользователя
│   │   └── auth/                     # Страницы авторизации
│   │
│   ├── components/                   # React компоненты
│   │   ├── generation/               # Общие компоненты генерации
│   │   │   └── smart-uploader.tsx    # Умный загрузчик файлов
│   │   ├── product-to-model/         # Product-to-Model компоненты
│   │   │   ├── shared/               # Общие типы и константы
│   │   │   ├── uploaders/            # Компоненты загрузки
│   │   │   ├── controls/             # Элементы управления
│   │   │   └── dialogs/              # Диалоговые окна
│   │   ├── landing/                  # Компоненты лендинга
│   │   ├── layout/                   # Layout компоненты
│   │   └── ui/                       # shadcn/ui компоненты
│   │
│   ├── lib/                          # Утилиты и хелперы
│   │   ├── fashn.ts                  # Fashn.ai API клиент
│   │   ├── s3.ts                     # Yandex S3 клиент
│   │   ├── storage.ts                # Управление хранилищем
│   │   └── utils.ts                  # Общие утилиты
│   │
│   ├── services/                     # Бизнес-логика
│   │   ├── assets.ts                 # Управление ассетами
│   │   ├── credits.ts                # Управление кредитами
│   │   └── generationService.ts      # Сервис генерации
│   │
│   ├── db/                           # База данных
│   │   ├── schema.ts                 # Drizzle ORM схема
│   │   └── index.ts                  # Подключение к БД
│   │
│   ├── hooks/                        # React хуки
│   │   └── use-asset-upload.ts       # Хук загрузки в S3
│   │
│   ├── contexts/                     # React контексты
│   │   └── credits-context.tsx       # Контекст кредитов
│   │
│   └── types/                        # TypeScript типы
│       └── errors.ts                 # Типы ошибок
│
├── docs/                             # Документация
│   ├── PROJECT_STRUCTURE.md          # Структура проекта (этот файл)
│   └── GENERATION_GUIDE.md           # Руководство по генерации
│
└── public/                           # Статические файлы
    └── images/                       # Изображения
        └── input/                    # Placeholder изображения
```

## 🎯 Ключевые директории

### `/src/app/actions/` - Server Actions

**Назначение:** Серверные функции для мутаций данных и вызова API.

**Файлы:**
- `generate.ts` - Экспортирует actions для генерации (точка входа)
- `product-to-model.ts` - Логика Product-to-Model генерации
- `types.ts` - Общие типы для всех actions
- `_core/` - Базовые переиспользуемые actions

**Паттерн использования:**
```typescript
// В компоненте
const { generateProductToModelAction } = await import('@/app/actions/generate');
const result = await generateProductToModelAction(payload);
```

### `/src/components/product-to-model/` - Модульные компоненты

**Структура:**
```
product-to-model/
├── shared/                    # Общие типы и константы
│   ├── types.ts              # GenerationStatus, UploadedFile, и т.д.
│   ├── constants.ts          # ASPECT_RATIOS, RESOLUTIONS
│   └── index.ts
├── uploaders/                # Компоненты загрузки
│   ├── ProductImageUploader.tsx  # Загрузчик товара
│   ├── ModelImageUploader.tsx    # Загрузчик модели
│   └── index.ts
├── controls/                 # Элементы управления
│   ├── GenerationCommandBar.tsx     # Панель управления
│   ├── SettingsPopovers.tsx        # Поповеры настроек
│   ├── OptionalFeaturesButtons.tsx # Кнопки фич
│   └── index.ts
└── dialogs/                  # Диалоговые окна
    ├── add-model-dialog.tsx
    ├── model-selection-dialog.tsx
    └── upload-dialog.tsx
```

### `/src/services/` - Бизнес-логика

**Файлы:**
- `generationService.ts` - Создание, отправка, финализация генераций
- `assets.ts` - Управление файлами в S3 и БД
- `credits.ts` - Списание и начисление кредитов

### `/src/lib/` - Внешние API и утилиты

**Файлы:**
- `fashn.ts` - HTTP клиент для Fashn.ai API
- `s3.ts` - Работа с Yandex Object Storage
- `storage.ts` - Скачивание и сохранение результатов

## 🔄 Поток данных

### 1. Генерация Product-to-Model

```
1. Пользователь загружает товар
   ↓
2. useAssetUpload → Загрузка в S3 → Получение s3Key
   ↓
3. Нажатие "Запустить"
   ↓
4. generateProductToModelAction (Server Action)
   ↓
5. Проверка кредитов → Создание записи в БД → Вызов Fashn.ai API
   ↓
6. Polling: checkProductToModelStatusAction каждые 3 секунды
   ↓
7. Статус COMPLETED → Отображение результатов
```

### 2. Webhook от Fashn.ai

```
1. Fashn.ai завершает генерацию → POST /api/webhooks/fashn
   ↓
2. Валидация webhook → Обновление статуса в БД
   ↓
3. Скачивание результатов → Загрузка в наш S3
   ↓
4. Создание записей assets для результатов
```

## 📊 База данных (Drizzle ORM)

### Основные таблицы:

```sql
users                  -- Пользователи
  ├── id (uuid)
  ├── email
  ├── credits (integer)
  └── planCode (text)

assets                 -- Файлы (загруженные и результаты)
  ├── id (uuid)
  ├── userId (uuid)
  ├── type (enum: uploaded_garment, uploaded_model, generated_result)
  ├── s3Key (text)
  └── mimeType (text)

generations           -- Генерации
  ├── id (uuid)
  ├── userId (uuid)
  ├── type (enum: product_to_model, try_on, ...)
  ├── status (enum: PENDING, PROCESSING, COMPLETED, FAILED)
  ├── providerTaskId (text)  -- ID задачи в Fashn.ai
  └── inputParams (jsonb)    -- Параметры генерации

plans                 -- Тарифные планы
  ├── id (uuid)
  ├── code (text: starter, seller, brand)
  └── features (jsonb)
```

## 🔐 Переменные окружения

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Fashn.ai API
FASHN_API_KEY=...

# Yandex Object Storage (S3)
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=ru-central1
S3_ENDPOINT=https://storage.yandexcloud.net
S3_ASSETS_BUCKET=modelka-storage
NEXT_PUBLIC_S3_PUBLIC_URL=https://storage.yandexcloud.net/modelka-storage

# Webhooks
WEBHOOK_BASE_URL=https://yourdomain.com
```

## 🧪 Тестирование

```
src/
├── lib/__tests__/
│   └── fashn.test.ts                  -- Тесты Fashn.ai клиента
└── services/__tests__/
    └── generationIntegration.test.ts  -- Интеграционные тесты
```

**Запуск тестов:**
```bash
npm test                    # Все тесты
npm test -- fashn          # Только Fashn.ai тесты
```

## 📦 Зависимости

### Основные
- **Next.js 15** - React фреймворк
- **React 19** - UI библиотека
- **Drizzle ORM** - Type-safe ORM для PostgreSQL
- **NextAuth.js** - Аутентификация
- **Tailwind CSS** - Стилизация
- **shadcn/ui** - UI компоненты

### Интеграции
- **Fashn.ai SDK** - AI генерация изображений
- **AWS SDK (S3)** - Работа с Yandex Object Storage
- **Framer Motion** - Анимации
- **React Dropzone** - Drag & drop загрузка

## 🚀 Команды

```bash
npm run dev             # Запуск dev сервера
npm run build           # Production сборка
npm run lint            # Проверка линтером
npm test                # Запуск тестов
npm run db:push         # Применить изменения схемы БД
npm run db:studio       # Открыть Drizzle Studio
```

## 📝 Соглашения о коде

### Именование файлов
- Компоненты: `PascalCase.tsx` (ProductImageUploader.tsx)
- Утилиты: `kebab-case.ts` (use-asset-upload.ts)
- Server Actions: `camelCase.ts` (generate.ts)

### Структура компонентов
```typescript
// 1. Импорты
import { ... } from '...'

// 2. Типы
interface ComponentProps { ... }

// 3. Константы
const DEFAULTS = { ... }

// 4. Компонент
export function Component({ ... }: ComponentProps) {
  // Hooks
  // State
  // Handlers
  // Effects
  // Computed values
  // Render
}
```

### Комментарии
- Все комментарии на **русском** языке
- JSDoc для публичных функций и компонентов
- Inline комментарии для сложной логики
