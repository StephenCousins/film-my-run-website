-- Personal bests per runner, read from the Wikipedia article the page cites. Additive, one column with a default.
ALTER TABLE "runners" ADD COLUMN "personal_bests" JSONB NOT NULL DEFAULT '[]';
