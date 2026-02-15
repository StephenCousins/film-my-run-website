import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

/**
 * Serves diagonal divider images as PNG for email clients.
 *
 * Gmail strips data: URIs AND doesn't support SVG images, so dividers
 * must be hosted as real HTTPS PNG images.
 *
 * Query params:
 *   from   - hex color (no #) for the top section    (default: ffffff)
 *   to     - hex color (no #) for the bottom section  (default: faf8f5)
 *   dir    - 'ltr' or 'rtl'                          (default: ltr)
 *   accent - hex color (no #) for orange triangle    (default: f88c00)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = (searchParams.get('from') || 'ffffff').replace('#', '');
  const to = (searchParams.get('to') || 'faf8f5').replace('#', '');
  const dir = searchParams.get('dir') || 'ltr';
  const accent = (searchParams.get('accent') || 'f88c00').replace('#', '');

  // Validate hex colors (prevent injection)
  const hexRe = /^[0-9a-fA-F]{3,8}$/;
  if (!hexRe.test(from) || !hexRe.test(to) || !hexRe.test(accent)) {
    return new NextResponse('Invalid color', { status: 400 });
  }

  let svg: string;
  if (dir === 'rtl') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="50" viewBox="0 0 600 50"><polygon points="0,0 600,0 0,50" fill="#${from}"/><polygon points="600,0 600,50 0,50" fill="#${to}"/><polygon points="300,0 600,0 600,50" fill="#${accent}"/></svg>`;
  } else {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="50" viewBox="0 0 600 50"><polygon points="0,0 600,0 600,50" fill="#${from}"/><polygon points="0,0 0,50 600,50" fill="#${to}"/><polygon points="0,0 300,50 0,50" fill="#${accent}"/></svg>`;
  }

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
