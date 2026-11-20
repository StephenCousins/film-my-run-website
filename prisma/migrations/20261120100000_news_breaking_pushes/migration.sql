-- Breaking news push (Stephen, 20 Nov 2026): a story published by hand with news:story is pushed straight away.
CREATE TABLE "news_breaking_pushes" (
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "news_breaking_pushes_pkey" PRIMARY KEY ("slug")
);
