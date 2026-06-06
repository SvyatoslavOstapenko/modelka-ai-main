/**
 * Схема базы данных Modelka.AI
 *
 * Универсальная архитектура для поддержки множества типов генераций:
 * - Product to Model, Face to Model, Model Create, Model Variation
 * - Model Swap, Edit, Reframe, Image to Video, Background Change
 *
 * Основные изменения от MVP версии:
 * - Добавлена таблица plans (тарифные планы)
 * - Добавлена таблица user_plan_history (история смены планов)
 * - assets расширены: expires_at, temporary_until, media_kind, origin, meta
 * - generations переделана на универсальную с params jsonb
 * - Добавлена таблица generation_assets (связь M:N с ролями)
 * - Добавлена таблица generation_events (аудит событий)
 *
 * @module db/schema
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  primaryKey,
  integer,
  boolean,
  pgEnum,
  index,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccountType } from '@auth/core/adapters';

// ============================================
// ENUMS
// ============================================

// --- Пользователи ---
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

// --- Тарифные планы ---
export const planCodeEnum = pgEnum('plan_code', ['test', 'seller', 'brand']);

// --- Транзакции ---
export const transactionTypeEnum = pgEnum('transaction_type', [
  'DEPOSIT',   // Пополнение баланса
  'SPEND',     // Списание за генерацию
  'REFUND',    // Возврат при ошибке генерации
  'BONUS',     // Бонусные кредиты
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
  'PENDING',   // Ожидает подтверждения (для платежей)
  'SUCCEEDED', // Успешно проведена
  'CANCELED',  // Отменена
  'FAILED',    // Ошибка обработки
]);

// --- Ассеты ---
export const assetTypeEnum = pgEnum('asset_type', [
  'generated_result',  // Результат генерации (единственный допустимый тип)
]);

export const resultTypeEnum = pgEnum('result_type', [
  'model',    // Сгенерированная модель
  'product',  // Сгенерированный товар на модели
]);

export const mediaKindEnum = pgEnum('media_kind', [
  'image', // Изображение (PNG, JPEG, WebP)
  'video', // Видео (MP4)
]);

export const assetOriginEnum = pgEnum('asset_origin', [
  'generated', // Сгенерировано AI
  'fetched',   // Скачано с внешнего источника (напр. CDN FASHN)
]);

export const garmentPhotoTypeEnum = pgEnum('garment_photo_type', [
  'model',    // Фото одежды на модели
  'flat-lay', // Плоская укладка
  'auto',     // Автоопределение
]);

export const garmentCategoryEnum = pgEnum('garment_category', [
  'tops',       // Верх
  'bottoms',    // Низ
  'one-pieces', // Цельные (платья, комбинезоны)
  'auto',       // Автоопределение
]);

// --- Генерации ---
export const generationStatusEnum = pgEnum('generation_status', [
  'PENDING',    // Создана, ожидает отправки
  'QUEUED',     // Отправлена в API, в очереди
  'PROCESSING', // Обрабатывается
  'COMPLETED',  // Успешно завершена
  'FAILED',     // Ошибка
  'CANCELED',   // Отменена пользователем
]);

export const generationTypeEnum = pgEnum('generation_type', [
  'product_to_model',   // Товар на модель
  'face_to_model',      // Лицо → аватар модели
  'model_create',       // Создание модели по prompt
  'model_variation',    // Вариации модели
  'model_swap',         // Замена модели с сохранением одежды
  'edit',               // Редактирование изображения
  'reframe',            // Изменение кадрирования
  'image_to_video',     // Изображение → видео
  'background_change',  // Замена фона
  'virtual_tryon',      // Виртуальная примерка (legacy)
]);

export const generationProviderEnum = pgEnum('generation_provider', [
  'fashn',    // FASHN.ai
  'fal',      // Fal.ai (legacy)
  'internal', // Внутренняя обработка
]);

// --- События генерации (аудит) ---
export const generationEventTypeEnum = pgEnum('generation_event_type', [
  'CREATED',          // Генерация создана
  'REQUEST_SENT',     // Запрос отправлен в API
  'QUEUED',           // Задача поставлена в очередь
  'PROCESSING',       // Началась обработка
  'WEBHOOK_RECEIVED', // Получен webhook
  'STATUS_POLLED',    // Опрошен статус вручную
  'RESULT_SAVED',     // Результат сохранён в S3
  'COMPLETED',        // Успешно завершена
  'FAILED',           // Ошибка
  'REFUNDED',         // Кредиты возвращены
]);

// --- Связи генерация-ассеты ---
export const generationAssetDirectionEnum = pgEnum('generation_asset_direction', [
  'input',  // Входное изображение
  'output', // Выходное изображение/видео
]);

export const generationAssetRoleEnum = pgEnum('generation_asset_role', [
  // Входные роли
  'model_image',      // Фото модели (человека)
  'garment_image',    // Фото одежды
  'face_image',       // Фото лица
  'product_image',    // Фото товара
  'source_image',     // Исходное изображение (для edit/reframe)
  'background_image', // Фоновое изображение
  'reference_image',  // Референсное изображение
  'face_reference',   // Референс лица (для product-to-model)
  // Выходные роли
  'output_image',     // Результат - изображение
  'output_video',     // Результат - видео
]);

// --- Режимы генерации ---
export const generationModeEnum = pgEnum('generation_mode', [
  'performance', // Быстрый режим
  'balanced',    // Сбалансированный
  'quality',     // Максимальное качество
]);

// ============================================
// AUTH.JS TABLES
// ============================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name'),
    email: text('email').notNull().unique(),
    emailVerified: timestamp('email_verified', { mode: 'date' }),
    isVerified: boolean('is_verified').default(false).notNull(),
    image: text('image'),

    // Role-Based Access Control
    role: userRoleEnum('role').default('user').notNull(),

    // Тарифный план (ссылка на plans)
    planCode: planCodeEnum('plan_code').default('test').notNull(),

    // Баланс кредитов
    credits: integer('credits').default(0).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    planCodeIdx: index('users_plan_code_idx').on(table.planCode),
    createdAtIdx: index('users_created_at_idx').on(table.createdAt),
  })
);

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index('accounts_user_id_idx').on(account.userId),
  })
);

export const sessions = pgTable(
  'sessions',
  {
    sessionToken: text('session_token').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => ({
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
  })
);

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
);

// ============================================
// ТАРИФНЫЕ ПЛАНЫ
// ============================================

/**
 * Таблица тарифных планов
 * Хранит конфигурацию фич и лимитов для каждого плана
 */
export const plans = pgTable(
  'plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Код плана (уникальный идентификатор)
    code: planCodeEnum('code').notNull().unique(),

    // Отображаемое название
    name: text('name').notNull(),
    description: text('description'),

    // Конфигурация фич (JSON)
    features: jsonb('features').$type<PlanFeatures>().notNull(),

    // Ценообразование
    priceCredits: integer('price_credits').notNull(), // Количество токенов в пакете
    priceRub: integer('price_rub').notNull(), // Цена в копейках

    // Порядок сортировки для UI
    sortOrder: integer('sort_order').default(0).notNull(),

    // Активен ли план для покупки
    isActive: boolean('is_active').default(true).notNull(),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    codeIdx: uniqueIndex('plans_code_idx').on(table.code),
    sortOrderIdx: index('plans_sort_order_idx').on(table.sortOrder),
  })
);

/**
 * История изменения планов пользователей
 * Для аудита и аналитики
 */
export const userPlanHistory = pgTable(
  'user_plan_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Планы
    fromPlanCode: planCodeEnum('from_plan_code'),
    toPlanCode: planCodeEnum('to_plan_code').notNull(),

    // Причина смены (purchase, upgrade, downgrade, admin_change, etc.)
    reason: text('reason'),

    // Метаданные (напр. ID платежа)
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_plan_history_user_id_idx').on(table.userId),
    createdAtIdx: index('user_plan_history_created_at_idx').on(table.createdAt),
  })
);

// ============================================
// АССЕТЫ (ФАЙЛЫ)
// ============================================

/**
 * Таблица ассетов - реестр результатов генераций
 * Хранит только сгенерированные изображения и видео
 *
 * ВАЖНО: Пользовательские загрузки НЕ хранятся в БД,
 * они существуют только в S3 с lifecycle ≤24ч
 */
export const assets = pgTable(
  'assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // S3 Storage
    url: text('url').notNull(), // Полный URL (может быть presigned или публичный)
    s3Key: text('s3_key').notNull(), // Ключ объекта для операций с S3
    s3Bucket: text('s3_bucket').notNull(), // Имя бакета

    // Классификация
    type: assetTypeEnum('type').notNull(), // Тип ассета (только generated_result)
    resultType: resultTypeEnum('result_type'), // Тип результата (model или product)
    mediaKind: mediaKindEnum('media_kind').default('image').notNull(), // image или video
    origin: assetOriginEnum('origin').default('generated').notNull(), // Откуда появился файл

    // Метаданные файла
    mimeType: text('mime_type'),
    size: integer('size'), // Размер в байтах
    originalName: text('original_name'),

    // Расширенные метаданные (для разных типов контента)
    meta: jsonb('meta').$type<AssetMeta>(),

    // Политика хранения
    // expiresAt зависит от тарифного плана:
    // - test/нет тарифа: 7 дней
    // - seller: 30 дней
    // - brand: 180 дней
    expiresAt: timestamp('expires_at', { mode: 'date' }), // Когда удалить (null = бессрочно)

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('assets_user_id_idx').on(table.userId),
    typeIdx: index('assets_type_idx').on(table.type),
    resultTypeIdx: index('assets_result_type_idx').on(table.resultType),
    originMediaIdx: index('assets_origin_media_idx').on(table.origin, table.mediaKind),
    expiresAtIdx: index('assets_expires_at_idx').on(table.expiresAt),
    createdAtIdx: index('assets_created_at_idx').on(table.createdAt),
  })
);

// ============================================
// ГЕНЕРАЦИИ
// ============================================

/**
 * Универсальная таблица генераций
 * Поддерживает все типы AI-задач через params jsonb
 */
export const generations = pgTable(
  'generations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Тип и провайдер
    type: generationTypeEnum('type').notNull(),
    provider: generationProviderEnum('provider').default('fashn').notNull(),

    // ID задачи у провайдера (уникальный)
    providerTaskId: text('provider_task_id').unique(),

    // Статус выполнения
    status: generationStatusEnum('status').default('PENDING').notNull(),
    errorReason: text('error_reason'), // Причина ошибки (если status = FAILED)

    // Параметры генерации (специфичны для каждого типа)
    // Хранятся как JSON для гибкости
    params: jsonb('params').$type<GenerationParams>().notNull(),

    // Стоимость в кредитах
    cost: integer('cost').default(1).notNull(),

    // Безопасность webhook
    webhookToken: text('webhook_token').notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    completedAt: timestamp('completed_at', { mode: 'date' }),

    // Метрики
    durationMs: integer('duration_ms'), // Время выполнения в мс
  },
  (table) => ({
    userIdCreatedAtIdx: index('generations_user_id_created_at_idx').on(
      table.userId,
      table.createdAt
    ),
    statusIdx: index('generations_status_idx').on(table.status),
    providerTaskIdIdx: uniqueIndex('generations_provider_task_id_idx').on(
      table.providerTaskId
    ),
    typeIdx: index('generations_type_idx').on(table.type),
    webhookTokenIdx: index('generations_webhook_token_idx').on(table.webhookToken),
    createdAtIdx: index('generations_created_at_idx').on(table.createdAt),
  })
);

/**
 * Связующая таблица генерация-ассеты
 * Поддерживает множественные входы и выходы для каждой генерации
 */
export const generationAssets = pgTable(
  'generation_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    generationId: uuid('generation_id')
      .notNull()
      .references(() => generations.id, { onDelete: 'cascade' }),

    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),

    // Направление: вход или выход
    direction: generationAssetDirectionEnum('direction').notNull(),

    // Роль ассета в генерации
    role: generationAssetRoleEnum('role').notNull(),

    // Порядок сортировки (для множественных результатов)
    sortOrder: integer('sort_order').default(0).notNull(),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    generationIdDirectionIdx: index('generation_assets_gen_dir_idx').on(
      table.generationId,
      table.direction
    ),
    assetIdIdx: index('generation_assets_asset_id_idx').on(table.assetId),
    // Уникальность: один ассет не может быть в одной роли для одной генерации дважды
    uniqueGenAssetRole: uniqueIndex('generation_assets_unique_idx').on(
      table.generationId,
      table.assetId,
      table.role
    ),
  })
);

/**
 * События генерации (аудит-лог)
 * Записывает все важные события для отладки и аналитики
 */
export const generationEvents = pgTable(
  'generation_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    generationId: uuid('generation_id')
      .notNull()
      .references(() => generations.id, { onDelete: 'cascade' }),

    // Тип события
    eventType: generationEventTypeEnum('event_type').notNull(),

    // Сырые данные события (webhook payload, API response, etc.)
    payload: jsonb('payload').$type<Record<string, unknown>>(),

    // Дополнительная информация
    message: text('message'),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    generationIdIdx: index('generation_events_generation_id_idx').on(table.generationId),
    eventTypeIdx: index('generation_events_event_type_idx').on(table.eventType),
    createdAtIdx: index('generation_events_created_at_idx').on(table.createdAt),
  })
);

// ============================================
// ТРАНЗАКЦИИ
// ============================================

/**
 * Финансовый журнал - все операции с кредитами
 */
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Тип и статус транзакции
    type: transactionTypeEnum('type').notNull(),
    status: transactionStatusEnum('status').default('SUCCEEDED').notNull(),

    // Изменение баланса токенов (+20 для deposit, -1 для spend)
    amount: integer('amount').notNull(),

    // Детали платежа (только для DEPOSIT)
    moneyAmount: integer('money_amount'), // Сумма в копейках
    providerPaymentId: text('provider_payment_id'), // ID платежа (YooKassa, etc.)

    // Связь с генерацией (для SPEND и REFUND)
    generationId: uuid('generation_id').references(() => generations.id, {
      onDelete: 'set null',
    }),

    // Описание и метаданные
    description: text('description'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('transactions_user_id_idx').on(table.userId),
    typeIdx: index('transactions_type_idx').on(table.type),
    statusIdx: index('transactions_status_idx').on(table.status),
    generationIdIdx: index('transactions_generation_id_idx').on(table.generationId),
    createdAtIdx: index('transactions_created_at_idx').on(table.createdAt),
  })
);

// ============================================
// RELATIONS (для Drizzle Queries)
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  assets: many(assets),
  generations: many(generations),
  transactions: many(transactions),
  planHistory: many(userPlanHistory),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  userPlanHistory: many(userPlanHistory),
}));

export const userPlanHistoryRelations = relations(userPlanHistory, ({ one }) => ({
  user: one(users, {
    fields: [userPlanHistory.userId],
    references: [users.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  user: one(users, {
    fields: [assets.userId],
    references: [users.id],
  }),
  generationAssets: many(generationAssets),
}));

export const generationsRelations = relations(generations, ({ one, many }) => ({
  user: one(users, {
    fields: [generations.userId],
    references: [users.id],
  }),
  generationAssets: many(generationAssets),
  events: many(generationEvents),
  transactions: many(transactions),
}));

export const generationAssetsRelations = relations(generationAssets, ({ one }) => ({
  generation: one(generations, {
    fields: [generationAssets.generationId],
    references: [generations.id],
  }),
  asset: one(assets, {
    fields: [generationAssets.assetId],
    references: [assets.id],
  }),
}));

export const generationEventsRelations = relations(generationEvents, ({ one }) => ({
  generation: one(generations, {
    fields: [generationEvents.generationId],
    references: [generations.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  generation: one(generations, {
    fields: [transactions.generationId],
    references: [generations.id],
  }),
}));

// ============================================
// TYPESCRIPT ТИПЫ
// ============================================

/**
 * Конфигурация фич тарифного плана
 */
export interface PlanFeatures {
  // Доступность функций
  allowVideo: boolean;
  allowCustomModel: boolean; // face-to-model
  allow4k: boolean;

  // Лимиты видео
  maxVideoResolution: '480p' | '720p' | '1080p' | null;
  maxVideoDuration: 5 | 10 | null; // секунды

  // Хранение
  // test/нет тарифа: 7, seller: 30, brand: 180
  resultRetentionDays: number | null; // null = бессрочно

  // Приоритет и параллельность
  priority: 'standard' | 'high' | 'highest';
  maxConcurrentGenerations: number;

  // Дополнительные ограничения
  artificialDelay: number; // мс задержки для бесплатных планов
}

/**
 * Метаданные ассета (зависят от типа)
 */
export interface AssetMeta {
  // Для изображений
  width?: number;
  height?: number;

  // Для видео
  duration?: number; // секунды
  fps?: number;

  // Для одежды
  detectedCategory?: string;

  // Для результатов генерации
  generationType?: string;
  modelUsed?: string;

  // Прочее
  [key: string]: unknown;
}

/**
 * Параметры генерации (специфичны для типа)
 * Храним как JSON для гибкости
 */
export interface GenerationParams {
  // Общие параметры
  mode?: 'performance' | 'balanced' | 'quality';
  seed?: number;
  numSamples?: number;

  // Для product-to-model
  category?: 'tops' | 'bottoms' | 'one-pieces' | 'auto';
  garmentPhotoType?: 'model' | 'flat-lay' | 'auto';
  aspectRatio?: string;
  resolution?: '1k' | '4k';
  useFaceReference?: boolean;

  // Для edit/reframe
  prompt?: string;

  // Для image-to-video
  videoDuration?: 5 | 10;
  videoResolution?: '480p' | '720p' | '1080p';

  // Для background-change
  backgroundPrompt?: string;

  // Legacy параметры (virtual-tryon)
  adjustHands?: boolean;
  coverFeet?: boolean;
  restoreBackground?: boolean;
  nsfwFilter?: boolean;
  moderationLevel?: 'conservative' | 'permissive' | 'none';

  // Прочее
  [key: string]: unknown;
}

// --- Типы таблиц ---

// Users
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Accounts
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

// Sessions
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// Verification Tokens
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

// Plans
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;

// User Plan History
export type UserPlanHistory = typeof userPlanHistory.$inferSelect;
export type NewUserPlanHistory = typeof userPlanHistory.$inferInsert;

// Assets
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

// Generations
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;

// Generation Assets
export type GenerationAsset = typeof generationAssets.$inferSelect;
export type NewGenerationAsset = typeof generationAssets.$inferInsert;

// Generation Events
export type GenerationEvent = typeof generationEvents.$inferSelect;
export type NewGenerationEvent = typeof generationEvents.$inferInsert;

// Transactions
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

// --- Вспомогательные типы для извлечения enum значений ---
export type PlanCode = typeof planCodeEnum.enumValues[number];
export type UserRole = typeof userRoleEnum.enumValues[number];
export type TransactionType = typeof transactionTypeEnum.enumValues[number];
export type TransactionStatus = typeof transactionStatusEnum.enumValues[number];
export type AssetType = typeof assetTypeEnum.enumValues[number];
export type MediaKind = typeof mediaKindEnum.enumValues[number];
export type AssetOrigin = typeof assetOriginEnum.enumValues[number];
export type GarmentPhotoType = typeof garmentPhotoTypeEnum.enumValues[number];
export type GarmentCategory = typeof garmentCategoryEnum.enumValues[number];
export type GenerationStatus = typeof generationStatusEnum.enumValues[number];
export type GenerationType = typeof generationTypeEnum.enumValues[number];
export type GenerationProvider = typeof generationProviderEnum.enumValues[number];
export type GenerationEventType = typeof generationEventTypeEnum.enumValues[number];
export type GenerationAssetDirection = typeof generationAssetDirectionEnum.enumValues[number];
export type GenerationAssetRole = typeof generationAssetRoleEnum.enumValues[number];
export type GenerationMode = typeof generationModeEnum.enumValues[number];
