-- CreateTable
CREATE TABLE "newsletter_content_pool" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "citation" TEXT,
    "last_used_at" TIMESTAMP(3),
    "times_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_content_pool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "newsletter_content_pool_category_idx" ON "newsletter_content_pool"("category");

-- CreateIndex
CREATE INDEX "newsletter_content_pool_category_last_used_at_idx" ON "newsletter_content_pool"("category", "last_used_at");
