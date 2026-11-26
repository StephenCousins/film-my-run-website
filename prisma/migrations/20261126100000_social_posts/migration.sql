-- Social posts for published news stories (26 Nov 2026): Facebook Page + Instagram, see docs/social-posts.md.

-- AlterTable: the original source photo's width, so the social step can skip small or fallback images.
ALTER TABLE "news_stories" ADD COLUMN     "image_source_width" INTEGER;

-- CreateTable
CREATE TABLE "social_posts" (
    "id" SERIAL NOT NULL,
    "story_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "tag" TEXT,
    "headline" TEXT,
    "caption_facebook" TEXT,
    "caption_instagram" TEXT,
    "card_url" TEXT,
    "facebook_post_id" TEXT,
    "facebook_url" TEXT,
    "instagram_media_id" TEXT,
    "instagram_url" TEXT,
    "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "claude_cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "posted_at" TIMESTAMP(3),

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_posts_story_id_key" ON "social_posts"("story_id");

-- CreateIndex
CREATE INDEX "social_posts_created_at_idx" ON "social_posts"("created_at");

-- CreateIndex
CREATE INDEX "social_posts_posted_at_idx" ON "social_posts"("posted_at");
