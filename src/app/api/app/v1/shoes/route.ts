import { NextRequest } from 'next/server';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { GET as shoesGET } from '@/app/api/shoes/route';

// Versioned alias for the iPhone app (docs/app-api.md). The app's Shoe DTO
// decodes `reviews` non-optionally, so the alias always asks for them. It
// also always includes superseded shoes: a runner still wearing the Ghost 15
// must be able to find it after the Ghost 16 publishes, and the app has no
// way to ask (the web list hides them by default).
async function shoesWithReviews(req: NextRequest) {
  const url = new URL(req.url);
  url.searchParams.set('withReviews', '1');
  url.searchParams.set('includeSuperseded', '1');
  return shoesGET(new NextRequest(url, req));
}

export const GET = withAppApi(shoesWithReviews, {
  limit: 60,
  cacheControl: 'public, max-age=3600, stale-while-revalidate=86400',
});
