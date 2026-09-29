/**
 * GET ?type&s&colour&side=front|back&w= → PNG of the Runner Type Tee mock-up (the art on the
 * shirt), for the app's native product page. Same art code as the web preview and the print.
 */
import { NextResponse } from 'next/server';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { parseResult, parseScores, rankTypes } from '@/lib/runner-quiz';
import { SHIRT_COLOURS, backArt, frontArt, teeMock, type ShirtColour } from '@/lib/runner-quiz/shirt-art';
import { logoDataUri, renderPng } from '@/lib/runner-quiz/render';

export const runtime = 'nodejs';

export const GET = withAppApi(
  async (request) => {
    const q = request.nextUrl.searchParams;
    const result = parseResult({ type: q.get('type'), scores: parseScores(q.get('s')) });
    const colour = q.get('colour') ?? '';
    const side = q.get('side');
    if (!result || !(colour in SHIRT_COLOURS) || (side !== 'front' && side !== 'back')) {
      return NextResponse.json({ ok: false, error: 'Invalid type, scores, colour or side' }, { status: 400 });
    }
    const w = Math.min(1000, Math.max(200, Math.round(Number(q.get('w')) || 800)));
    const c = colour as ShirtColour;
    const { type, scores } = result;
    const art =
      side === 'front'
        ? frontArt(type, c)
        : backArt(type, rankTypes(scores).find((t) => t.id !== type.id)!, scores, new Date(), c, logoDataUri(c));
    const png = await renderPng(teeMock(SHIRT_COLOURS[c], art), w);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        // The back carries today's date, so it may be cached for a day at most; the front never changes.
        'Cache-Control': side === 'back' ? 'public, max-age=86400, s-maxage=86400' : 'public, max-age=86400, s-maxage=604800',
      },
    });
  },
  { limit: 60 }
);
