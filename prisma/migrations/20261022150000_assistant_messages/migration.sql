-- The site assistant's conversation log. Additive, one new table.
CREATE TABLE "assistant_messages" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assistant_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "assistant_messages_session_id_created_at_idx" ON "assistant_messages"("session_id", "created_at");
CREATE INDEX "assistant_messages_created_at_idx" ON "assistant_messages"("created_at");
