import { NextResponse } from 'next/server';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { latestPublishedStories } from '@/lib/app-api/news';

export const dynamic = 'force-dynamic';

// Today's Running News row: the latest published stories, in the /news order.
export const GET = withAppApi(
  async () => {
    return NextResponse.json({ stories: await latestPublishedStories() });
  },
  { limit: 60, cacheControl: 'public, max-age=3600, stale-while-revalidate=86400' }
);
