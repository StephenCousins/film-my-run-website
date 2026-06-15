-- CreateTable
CREATE TABLE "shoes" (
    "id" SERIAL NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "terrain" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "drop_mm" INTEGER,
    "weight_g" INTEGER,
    "stack_height_mm" INTEGER,
    "price_gbp" INTEGER,
    "release_year" INTEGER,
    "description" TEXT,
    "image_url" TEXT,
    "buy_url" TEXT,
    "avg_score" DECIMAL(4,2),
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "last_reviewed" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shoe_reviews" (
    "id" SERIAL NOT NULL,
    "shoe_id" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "source_url" TEXT,
    "expert_score" DECIMAL(4,2),
    "user_score" DECIMAL(4,2),
    "user_count" INTEGER,
    "summary" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shoe_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shoes_slug_key" ON "shoes"("slug");

-- CreateIndex
CREATE INDEX "shoes_terrain_idx" ON "shoes"("terrain");

-- CreateIndex
CREATE INDEX "shoes_brand_idx" ON "shoes"("brand");

-- CreateIndex
CREATE INDEX "shoes_avg_score_idx" ON "shoes"("avg_score");

-- CreateIndex
CREATE INDEX "shoes_category_idx" ON "shoes"("category");

-- CreateIndex
CREATE UNIQUE INDEX "shoe_reviews_shoe_id_source_key" ON "shoe_reviews"("shoe_id", "source");

-- CreateIndex
CREATE INDEX "shoe_reviews_shoe_id_idx" ON "shoe_reviews"("shoe_id");

-- AddForeignKey
ALTER TABLE "shoe_reviews" ADD CONSTRAINT "shoe_reviews_shoe_id_fkey" FOREIGN KEY ("shoe_id") REFERENCES "shoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
