# Руководство по созданию страниц генерации

## 📋 Обзор

Это руководство описывает:
1. Как устроена страница Product-to-Model (эталонная реализация)
2. Как использовать Server Actions для генерации
3. Как переиспользовать компоненты для других типов генерации

## 🎯 Архитектура Product-to-Model

### Компоненты страницы

```
/app/generate/product-to-model/
└── page.tsx                              # Server Component (получает данные)
    └── <SingleUploaderWorkspace />       # Client Component (UI и логика)
        ├── <ProductImageUploader />      # Загрузка товара
        ├── <ModelImageUploader />        # Загрузка модели (опционально)
        ├── <GenerationCommandBar />      # Панель управления (desktop)
        ├── Mobile Settings Sheet         # Панель настроек (mobile)
        └── Dialogs                       # Диалоговые окна
```

### Поток генерации

```typescript
1. Загрузка изображения
   ProductImageUploader → useAssetUpload → S3 → s3Key

2. Настройка параметров
   - Соотношение сторон (aspectRatio)
   - Разрешение (resolution: 1K/4K)
   - Количество вариантов (numVariants)
   - Опциональные параметры (model, face, background)

3. Генерация
   handleGenerate() → generateProductToModelAction(payload)

4. Polling статуса
   setInterval → checkProductToModelStatusAction(taskId)

5. Отображение результата
   GenerationResultCarousel / GenerationErrorState
```

## 🔧 Использование Server Actions

### 1. Структура Server Action

**Файл:** `/src/app/actions/product-to-model.ts`

```typescript
'use server';

import { auth } from '@/lib/auth';
import { createGenerationAtomic, submitToFashn } from '@/services/generationService';

export async function generateProductToModel(input: ProductToModelInput): Promise<GenerateResult> {
  // 1. Аутентификация
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, errorCode: 'UNAUTHORIZED' };
  }

  // 2. Проверка прав доступа (опционально)
  const { valid, errorCode } = await validatePlan(session.user.id, 'product_to_model', input);
  if (!valid) {
    return { success: false, errorCode, message: 'Недостаточно прав' };
  }

  // 3. Создание записи в БД + списание кредитов (атомарно)
  const generation = await createGenerationAtomic({
    userId: session.user.id,
    type: 'product_to_model',
    inputParams: input,
    costInCredits: calculateCost(input)
  });

  if (!generation) {
    return { success: false, errorCode: 'INSUFFICIENT_CREDITS' };
  }

  // 4. Отправка в Fashn.ai
  const taskId = await submitToFashn(generation.id, input);

  return {
    success: true,
    taskId,
    generationId: generation.id
  };
}

export async function checkProductToModelStatus(providerTaskId: string): Promise<CheckStatusResult> {
  // Проверка статуса в БД (обновляется через webhook)
  const generation = await db.query.generations.findFirst({
    where: eq(generations.providerTaskId, providerTaskId)
  });

  if (!generation) {
    return { success: false, errorCode: 'NOT_FOUND' };
  }

  return {
    success: true,
    status: generation.status,
    output: generation.outputUrls,
    errorCode: generation.errorCode
  };
}
```

### 2. Экспорт в `/src/app/actions/generate.ts`

```typescript
'use server';

import {
  generateProductToModel,
  checkProductToModelStatus
} from './product-to-model';

// Экспортируем с суффиксом Action для ясности
export async function generateProductToModelAction(input: ProductToModelInput) {
  return generateProductToModel(input);
}

export async function checkProductToModelStatusAction(taskId: string) {
  return checkProductToModelStatus(taskId);
}

// TODO: Другие типы генерации
// export async function generateTryOnAction(...) { ... }
// export async function generateFaceToModelAction(...) { ... }
```

### 3. Использование в компоненте

```typescript
'use client';

export function SingleUploaderWorkspace({ userCredits, userPlan }: Props) {
  const handleGenerate = useCallback(async () => {
    // 1. Подготовка payload
    const payload = {
      product_image: productImageUrl,
      aspect_ratio: aspectRatio,
      resolution: resolution === '1K' ? '1k' : '4k',
      num_images: numVariants,
      // Опциональные параметры
      ...(modelImageUrl && { model_image: modelImageUrl }),
      ...(description && { prompt: description })
    };

    // 2. Вызов Server Action
    const { generateProductToModelAction, checkProductToModelStatusAction } =
      await import('@/app/actions/generate');

    const result = await generateProductToModelAction(payload);

    if (!result.success) {
      setError(result.errorCode);
      return;
    }

    // 3. Polling статуса
    const pollInterval = setInterval(async () => {
      const statusResult = await checkProductToModelStatusAction(result.taskId);

      if (statusResult.status === 'COMPLETED') {
        clearInterval(pollInterval);
        setResultImages(statusResult.output);
      }
    }, 3000);
  }, [productImage, aspectRatio, resolution, numVariants]);
}
```

## 🧩 Переиспользуемые компоненты

### 1. ProductImageUploader

**Назначение:** Загрузка изображения товара с drag & drop и S3.

**Использование:**
```typescript
import { ProductImageUploader } from '@/components/product-to-model/uploaders';
import { useAssetUpload } from '@/hooks/use-asset-upload';

function MyComponent() {
  const { uploadAsset } = useAssetUpload();
  const [productImage, setProductImage] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  return (
    <ProductImageUploader
      productImage={productImage}
      setProductImage={setProductImage}
      isUploading={isUploading}
      setIsUploading={setIsUploading}
      uploadAsset={uploadAsset}
      disabled={false}
    />
  );
}
```

**Когда использовать:** Для всех типов генерации, где нужно загрузить товар.

### 2. SettingsPopovers

**Назначение:** Поповеры для настройки соотношения сторон, разрешения и количества.

**Использование:**
```typescript
import { SettingsPopovers } from '@/components/product-to-model/controls';

<SettingsPopovers
  aspectRatio={aspectRatio}
  setAspectRatio={setAspectRatio}
  isRatioOpen={isRatioOpen}
  setIsRatioOpen={setIsRatioOpen}
  // ... остальные пропсы
  hasSellerAccess={hasSellerAccess}
/>
```

**Когда использовать:** Для генераций с настройкой формата (Product-to-Model, Edit, Background Change).

### 3. GenerationCommandBar

**Назначение:** Полная панель управления для десктопа.

**Использование:**
```typescript
import { GenerationCommandBar } from '@/components/product-to-model/controls';

<GenerationCommandBar
  description={description}
  setDescription={setDescription}
  // Все настройки...
  canGenerate={canGenerate}
  onGenerate={handleGenerate}
/>
```

**Когда использовать:** Когда нужна стандартная панель с описанием и настройками.

### 4. Общие типы и константы

```typescript
import {
  GenerationStatus,
  UploadedFile,
  ASPECT_RATIOS,
  RESOLUTIONS
} from '@/components/product-to-model/shared';

// Типы
const [status, setStatus] = useState<GenerationStatus>('idle');
const [file, setFile] = useState<UploadedFile | null>(null);

// Константы
<select>
  {ASPECT_RATIOS.map(ratio => (
    <option key={ratio} value={ratio}>{ratio}</option>
  ))}
</select>
```

## 🎨 Создание новой страницы генерации

### Пример: Virtual Try-On

#### Шаг 1: Создать Server Action

**Файл:** `/src/app/actions/try-on.ts`

```typescript
'use server';

import { auth } from '@/lib/auth';
import { createGenerationAtomic, submitToFashn } from '@/services/generationService';

export interface TryOnInput {
  garment_image: string;
  model_image: string;
  category: 'tops' | 'bottoms' | 'one-pieces';
}

export async function generateTryOn(input: TryOnInput): Promise<GenerateResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, errorCode: 'UNAUTHORIZED' };
  }

  const generation = await createGenerationAtomic({
    userId: session.user.id,
    type: 'virtual_tryon',
    inputParams: input,
    costInCredits: 1 // Try-On стоит 1 кредит
  });

  if (!generation) {
    return { success: false, errorCode: 'INSUFFICIENT_CREDITS' };
  }

  const taskId = await submitToFashn(generation.id, input, 'try-on');

  return { success: true, taskId, generationId: generation.id };
}

export async function checkTryOnStatus(providerTaskId: string): Promise<CheckStatusResult> {
  // Аналогично checkProductToModelStatus
}
```

#### Шаг 2: Экспортировать в `generate.ts`

```typescript
// /src/app/actions/generate.ts
import { generateTryOn, checkTryOnStatus } from './try-on';

export async function generateTryOnAction(input: TryOnInput) {
  return generateTryOn(input);
}

export async function checkTryOnStatusAction(taskId: string) {
  return checkTryOnStatus(taskId);
}
```

#### Шаг 3: Создать компонент workspace

**Файл:** `/src/app/app/generate/try-on/TryOnWorkspace.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { ProductImageUploader } from '@/components/product-to-model/uploaders';
import { useAssetUpload } from '@/hooks/use-asset-upload';
import { GenerationStatus } from '@/components/product-to-model/shared';

export function TryOnWorkspace({ userCredits }: { userCredits: number }) {
  const { uploadAsset } = useAssetUpload();

  // State для товара
  const [garmentImage, setGarmentImage] = useState<UploadedFile | null>(null);
  const [isUploadingGarment, setIsUploadingGarment] = useState(false);

  // State для модели
  const [modelImage, setModelImage] = useState<UploadedFile | null>(null);
  const [isUploadingModel, setIsUploadingModel] = useState(false);

  // State для генерации
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [category, setCategory] = useState<'tops' | 'bottoms'>('tops');
  const [resultImages, setResultImages] = useState<string[]>([]);

  const handleGenerate = useCallback(async () => {
    if (!garmentImage?.s3Key || !modelImage?.s3Key) return;

    setStatus('processing');

    const { generateTryOnAction, checkTryOnStatusAction } =
      await import('@/app/actions/generate');

    const payload = {
      garment_image: getPublicUrl(garmentImage.s3Key),
      model_image: getPublicUrl(modelImage.s3Key),
      category
    };

    const result = await generateTryOnAction(payload);

    if (!result.success) {
      setStatus('error');
      return;
    }

    // Polling
    const pollInterval = setInterval(async () => {
      const statusResult = await checkTryOnStatusAction(result.taskId);

      if (statusResult.status === 'COMPLETED') {
        clearInterval(pollInterval);
        setStatus('success');
        setResultImages(statusResult.output || []);
      } else if (statusResult.status === 'FAILED') {
        clearInterval(pollInterval);
        setStatus('error');
      }
    }, 3000);
  }, [garmentImage, modelImage, category]);

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Загрузка товара - переиспользуем компонент */}
      <ProductImageUploader
        productImage={garmentImage}
        setProductImage={setGarmentImage}
        isUploading={isUploadingGarment}
        setIsUploading={setIsUploadingGarment}
        uploadAsset={uploadAsset}
      />

      {/* Загрузка модели - тоже переиспользуем */}
      <ProductImageUploader
        productImage={modelImage}
        setProductImage={setModelImage}
        isUploading={isUploadingModel}
        setIsUploading={setIsUploadingModel}
        uploadAsset={uploadAsset}
      />

      {/* Кнопка генерации */}
      <button onClick={handleGenerate} disabled={status === 'processing'}>
        Примерить ({userCredits} кредитов)
      </button>

      {/* Результаты */}
      {status === 'success' && <ResultDisplay images={resultImages} />}
    </div>
  );
}
```

#### Шаг 4: Создать страницу

**Файл:** `/src/app/app/generate/try-on/page.tsx`

```typescript
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { TryOnWorkspace } from './TryOnWorkspace';

export default async function TryOnPage() {
  const session = await auth();
  const user = await db.query.users.findFirst({
    where: eq(users.id, session!.user!.id)
  });

  return (
    <TryOnWorkspace
      userCredits={user!.credits}
      userPlan={user!.planCode}
    />
  );
}
```

## 📊 Сравнение типов генерации

| Тип | Кредиты | Обязательные входы | Опциональные входы |
|-----|---------|-------------------|-------------------|
| Product-to-Model | 1 (4 с face) | product_image | model, face, background, prompt |
| Try-On | 1 | garment, model | category |
| Face-to-Model | 4 | face_image | prompt, gender |
| Model Create | 4 | - | prompt, gender, age |
| Background Change | 1 | image | background_prompt |
| Edit | 1 | image | edit_prompt, mask |
| Video | 5 | image | duration, resolution |

## ✅ Чеклист для новой генерации

- [ ] Создать Server Action в `/src/app/actions/[type].ts`
- [ ] Определить интерфейс Input и типы
- [ ] Реализовать логику проверки кредитов
- [ ] Добавить экспорты в `/src/app/actions/generate.ts`
- [ ] Создать компонент Workspace
- [ ] Переиспользовать существующие компоненты загрузки
- [ ] Реализовать polling статуса
- [ ] Добавить обработку ошибок
- [ ] Создать страницу в `/src/app/app/generate/[type]/page.tsx`
- [ ] Добавить route в навигацию
- [ ] Написать тесты (опционально)

## 🎯 Best Practices

### 1. Валидация на клиенте и сервере

```typescript
// Клиент
if (!productImage?.s3Key) {
  toast.error('Загрузите изображение товара');
  return;
}

// Сервер
export async function generateProductToModel(input: ProductToModelInput) {
  if (!input.product_image) {
    return { success: false, errorCode: 'VALIDATION_ERROR' };
  }
  // ...
}
```

### 2. Проверка кредитов перед отправкой

```typescript
// Локальная проверка (быстрая обратная связь)
if (userCredits < requiredCredits) {
  toast.error('Недостаточно кредитов');
  onTopUp?.();
  return;
}

// Server Action делает повторную проверку (защита от race conditions)
```

### 3. Атомарные транзакции

```typescript
// createGenerationAtomic делает все в одной транзакции:
// 1. Создание записи generation
// 2. Списание кредитов
// 3. Создание asset записей для входных файлов

// Если что-то фейлится - откат всей транзакции
```

### 4. Обработка ошибок

```typescript
try {
  const result = await generateAction(payload);
  if (!result.success) {
    // Показываем понятную ошибку пользователю
    const errorMessage = translateError(result.errorCode);
    setError(errorMessage);
  }
} catch (error) {
  // Unexpected errors
  console.error('Generation failed:', error);
  setError('Произошла неожиданная ошибка');
}
```

### 5. Очистка интервалов

```typescript
useEffect(() => {
  let pollInterval: NodeJS.Timeout;

  if (taskId) {
    pollInterval = setInterval(async () => {
      await checkStatus();
    }, 3000);
  }

  // Cleanup при unmount
  return () => {
    if (pollInterval) clearInterval(pollInterval);
  };
}, [taskId]);
```

## 🔍 Дебаггинг

### Логирование Server Actions

```typescript
export async function generateProductToModel(input: ProductToModelInput) {
  console.log('[generateProductToModel] Input:', input);

  const result = await createGenerationAtomic(...);
  console.log('[generateProductToModel] Generation created:', result.id);

  return { success: true, ... };
}
```

### Проверка статуса генерации

```bash
# В Drizzle Studio или psql
SELECT id, status, "providerTaskId", "errorCode", "createdAt"
FROM generations
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Тестирование webhook

```bash
# Симуляция webhook от Fashn.ai
curl -X POST http://localhost:3000/api/webhooks/fashn \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task_123",
    "status": "COMPLETED",
    "output": ["https://fashn.ai/result.png"]
  }'
```

## 📚 Дополнительные ресурсы

- [Fashn.ai API Docs](https://docs.fashn.ai)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Drizzle ORM](https://orm.drizzle.team)
- [shadcn/ui](https://ui.shadcn.com)
