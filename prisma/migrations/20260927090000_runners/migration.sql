CREATE TABLE "runners" (
  "id" SERIAL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "nationality" TEXT,
  "sex" TEXT,
  "birth_year" INTEGER,
  "disciplines" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "era" TEXT NOT NULL DEFAULT 'current',
  "bio" TEXT NOT NULL DEFAULT '',
  "best_finishes" JSONB NOT NULL DEFAULT '[]',
  "sources" JSONB NOT NULL DEFAULT '[]',
  "photos" JSONB NOT NULL DEFAULT '[]',
  "utmb_id" INTEGER,
  "utmb_uri" TEXT,
  "utmb_index" INTEGER,
  "utmb_index_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'draft',
  "written_by" TEXT NOT NULL DEFAULT 'session',
  "bio_checked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "runners_slug_key" ON "runners"("slug");
CREATE UNIQUE INDEX "runners_utmb_id_key" ON "runners"("utmb_id");
CREATE INDEX "runners_status_idx" ON "runners"("status");
