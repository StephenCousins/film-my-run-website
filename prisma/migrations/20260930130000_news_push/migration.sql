-- News push: device tokens and one-row-per-day send log. Additive, new tables only.
CREATE TABLE "push_devices" (
  "token" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "news" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "invalid_at" TIMESTAMP(3),
  CONSTRAINT "push_devices_pkey" PRIMARY KEY ("token")
);
CREATE TABLE "news_push_sends" (
  "day" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recipients" INTEGER NOT NULL DEFAULT 0,
  "failures" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "news_push_sends_pkey" PRIMARY KEY ("day")
);
CREATE INDEX "push_devices_news_invalid_at_idx" ON "push_devices"("news", "invalid_at");
