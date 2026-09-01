-- CreateTable
CREATE TABLE "youtube_video_stats" (
    "youtube_id" TEXT NOT NULL,
    "view_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "youtube_video_stats_pkey" PRIMARY KEY ("youtube_id")
);

-- CreateTable
CREATE TABLE "youtube_channel_stats" (
    "channel_id" TEXT NOT NULL,
    "subscribers" INTEGER NOT NULL,
    "total_views" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "youtube_channel_stats_pkey" PRIMARY KEY ("channel_id")
);
