-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccessTier" AS ENUM ('FREE', 'PREMIUM', 'PRO');

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" SERIAL NOT NULL,
    "guid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "pub_date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "age_grading_factors" (
    "id" SERIAL NOT NULL,
    "gender" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "open_record" DECIMAL(10,4) NOT NULL,
    "age" INTEGER NOT NULL,
    "factor" DECIMAL(6,4) NOT NULL,

    CONSTRAINT "age_grading_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_lookups" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "athlete_name" TEXT,
    "lookup_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,

    CONSTRAINT "athlete_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "films" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "youtube_id" TEXT,
    "vimeo_id" TEXT,
    "thumbnail_url" TEXT,
    "duration_seconds" INTEGER,
    "year" INTEGER,
    "awards" TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "films_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt_text" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "post_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "stripe_session_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "shipping_address" JSONB,
    "items" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parkrun_athletes" (
    "id" SERIAL NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "total_runs" INTEGER NOT NULL,
    "best_time_seconds" INTEGER,
    "average_time_seconds" INTEGER,
    "typical_avg_seconds" INTEGER,
    "recent_avg_seconds" INTEGER,
    "avg_age_grade" DECIMAL(5,2),
    "recent_avg_age_grade" DECIMAL(5,2),
    "pb_date" TEXT,
    "pb_event" TEXT,
    "pb_age" TEXT,
    "trend" TEXT,
    "trend_message" TEXT,
    "outlier_count" INTEGER NOT NULL DEFAULT 0,
    "normal_run_count" INTEGER NOT NULL DEFAULT 0,
    "recent_results_json" JSONB,
    "lookup_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_lookup_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parkrun_athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "po10_athletes" (
    "id" SERIAL NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "club" TEXT,
    "gender" TEXT,
    "age_group" TEXT,
    "pbs_json" JSONB,
    "overall_percentile" DECIMAL(5,2),
    "overall_age_grade" DECIMAL(5,2),
    "overall_ability_level" TEXT,
    "lookup_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_lookup_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "po10_athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_terms" (
    "post_id" INTEGER NOT NULL,
    "term_id" INTEGER NOT NULL,

    CONSTRAINT "post_terms_pkey" PRIMARY KEY ("post_id","term_id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "wp_id" INTEGER,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "featured_image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "post_type" TEXT NOT NULL DEFAULT 'post',
    "read_time" INTEGER NOT NULL DEFAULT 5,
    "author_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price_cents" INTEGER NOT NULL,
    "compare_price_cents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "images" TEXT[],
    "category" TEXT,
    "inventory_count" INTEGER NOT NULL DEFAULT 0,
    "is_digital" BOOLEAN NOT NULL DEFAULT false,
    "stripe_price_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "races" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "event" TEXT NOT NULL,
    "type" TEXT,
    "distance_km" DECIMAL(10,3),
    "time_hms" TEXT,
    "time_seconds" INTEGER,
    "elevation" INTEGER,
    "position" TEXT,
    "terrain" TEXT,
    "video_url" TEXT,
    "strava_url" TEXT,
    "results_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "races_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_routes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "route_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "terms" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "taxonomy" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT,
    "stripe_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "access_tier" "AccessTier" NOT NULL DEFAULT 'FREE',
    "email_verified_at" TIMESTAMP(3),
    "image" TEXT,
    "subscription_end" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "page_views" (
    "id" SERIAL NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "user_agent" TEXT,
    "session_id" TEXT,
    "browser" TEXT,
    "device" TEXT,
    "os" TEXT,
    "country" TEXT,
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click_events" (
    "id" SERIAL NOT NULL,
    "element_id" TEXT NOT NULL,
    "element_text" TEXT,
    "target_url" TEXT,
    "path" TEXT NOT NULL,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "click_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "articles_guid_key" ON "articles"("guid");

-- CreateIndex
CREATE INDEX "articles_pub_date_idx" ON "articles"("pub_date");

-- CreateIndex
CREATE INDEX "articles_source_idx" ON "articles"("source");

-- CreateIndex
CREATE INDEX "age_grading_factors_gender_event_idx" ON "age_grading_factors"("gender", "event");

-- CreateIndex
CREATE UNIQUE INDEX "age_grading_factors_gender_event_age_key" ON "age_grading_factors"("gender", "event", "age");

-- CreateIndex
CREATE INDEX "athlete_lookups_lookup_at_idx" ON "athlete_lookups"("lookup_at");

-- CreateIndex
CREATE INDEX "athlete_lookups_source_athlete_id_idx" ON "athlete_lookups"("source", "athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "films_slug_key" ON "films"("slug");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "parkrun_athletes_athlete_id_key" ON "parkrun_athletes"("athlete_id");

-- CreateIndex
CREATE INDEX "parkrun_athletes_athlete_id_idx" ON "parkrun_athletes"("athlete_id");

-- CreateIndex
CREATE INDEX "parkrun_athletes_last_lookup_at_idx" ON "parkrun_athletes"("last_lookup_at");

-- CreateIndex
CREATE UNIQUE INDEX "po10_athletes_athlete_id_key" ON "po10_athletes"("athlete_id");

-- CreateIndex
CREATE INDEX "po10_athletes_athlete_id_idx" ON "po10_athletes"("athlete_id");

-- CreateIndex
CREATE INDEX "po10_athletes_last_lookup_at_idx" ON "po10_athletes"("last_lookup_at");

-- CreateIndex
CREATE UNIQUE INDEX "posts_wp_id_key" ON "posts"("wp_id");

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at");

-- CreateIndex
CREATE INDEX "posts_status_post_type_idx" ON "posts"("status", "post_type");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "races_date_idx" ON "races"("date");

-- CreateIndex
CREATE INDEX "races_type_idx" ON "races"("type");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "terms_slug_key" ON "terms"("slug");

-- CreateIndex
CREATE INDEX "terms_taxonomy_idx" ON "terms"("taxonomy");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "page_views_path_idx" ON "page_views"("path");

-- CreateIndex
CREATE INDEX "page_views_created_at_idx" ON "page_views"("created_at");

-- CreateIndex
CREATE INDEX "page_views_session_id_idx" ON "page_views"("session_id");

-- CreateIndex
CREATE INDEX "page_views_device_idx" ON "page_views"("device");

-- CreateIndex
CREATE INDEX "page_views_country_idx" ON "page_views"("country");

-- CreateIndex
CREATE INDEX "click_events_element_id_idx" ON "click_events"("element_id");

-- CreateIndex
CREATE INDEX "click_events_created_at_idx" ON "click_events"("created_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_terms" ADD CONSTRAINT "post_terms_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_terms" ADD CONSTRAINT "post_terms_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_routes" ADD CONSTRAINT "saved_routes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

