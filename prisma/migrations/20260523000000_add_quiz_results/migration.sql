-- CreateTable
CREATE TABLE "quiz_results" (
    "id" SERIAL NOT NULL,
    "tribe" TEXT NOT NULL,
    "surface_l" DOUBLE PRECISION NOT NULL,
    "method_l" DOUBLE PRECISION NOT NULL,
    "distance_l" DOUBLE PRECISION NOT NULL,
    "spirit_l" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quiz_results_tribe_idx" ON "quiz_results"("tribe");

-- CreateIndex
CREATE INDEX "quiz_results_created_at_idx" ON "quiz_results"("created_at");
