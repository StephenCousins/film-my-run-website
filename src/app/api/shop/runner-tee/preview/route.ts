/**
 * GET ?type&s&colour&side=front|back&w= → PNG of the Runner Type Tee mock-up (the art on the
 * shirt), for the app's native product page. Same art code as the web preview and the print.
 */
import { NextResponse } from 'next/server';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { parseResult, parseScores, typeById } from '@/lib/runner-quiz';
import { SHIRT_COLOURS, frontArt, teeBackArt, teeMock, type ShirtColour } from '@/lib/runner-quiz/shirt-art';
import { logoDataUri, renderPng } from '@/lib/runner-quiz/render';

export const runtime = 'nodejs';

export const GET = withAppApi(
  async (request) => {
    const q = request.nextUrl.searchParams;
    // The buyer's result is optional (empty type and s: none), but one that is sent must be valid.
    const hasResult = Boolean(q.get('type') || q.get('s'));
    const result = hasResult ? parseResult({ type: q.get('type'), scores: parseScores(q.get('s')) }) : null;
    // The shirt: `design`, or for old links the buyer's own type.
    const design = typeById(q.get('design') || undefined) ?? result?.type;
    const colour = q.get('colour') ?? '';
    const side = q.get('side');
    if ((hasResult && !result) || !design || !(colour in SHIRT_COLOURS) || (side !== 'front' && side !== 'back')) {
      return NextResponse.json({ ok: false, error: 'Invalid design, type, scores, colour or side' }, { status: 400 });
    }
    const w = Math.min(1000, Math.max(200, Math.round(Number(q.get('w')) || 800)));
    const c = colour as ShirtColour;
    const art = side === 'front' ? frontArt(design, c) : teeBackArt(design, result, new Date(), c, logoDataUri(c));
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
