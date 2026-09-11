import { NextResponse } from 'next/server';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { currentOffers } from '@/lib/app-api/partner-offers';

// SPEC Appendix C.3. Content lives in content/app/partner-offers.json.
export const GET = withAppApi(async () => NextResponse.json({ offers: currentOffers() }), {
  limit: 60,
  cacheControl: 'public, max-age=3600, stale-while-revalidate=43200',
});
