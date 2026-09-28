import { NextResponse } from 'next/server';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { prisma } from '@/lib/db';
import { appNewsFeed } from '@/lib/app-api/news';

export const dynamic = 'force-dynamic';

// Today's Running News row: the latest published stories, in the /news order.
export const GET = withAppApi(
  async () => {
    // The top story can be any story from the last three days, so fetch a little past the 12 shown.
    const rows = await prisma.news_stories.findMany({
      where: { status: 'published' },
      orderBy: { published_at: 'desc' },
      take: 40,
      select: { slug: true, title: true, excerpt: true, image_url: true, published_at: true, created_at: true, importance: true },
    });
    return NextResponse.json({ stories: appNewsFeed(rows, new Date()) });
  },
  { limit: 60, cacheControl: 'public, max-age=3600, stale-while-revalidate=86400' }
);
