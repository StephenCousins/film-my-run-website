import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function authenticate(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get('secret');
  const provided = bearerToken || querySecret;

  return provided === cronSecret;
}

/**
 * POST /api/news/stories/publish — Bulk publish all drafts for a roundup date
 * Body: { roundup_date } (ISO string)
 */
export async function POST(request: Request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { roundup_date } = body;

    if (!roundup_date) {
      return NextResponse.json(
        { error: 'roundup_date is required' },
        { status: 400 }
      );
    }

    const now = new Date();
    const result = await prisma.news_stories.updateMany({
      where: {
        roundup_date: new Date(roundup_date),
        status: 'draft',
      },
      data: {
        status: 'published',
        published_at: now,
      },
    });

    return NextResponse.json({
      success: true,
      publishedCount: result.count,
      roundupDate: roundup_date,
    });
  } catch (error) {
    console.error('Error bulk publishing stories:', error);
    return NextResponse.json(
      { error: 'Failed to publish stories' },
      { status: 500 }
    );
  }
}
