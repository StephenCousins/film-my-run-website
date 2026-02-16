-- AlterTable
ALTER TABLE "parkrun_athletes" ADD COLUMN     "results_scraped_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "parkrun_results" (
    "id" SERIAL NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "run_date" TEXT NOT NULL,
    "run_date_parsed" TIMESTAMP(3),
    "run_number" TEXT,
    "position" TEXT,
    "time_seconds" INTEGER NOT NULL,
    "time_display" TEXT NOT NULL,
    "age_grade" TEXT,
    "pb" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parkrun_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper_alerts" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "html_snippet" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scraper_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parkrun_results_athlete_id_idx" ON "parkrun_results"("athlete_id");

-- CreateIndex
CREATE INDEX "parkrun_results_athlete_id_run_date_parsed_idx" ON "parkrun_results"("athlete_id", "run_date_parsed");

-- CreateIndex
CREATE UNIQUE INDEX "parkrun_results_athlete_id_event_run_date_key" ON "parkrun_results"("athlete_id", "event", "run_date");

-- CreateIndex
CREATE INDEX "scraper_alerts_source_resolved_idx" ON "scraper_alerts"("source", "resolved");

-- CreateIndex
CREATE INDEX "scraper_alerts_created_at_idx" ON "scraper_alerts"("created_at");

-- AddForeignKey
ALTER TABLE "parkrun_results" ADD CONSTRAINT "parkrun_results_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "parkrun_athletes"("athlete_id") ON DELETE CASCADE ON UPDATE CASCADE;
