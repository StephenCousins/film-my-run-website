import { withAppApi } from '@/lib/app-api/rate-limit';
import { GET as shoesGET } from '@/app/api/shoes/route';

// Versioned alias for the iPhone app (docs/app-api.md).
export const GET = withAppApi(shoesGET, {
  limit: 60,
  cacheControl: 'public, max-age=3600, stale-while-revalidate=86400',
});
