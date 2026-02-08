import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { elementId, elementText, targetUrl, path, sessionId } = body;

    if (!elementId || typeof elementId !== 'string') {
      return NextResponse.json({ error: 'elementId is required' }, { status: 400 });
    }
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    await prisma.click_events.create({
      data: {
        element_id: elementId.slice(0, 200),
        element_text: typeof elementText === 'string' ? elementText.slice(0, 500) : null,
        target_url: typeof targetUrl === 'string' ? targetUrl.slice(0, 2000) : null,
        path: path.slice(0, 500),
        session_id: typeof sessionId === 'string' ? sessionId.slice(0, 100) : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Track click error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
