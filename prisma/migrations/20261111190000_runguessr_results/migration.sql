-- RunGuessr results for signed-in players, one row per finished daily puzzle, shared by the website and the app. Additive.
CREATE TABLE "runguessr_results" (
  "user_id" INTEGER NOT NULL,
  "puzzle" INTEGER NOT NULL,
  "answers" TEXT[],
  "clues" TEXT[],
  "score" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "runguessr_results_pkey" PRIMARY KEY ("user_id", "puzzle")
);
ALTER TABLE "runguessr_results" ADD CONSTRAINT "runguessr_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
