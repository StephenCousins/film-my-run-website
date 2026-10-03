-- Fartlex results per signed-in player, so the record syncs between the website and the app. Additive, one new table.
CREATE TABLE "fartlex_results" (
  "user_id" INTEGER NOT NULL,
  "puzzle" INTEGER NOT NULL,
  "won" BOOLEAN NOT NULL,
  "guesses" TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fartlex_results_pkey" PRIMARY KEY ("user_id", "puzzle")
);
ALTER TABLE "fartlex_results" ADD CONSTRAINT "fartlex_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
