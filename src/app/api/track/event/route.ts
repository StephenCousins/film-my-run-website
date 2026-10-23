import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRateLimited } from '@/lib/track-rate-limit';
import { clientIp } from '@/lib/app-api/rate-limit';

export const dynamic = 'force-dynamic';

// Browser events from src/lib/track.ts. Only these names are stored, so the table can't fill with junk.
const NAMES = new Set(['tool', 'outbound']);
const clip = (v: unknown, n: number) => (typeof v === 'string' && v ? v.slice(0, n) : null);

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(clientIp(request))) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    if (/bot|crawler|spider|slurp/i.test(request.headers.get('user-agent') ?? '')) return NextResponse.json({ skipped: true });

    const body = await request.json();
    if (!NAMES.has(body?.name)) return NextResponse.json({ error: 'Unknown event' }, { status: 400 });
    await prisma.site_events.create({
      data: {
        name: body.name,
        label: clip(body.label, 100),
        detail: clip(body.detail, 500),
        path: clip(body.path, 500),
        session_id: clip(body.sessionId, 100),
      },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Track event error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
