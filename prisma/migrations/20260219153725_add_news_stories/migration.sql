-- CreateTable
CREATE TABLE "news_stories" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "source_url" TEXT NOT NULL,
    "source_heading" TEXT NOT NULL,
    "roundup_date" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_stories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_stories_slug_key" ON "news_stories"("slug");

-- CreateIndex
CREATE INDEX "news_stories_status_roundup_date_idx" ON "news_stories"("status", "roundup_date");

-- CreateIndex
CREATE INDEX "news_stories_slug_idx" ON "news_stories"("slug");

-- CreateIndex
CREATE INDEX "news_stories_roundup_date_idx" ON "news_stories"("roundup_date");
