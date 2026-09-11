import { withAppApi } from '@/lib/app-api/rate-limit';
import { GET as shoesGET } from '@/app/api/shoes/route';

// Versioned alias for the iPhone app (docs/app-api.md). The app has no
// session, so myRating is always null; that is expected.
export const dynamic = 'force-dynamic';
export const GET = withAppApi(shoesGET, {
  limit: 60,
  cacheControl: 'public, max-age=3600, stale-while-revalidate=86400',
});
