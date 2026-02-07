import { NextResponse } from 'next/server';
import { fetchAndStoreArticles } from '@/lib/rss-fetcher';

export async function GET(request: Request) {
  // Always require CRON_SECRET — fail if not configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Accept secret via Authorization header (preferred) or query param (legacy)
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get('secret');
  const providedSecret = bearerToken || querySecret;

  if (!providedSecret || providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await fetchAndStoreArticles();

    return NextResponse.json({
      success: true,
      message: `Fetched ${result.fetched} articles, stored/updated ${result.stored}`,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error syncing news:', error);
    return NextResponse.json(
      { error: 'Failed to sync news' },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: Request) {
  return GET(request);
}
