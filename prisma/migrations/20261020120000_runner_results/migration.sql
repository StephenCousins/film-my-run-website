-- Every UTMB finish per runner (the full race history on the page). Additive, one column with a default.
ALTER TABLE "runners" ADD COLUMN "results" JSONB NOT NULL DEFAULT '[]';
