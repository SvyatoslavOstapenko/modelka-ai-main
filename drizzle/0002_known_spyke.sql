-- Step 1: Delete uploaded assets before enum migration
DELETE FROM "generation_assets" WHERE "direction" = 'input';--> statement-breakpoint
DELETE FROM "assets"
WHERE "origin" = 'uploaded'
   OR "type" IN ('uploaded_model', 'uploaded_garment', 'uploaded_face',
                 'uploaded_background', 'uploaded_reference');--> statement-breakpoint

-- Step 2: Create result_type enum
CREATE TYPE "public"."result_type" AS ENUM('model', 'product');--> statement-breakpoint

-- Step 3: Migrate asset_origin enum (remove 'uploaded')
ALTER TABLE "assets" ALTER COLUMN "origin" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "origin" SET DEFAULT 'generated'::text;--> statement-breakpoint
DROP TYPE "public"."asset_origin";--> statement-breakpoint
CREATE TYPE "public"."asset_origin" AS ENUM('generated', 'fetched');--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "origin" SET DEFAULT 'generated'::"public"."asset_origin";--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "origin" SET DATA TYPE "public"."asset_origin" USING "origin"::"public"."asset_origin";--> statement-breakpoint

-- Step 4: Migrate asset_type enum (remove uploaded types)
ALTER TABLE "assets" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."asset_type";--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('generated_result');--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "type" SET DATA TYPE "public"."asset_type" USING "type"::"public"."asset_type";--> statement-breakpoint
DROP INDEX "assets_temporary_until_idx";--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "result_type" "result_type";--> statement-breakpoint
CREATE INDEX "assets_result_type_idx" ON "assets" USING btree ("result_type");--> statement-breakpoint
ALTER TABLE "assets" DROP COLUMN "garment_category";--> statement-breakpoint
ALTER TABLE "assets" DROP COLUMN "garment_photo_type";--> statement-breakpoint
ALTER TABLE "assets" DROP COLUMN "temporary_until";