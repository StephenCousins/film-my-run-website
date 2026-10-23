-- CreateTable
CREATE TABLE "site_events" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "detail" TEXT,
    "path" TEXT,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_events_name_created_at_idx" ON "site_events"("name", "created_at");

-- CreateIndex
CREATE INDEX "site_events_created_at_idx" ON "site_events"("created_at");
