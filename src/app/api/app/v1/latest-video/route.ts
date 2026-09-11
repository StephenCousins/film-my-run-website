import { NextResponse } from 'next/server';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { fetchLatestVideo } from '@/lib/app-api/latest-video';

// SPEC Appendix C.4. The newest Film My Run upload, from the channel's public feed.
export const GET = withAppApi(
  async () => {
    const video = await fetchLatestVideo();
    if (!video) return NextResponse.json({ ok: false, error: 'Feed unavailable' }, { status: 503 });
    return NextResponse.json({ video });
  },
  { limit: 60, cacheControl: 'public, max-age=3600, stale-while-revalidate=86400' }
);
