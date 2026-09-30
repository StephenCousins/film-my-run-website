import { NextResponse } from 'next/server';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { QUIZ } from '@/lib/runner-quiz';

// The runner quiz for the app: the same content and scoring data as the website.
// shirtUrl: fill {type} with the type id and {scores} with "S-M-D-R".
export const GET = withAppApi(
  async () =>
    NextResponse.json({
      ...QUIZ,
      shirtUrl: 'https://filmmyrun.com/shop/runner-type-tee?type={type}&s={scores}',
    }),
  { limit: 60, cacheControl: 'public, max-age=300, stale-while-revalidate=600' }
);
