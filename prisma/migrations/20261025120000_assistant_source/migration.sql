-- Which assistant a logged message belongs to: the site chat or Ask Wilson in the iPhone app. Additive.
ALTER TABLE "assistant_messages" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'site';
CREATE INDEX "assistant_messages_source_created_at_idx" ON "assistant_messages"("source", "created_at");
