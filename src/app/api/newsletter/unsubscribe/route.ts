import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/newsletter/consent';
import { liveNewsletterStore } from '@/lib/newsletter/store';

const html = (body: string, status = 200) => new NextResponse(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

// The link in every newsletter.
export async function GET(request: NextRequest) {
  try {
    const outcome = await unsubscribeByToken(liveNewsletterStore, new URL(request.url).searchParams.get('token') ?? '');
    if (outcome === 'unknown') return html(unsubscribePage('This unsubscribe link is not valid.', false), 404);
    return html(unsubscribePage(outcome === 'already' ? 'You have already been unsubscribed.' : 'You have been successfully unsubscribed.', true));
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return html(unsubscribePage('Something went wrong. Please try again.', false), 500);
  }
}

// One-click unsubscribe (RFC 8058): mail apps POST "List-Unsubscribe=One-Click" to the same URL.
export async function POST(request: NextRequest) {
  try {
    const outcome = await unsubscribeByToken(liveNewsletterStore, new URL(request.url).searchParams.get('token') ?? '');
    return new NextResponse(null, { status: outcome === 'unknown' ? 404 : 200 });
  } catch (error) {
    console.error('One-click unsubscribe error:', error);
    return new NextResponse(null, { status: 500 });
  }
}

function unsubscribePage(message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribe - Film My Run</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
  <div style="text-align: center; max-width: 400px; padding: 48px 24px;">
    <div style="font-size: 48px; margin-bottom: 16px;">${success ? '&#10003;' : '&#10007;'}</div>
    <h1 style="font-size: 22px; color: #18181b; margin-bottom: 12px;">Film My Run</h1>
    <p style="color: ${success ? '#52525b' : '#ef4444'}; font-size: 15px; line-height: 1.5;">${message}</p>
    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.com'}" style="display: inline-block; margin-top: 24px; color: #f88c00; text-decoration: none; font-size: 14px;">Visit Film My Run</a>
  </div>
</body>
</html>`;
}
