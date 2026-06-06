# Migration TODO - Breaking Changes

## ⚠️ ВАЖНО: API изменился!

Все endpoints генерации теперь работают с `s3Key` вместо `assetId`.

## Файлы требующие обновления:

### 1. API Endpoints (src/app/api/generate/*)
Все endpoints используют старый `AssetIdSchema` и `AssetInput`:

- [x] ~~`_shared/handler.ts`~~ - уже обновлён
- [x] ~~`product-to-model/route.ts`~~ - обновлён
- [x] ~~`face-to-model/route.ts`~~ - обновлён
- [x] ~~`model-create/route.ts`~~ - обновлён
- [x] ~~`model-variation/route.ts`~~ - обновлён
- [x] ~~`model-swap/route.ts`~~ - обновлён
- [x] ~~`edit/route.ts`~~ - обновлён
- [x] ~~`reframe/route.ts`~~ - обновлён
- [x] ~~`image-to-video/route.ts`~~ - обновлён
- [x] ~~`background-change/route.ts`~~ - обновлён
- [x] ~~`try-on/route.ts`~~ - обновлён

### 2. Actions (src/app/actions/)

- [x] ~~`assets.ts`~~ - обновлён, только generated_result
- [x] ~~`try-on.ts`~~ - обновлён на s3Key

### 3. Upload API

- [x] ~~`src/app/api/assets/upload/route.ts`~~ - обновлён, только presigned URL

### 4. Cleanup Cron

- [x] ~~`src/app/api/cron/cleanup/route.ts`~~ - обновлён

### 5. Frontend Components

#### Upload Components (КРИТИЧНО):
- [ ] `src/components/upload/smart-uploader.tsx` - НЕ должен создавать assets в БД
  - Убрать вызов `createAssetAction()`
  - Использовать только `s3Key` из upload API
  - Передавать `s3Key` в callback вместо `assetId`

#### Generation Forms:
- [ ] `src/components/product-to-model/single-uploader-workspace.tsx` - работает с assetId, нужно переделать на s3Key
- [ ] Все формы генерации должны отправлять `{modelS3Key, garmentS3Key, mimeType}` вместо `{modelAssetId, garmentAssetId}`

#### Gallery & Profile:
- [ ] `src/app/app/gallery/page.tsx` - использует старые поля `gen.outputs`, `gen.parameters`
- [ ] `src/app/app/profile/page.tsx` - неправильный запрос к БД

### 6. Tests
- [ ] `src/services/__tests__/generationIntegration.test.ts` - использует старый API с assetId

## Порядок миграции:

1. **Применить миграцию БД:**
   ```bash
   npm run db:migrate
   # Применится: src/db/migrations/0001_remove_uploaded_assets.sql
   ```

2. **Обновить все API endpoints** чтобы использовать новый handler

3. **Обновить actions** чтобы не создавать uploaded assets

4. **Обновить upload API** чтобы только генерировать presigned URLs

5. **Обновить frontend** для работы с новым API

6. **Удалить deprecated код**

## Примеры новых схем:

### Старый подход (deprecated):
```typescript
const RequestSchema = z.object({
  modelAssetId: AssetIdSchema,
  garmentAssetId: AssetIdSchema,
});

extractInputs: (data) => [
  { assetId: data.modelAssetId, role: 'model_image' },
  { assetId: data.garmentAssetId, role: 'garment_image' },
]
```

### Новый подход:
```typescript
const RequestSchema = z.object({
  modelS3Key: S3KeySchema,
  garmentS3Key: S3KeySchema,
  modelMimeType: MimeTypeSchema,
  garmentMimeType: MimeTypeSchema,
});

extractInputs: (data) => [
  { s3Key: data.modelS3Key, role: 'model_image', mimeType: data.modelMimeType },
  { s3Key: data.garmentS3Key, role: 'garment_image', mimeType: data.garmentMimeType },
]
```

## Безопасность

Все s3Key валидируются на:
- Префикс `tmp/{userId}/`
- Отсутствие path traversal (`../`)
- Валидные расширения (.jpg, .jpeg, .png, .webp)

Backend самостоятельно генерирует presigned URLs для FASHN API.
