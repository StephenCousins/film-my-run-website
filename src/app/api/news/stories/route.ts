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
 * GET /api/news/stories — List stories by status
 * Query params: status (draft|published|rejected), roundup_date
 */
export async function GET(request: Request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'draft';
  const roundupDate = searchParams.get('roundup_date');

  const where: Record<string, unknown> = { status };
  if (roundupDate) {
    where.roundup_date = new Date(roundupDate);
  }

  const stories = await prisma.news_stories.findMany({
    where,
    orderBy: [{ priority: 'asc' }, { created_at: 'desc' }],
  });

  return NextResponse.json({ stories });
}

/**
 * PATCH /api/news/stories — Update a story's status
 * Body: { id, status, title?, excerpt?, content? }
 */
export async function PATCH(request: Request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, title, excerpt, content } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'id and status are required' },
        { status: 400 }
      );
    }

    if (!['draft', 'published', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be draft, published, or rejected' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status };

    // Set published_at when publishing
    if (status === 'published') {
      updateData.published_at = new Date();
    }

    // Allow editing title, excerpt, content
    if (title) updateData.title = title;
    if (excerpt) updateData.excerpt = excerpt;
    if (content) updateData.content = content;

    const story = await prisma.news_stories.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ story });
  } catch (error) {
    console.error('Error updating story:', error);
    return NextResponse.json(
      { error: 'Failed to update story' },
      { status: 500 }
    );
  }
}
