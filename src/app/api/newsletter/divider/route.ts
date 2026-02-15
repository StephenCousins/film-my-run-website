import { NextRequest, NextResponse } from 'next/server';

/**
 * Serves SVG diagonal dividers as proper HTTPS images.
 *
 * Gmail strips `data:` URIs from img src attributes, so SVG dividers
 * must be hosted as real URLs to render in email clients.
 *
 * Query params:
 *   from  - hex color (no #) for the top section    (default: ffffff)
 *   to    - hex color (no #) for the bottom section  (default: faf8f5)
 *   dir   - 'ltr' or 'rtl'                          (default: ltr)
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
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 50" preserveAspectRatio="none"><polygon points="0,0 600,0 0,50" fill="#${from}"/><polygon points="600,0 600,50 0,50" fill="#${to}"/><polygon points="300,0 600,0 600,50" fill="#${accent}"/></svg>`;
  } else {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 50" preserveAspectRatio="none"><polygon points="0,0 600,0 600,50" fill="#${from}"/><polygon points="0,0 0,50 600,50" fill="#${to}"/><polygon points="0,0 300,50 0,50" fill="#${accent}"/></svg>`;
  }

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
