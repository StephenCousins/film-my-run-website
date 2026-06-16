-- CreateTable
CREATE TABLE "shoe_user_ratings" (
    "id" SERIAL NOT NULL,
    "shoe_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "score" DECIMAL(3,1) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shoe_user_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shoe_user_ratings_shoe_id_idx" ON "shoe_user_ratings"("shoe_id");

-- CreateIndex
CREATE INDEX "shoe_user_ratings_user_id_idx" ON "shoe_user_ratings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "shoe_user_ratings_shoe_id_user_id_key" ON "shoe_user_ratings"("shoe_id", "user_id");

-- AddForeignKey
ALTER TABLE "shoe_user_ratings" ADD CONSTRAINT "shoe_user_ratings_shoe_id_fkey" FOREIGN KEY ("shoe_id") REFERENCES "shoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shoe_user_ratings" ADD CONSTRAINT "shoe_user_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
