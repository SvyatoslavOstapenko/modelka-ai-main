CREATE TYPE "public"."asset_origin" AS ENUM('uploaded', 'generated', 'fetched');--> statement-breakpoint
CREATE TYPE "public"."generation_asset_direction" AS ENUM('input', 'output');--> statement-breakpoint
CREATE TYPE "public"."generation_asset_role" AS ENUM('model_image', 'garment_image', 'face_image', 'product_image', 'source_image', 'background_image', 'reference_image', 'face_reference', 'output_image', 'output_video');--> statement-breakpoint
CREATE TYPE "public"."generation_event_type" AS ENUM('CREATED', 'REQUEST_SENT', 'QUEUED', 'PROCESSING', 'WEBHOOK_RECEIVED', 'STATUS_POLLED', 'RESULT_SAVED', 'COMPLETED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."generation_provider" AS ENUM('fashn', 'fal', 'internal');--> statement-breakpoint
CREATE TYPE "public"."generation_type" AS ENUM('product_to_model', 'face_to_model', 'model_create', 'model_variation', 'model_swap', 'edit', 'reframe', 'image_to_video', 'background_change', 'virtual_tryon');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."plan_code" AS ENUM('test', 'seller', 'brand');--> statement-breakpoint
ALTER TYPE "public"."asset_type" ADD VALUE 'uploaded_face';--> statement-breakpoint
ALTER TYPE "public"."asset_type" ADD VALUE 'uploaded_background';--> statement-breakpoint
ALTER TYPE "public"."asset_type" ADD VALUE 'uploaded_reference';--> statement-breakpoint
CREATE TABLE "generation_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"direction" "generation_asset_direction" NOT NULL,
	"role" "generation_asset_role" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"event_type" "generation_event_type" NOT NULL,
	"payload" jsonb,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "plan_code" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"features" jsonb NOT NULL,
	"price_credits" integer NOT NULL,
	"price_rub" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user_plan_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_plan_code" "plan_code",
	"to_plan_code" "plan_code" NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generations" DROP CONSTRAINT "generations_fashn_prediction_id_unique";--> statement-breakpoint
ALTER TABLE "generations" DROP CONSTRAINT "generations_model_asset_id_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "generations" DROP CONSTRAINT "generations_garment_asset_id_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "generations" DROP CONSTRAINT "generations_result_asset_id_assets_id_fk";
--> statement-breakpoint
DROP INDEX "generations_user_id_idx";--> statement-breakpoint
DROP INDEX "generations_fashn_prediction_id_idx";--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "media_kind" "media_kind" DEFAULT 'image' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "origin" "asset_origin" DEFAULT 'uploaded' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "meta" jsonb;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "temporary_until" timestamp;--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "type" "generation_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "provider" "generation_provider" DEFAULT 'fashn' NOT NULL;--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "provider_task_id" text;--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "params" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan_code" "plan_code" DEFAULT 'test' NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_assets" ADD CONSTRAINT "generation_assets_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_assets" ADD CONSTRAINT "generation_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_events" ADD CONSTRAINT "generation_events_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plan_history" ADD CONSTRAINT "user_plan_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generation_assets_gen_dir_idx" ON "generation_assets" USING btree ("generation_id","direction");--> statement-breakpoint
CREATE INDEX "generation_assets_asset_id_idx" ON "generation_assets" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_assets_unique_idx" ON "generation_assets" USING btree ("generation_id","asset_id","role");--> statement-breakpoint
CREATE INDEX "generation_events_generation_id_idx" ON "generation_events" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "generation_events_event_type_idx" ON "generation_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "generation_events_created_at_idx" ON "generation_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_code_idx" ON "plans" USING btree ("code");--> statement-breakpoint
CREATE INDEX "plans_sort_order_idx" ON "plans" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "user_plan_history_user_id_idx" ON "user_plan_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_plan_history_created_at_idx" ON "user_plan_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "assets_origin_media_idx" ON "assets" USING btree ("origin","media_kind");--> statement-breakpoint
CREATE INDEX "assets_expires_at_idx" ON "assets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "assets_temporary_until_idx" ON "assets" USING btree ("temporary_until");--> statement-breakpoint
CREATE INDEX "generations_user_id_created_at_idx" ON "generations" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "generations_provider_task_id_idx" ON "generations" USING btree ("provider_task_id");--> statement-breakpoint
CREATE INDEX "generations_type_idx" ON "generations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "generations_webhook_token_idx" ON "generations" USING btree ("webhook_token");--> statement-breakpoint
CREATE INDEX "users_plan_code_idx" ON "users" USING btree ("plan_code");--> statement-breakpoint
ALTER TABLE "generations" DROP COLUMN "fashn_prediction_id";--> statement-breakpoint
ALTER TABLE "generations" DROP COLUMN "model_asset_id";--> statement-breakpoint
ALTER TABLE "generations" DROP COLUMN "garment_asset_id";--> statement-breakpoint
ALTER TABLE "generations" DROP COLUMN "result_asset_id";--> statement-breakpoint
ALTER TABLE "generations" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "generations" DROP COLUMN "mode";--> statement-breakpoint
ALTER TABLE "generations" DROP COLUMN "adjust_hands";--> statement-breakpoint
ALTER TABLE "generations" DROP COLUMN "cover_feet";--> statement-breakpoint
ALTER TABLE "generations" DROP COLUMN "restore_background";--> statement-breakpoint
ALTER TABLE "generations" DROP COLUMN "nsfw_filter";--> statement-breakpoint
ALTER TABLE "generations" DROP COLUMN "seed";--> statement-breakpoint
ALTER TABLE "generations" DROP COLUMN "num_samples";--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_provider_task_id_unique" UNIQUE("provider_task_id");