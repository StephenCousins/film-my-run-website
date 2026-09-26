ALTER TABLE "news_stories" ALTER COLUMN "source_heading" DROP NOT NULL;
ALTER TABLE "news_stories" ALTER COLUMN "roundup_date" DROP NOT NULL;
ALTER TABLE "news_stories" ADD COLUMN "topic" TEXT;
ALTER TABLE "news_stories" ADD COLUMN "is_uk" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "news_stories" ADD COLUMN "importance" INTEGER;
ALTER TABLE "news_stories" ADD COLUMN "sources" JSONB;
ALTER TABLE "news_stories" ADD COLUMN "photo_credit" TEXT;
ALTER TABLE "news_stories" ADD COLUMN "held_reason" TEXT;

CREATE TABLE "news_items" (
  "id" SERIAL PRIMARY KEY,
  "article_id" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "verdict" JSONB,
  "bundle_key" TEXT,
  "story_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "news_items_article_id_key" ON "news_items"("article_id");
CREATE INDEX "news_items_bundle_key_idx" ON "news_items"("bundle_key");

CREATE TABLE "news_runs" (
  "id" SERIAL PRIMARY KEY,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dry_run" BOOLEAN NOT NULL,
  "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "summary" JSONB NOT NULL
);
