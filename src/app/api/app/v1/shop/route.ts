import { NextResponse } from 'next/server';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { appShopCatalogue } from '@/lib/app-api/shop';

// The app's Shop tab. Static data, so it can be cached hard.
export const GET = withAppApi(async () => NextResponse.json(appShopCatalogue()), {
  limit: 60,
  cacheControl: 'public, max-age=3600, stale-while-revalidate=43200',
});
