import { NextResponse } from 'next/server';
import { fetchAndStoreArticles } from '@/lib/rss-fetcher';

// Secret key to protect the endpoint (set in environment)
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Verify the request is authorized (for cron jobs)
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Allow if no secret is set (dev mode) or if secret matches
  if (CRON_SECRET && secret !== CRON_SECRET) {
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
      { error: 'Failed to sync news', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: Request) {
  return GET(request);
}
