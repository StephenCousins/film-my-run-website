import { NextResponse } from 'next/server';
import { fetchAndStoreArticles } from '@/lib/rss-fetcher';
import { hasBearerSecret } from '@/lib/cron-auth';

export async function GET(request: Request) {
  // Always require CRON_SECRET — fail if not configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (!hasBearerSecret(request, cronSecret)) {
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
