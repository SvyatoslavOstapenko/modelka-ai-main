# 🗄️ Database Schema Documentation

## Overview

Полная схема базы данных для Modelka.AI MVP включает:
- **Auth.js v5** таблицы (`users`, `accounts`, `sessions`, `verification_tokens`)
- **Business Logic** таблицы (`plans`, `user_plan_history`, `assets`, `generations`, `generation_assets`, `generation_events`, `transactions`)
- **Enums** для строгой типизации
- **Indexes** для оптимизации запросов
- **Relations** для удобных JOIN-запросов

---

## 📊 Таблицы

### 1. `users` - Пользователи

Объединяет Auth.js и бизнес-логику (баланс кредитов, роли, планы).

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary Key |
| `name` | text | Имя пользователя (nullable) |
| `email` | text | Email (unique, not null) |
| `email_verified` | timestamp | Дата верификации email |
| `is_verified` | boolean | Верифицирован ли пользователь (default: false) |
| `image` | text | URL аватарки (из OAuth) |
| `role` | enum | `user` \| `admin` |
| `plan_code` | enum | Текущий тариф: `test` \| `seller` \| `brand` |
| `credits` | integer | Текущий баланс кредитов (default: 0) |
| `created_at` | timestamp | Дата регистрации |
| `updated_at` | timestamp | Последнее обновление |

**Indexes:**
- `users_email_idx`
- `users_plan_code_idx`
- `users_created_at_idx`

---

### 2. `accounts`, `sessions`, `verification_tokens` (Auth.js)

Стандартные таблицы для Auth.js v5 (OAuth providers, Database Sessions).

---

### 3. `plans` - Тарифные планы

Конфигурация фич и лимитов.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary Key |
| `code` | enum | `test` \| `seller` \| `brand` (Unique) |
| `name` | text | Отображаемое название (e.g. "Seller") |
| `description` | text | Описание |
| `features` | jsonb | JSON конфиг (allowVideo, maxResolution, retention, etc.) |
| `price_credits` | integer | Кол-во кредитов в пакете |
| `price_rub` | integer | Цена в копейках |
| `sort_order` | integer | Порядок вывода в UI |
| `is_active` | boolean | Доступен ли для покупки |

---

### 4. `user_plan_history` - История планов

Аудит смен тарифных планов.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary Key |
| `user_id` | uuid | FK → users.id |
| `from_plan_code` | enum | Старый план |
| `to_plan_code` | enum | Новый план |
| `reason` | text | Причина (purchase, upgrade, etc.) |
| `created_at` | timestamp | Дата изменения |

---

### 5. `assets` - Реестр результатов генераций

**ВАЖНО:** Хранит ТОЛЬКО результаты генераций. Пользовательские загрузки НЕ хранятся в БД!

Uploads существуют только в S3 (префикс `tmp/`) с Lifecycle Policy ≤24ч.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary Key |
| `user_id` | uuid | FK → users.id |
| `url` | text | Полный URL файла |
| `s3_key` | text | Путь в S3 |
| `s3_bucket` | text | Имя бакета |
| `type` | enum | `generated_result` (единственный допустимый) |
| `result_type` | enum | `model` \| `product` (для фильтрации) |
| `media_kind` | enum | `image` \| `video` |
| `origin` | enum | `generated` \| `fetched` |
| `meta` | jsonb | Метаданные (width, height, duration, fps, etc.) |
| `expires_at` | timestamp | Дата удаления (зависит от тарифа) |
| `created_at` | timestamp | Дата создания |

**Retention по тарифам:**
- `test` / нет тарифа: 7 дней
- `seller`: 30 дней
- `brand`: 180 дней

**Indexes:**
- `assets_user_id_idx`
- `assets_type_idx`
- `assets_result_type_idx` (для фильтрации)
- `assets_origin_media_idx`
- `assets_expires_at_idx` (для cron job очистки)

---

### 6. `generations` - Универсальные AI Задачи

Таблица для всех типов генераций (Fashn.ai и др.).

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary Key |
| `user_id` | uuid | FK → users.id |
| `type` | enum | `product_to_model`, `image_to_video`, `edit`, etc. |
| `provider` | enum | `fashn` \| `fal` \| `internal` |
| `provider_task_id` | text | ID задачи во внешней системе (Unique) |
| `status` | enum | `PENDING`, `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `error_reason` | text | Текст ошибки при FAILED |
| `params` | jsonb | Все параметры запуска (mode, category, prompt, settings...) |
| `cost` | integer | Потраченные кредиты |
| `webhook_token` | text | Токен для защиты webhook endpoint |
| `created_at` | timestamp | Время создания |
| `completed_at` | timestamp | Время завершения |
| `duration_ms` | integer | Длительность выполнения |

**Indexes:**
- `generations_provider_task_id_idx` (поиск по webhook)
- `generations_webhook_token_idx`
- `generations_user_id_created_at_idx`
- `generations_status_idx`

---

### 7. `generation_assets` - Связи (M:N)

**ВАЖНО:** Используется ТОЛЬКО для output ассетов (результатов). Input ассеты не хранятся!

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary Key |
| `generation_id` | uuid | FK → generations.id |
| `asset_id` | uuid | FK → assets.id |
| `direction` | enum | `output` (input больше не используется) |
| `role` | enum | `output_image` \| `output_video` |
| `sort_order` | integer | Порядок (если несколько выходов) |

**Indexes:**
- `generation_assets_gen_dir_idx` (быстрая выборка результатов)
- `generation_assets_unique_idx` (gen_id + asset_id + role)

---

### 8. `generation_events` - Аудит событий

Лог событий жизненного цикла генерации.

**ВАЖНО:** Payload НЕ должен содержать ссылки/ключи на S3 tmp-инпуты (только безопасные данные).

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary Key |
| `generation_id` | uuid | FK → generations.id |
| `event_type` | enum | `CREATED`, `REQUEST_SENT`, `WEBHOOK_RECEIVED`, `COMPLETED`, etc. |
| `payload` | jsonb | Безопасные данные (providerTaskId, status, output URLs) |
| `message` | text | Дополнительная информация |
| `created_at` | timestamp | Время события |

---

### 9. `transactions` - Финансовый журнал

Журнал движения кредитов.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary Key |
| `user_id` | uuid | FK → users.id |
| `type` | enum | `DEPOSIT`, `SPEND`, `REFUND`, `BONUS` |
| `status` | enum | `PENDING` \| `SUCCEEDED` \| `FAILED` |
| `amount` | integer | Изменение (+20, -1) |
| `money_amount` | integer | Сумма в деньгах (опционально) |
| `generation_id` | uuid | Ссылка на генерацию (при SPEND/REFUND) |
| `metadata` | jsonb | Доп. данные |

---

## 📖 Примеры запросов (Drizzle)

### Получить генерацию со всеми ассетами

```typescript
const gen = await db.query.generations.findFirst({
  where: eq(generations.id, genId),
  with: {
    generationAssets: {
      with: {
        asset: true
      }
    }
  }
});

const inputs = gen.generationAssets.filter(ga => ga.direction === 'input');
const outputs = gen.generationAssets.filter(ga => ga.direction === 'output');
```

### Создание генерации (Atomic Transaction)

```typescript
await db.transaction(async (tx) => {
  // 1. Списание
  await tx.update(users)
    .set({ credits: sql`${users.credits} - ${cost}` })
    .where(eq(users.id, userId));

  // 2. Создание записи генерации
  const [gen] = await tx.insert(generations).values({
    userId,
    type: 'product_to_model',
    params: { mode: 'balanced', category: 'tops' },
    cost,
    webhookToken: crypto.randomUUID(),
  }).returning();

  // 3. Привязка инпутов
  await tx.insert(generationAssets).values([
    { generationId: gen.id, assetId: modelId, direction: 'input', role: 'model_image' },
    { generationId: gen.id, assetId: garmentId, direction: 'input', role: 'garment_image' }
  ]);
  
  // 4. Запись транзакции
  await tx.insert(transactions).values({
    userId,
    type: 'SPEND',
    amount: -cost,
    generationId: gen.id
  });
});
```

## 🚀 Миграции

```bash
# Генерация миграции
npm run db:generate

# Применение
npm run db:migrate
```

---

## 🔒 Безопасность и Privacy

### Пользовательские загрузки (Uploads)

**НЕ хранятся в БД!** Только в S3:

- **Префикс:** `tmp/{userId}/`
- **Lifecycle:** ≤24 часа (автоматическая очистка через S3 Lifecycle Policy)
- **Валидация:** Backend проверяет что s3Key начинается с `tmp/{userId}/` (предотвращает доступ к чужим файлам)
- **Безопасность:** Presigned URLs генерируются на лету с коротким сроком действия (30 минут)

### Результаты генераций

Хранятся в БД и S3:

- **Префикс:** `results/{userId}/`
- **Retention:** Зависит от тарифа (7/30/180 дней)
- **Фильтрация:** По `result_type` (model/product)
- **Cleanup:** Автоматический cron job удаляет истёкшие результаты

### Генерации

- **params:** Хранит только безопасные параметры (mode, category, resolution, seed)
- **НЕ хранит:** input URLs, s3 keys, presigned URLs
- **Timeout protection:** Зависшие PENDING генерации (без providerTaskId > 15 мин) автоматически помечаются FAILED с refund

---

## 📊 API Contract

### Создание генерации

**Старый подход (deprecated):**
```json
{
  "modelAssetId": "uuid",
  "garmentAssetId": "uuid"
}
```

**Новый подход:**
```json
{
  "modelS3Key": "tmp/{userId}/{uuid}.jpg",
  "garmentS3Key": "tmp/{userId}/{uuid}.jpg",
  "modelMimeType": "image/jpeg",
  "garmentMimeType": "image/jpeg"
}
```

### Безопасность

1. **Валидация s3Key:**
   - Должен начинаться с `tmp/{userId}/`
   - Не содержит `../` (path traversal)
   - Валидное расширение (.jpg, .jpeg, .png, .webp)

2. **Генерация presigned URLs:**
   - Backend сам генерирует presigned GET URLs для FASHN API
   - Срок действия: 30 минут
   - Клиент НЕ имеет доступа к этим URLs

3. **Cleanup:**
   - `cleanupExpiredAssets()` - удаляет истёкшие результаты
   - `cleanupStalePendingGenerations()` - обрабатывает зависшие генерации
   - `cleanupTmpUploads()` - опционально (основная очистка через S3 Lifecycle)
