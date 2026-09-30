/** GET ?e&t: the double opt-in link. A valid, unexpired link subscribes with consent. */
import { NextRequest, NextResponse } from 'next/server';
import { checkConfirmToken, subscribe } from '@/lib/newsletter/consent';
import { confirmSecret } from '@/lib/newsletter/confirm-email';
import { liveNewsletterStore } from '@/lib/newsletter/store';

export const dynamic = 'force-dynamic';

const page = (title: string, body: string, status = 200) =>
  new NextResponse(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} - Film My Run</title></head>
<body style="margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#fafafa;color:#18181b">
<div style="max-width:480px;margin:80px auto;padding:32px;background:#fff;border-radius:16px;border-top:4px solid #f88c00">
<h1 style="margin:0 0 12px;font-size:24px">${title}</h1><p style="margin:0 0 20px;color:#52525b">${body}</p>
<a href="https://filmmyrun.com" style="color:#f88c00">filmmyrun.com</a></div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const email = q.get('e') ?? '';
  const token = q.get('t') ?? '';
  const secret = confirmSecret();
  if (!secret || !checkConfirmToken(email, token, secret)) {
    return page('Link not valid', 'This link has expired or is not right. Sign up again from the site and we will send a new one.', 400);
  }
  try {
    await subscribe(liveNewsletterStore, email, 'consent', 'footer-confirmed');
    return page("You're back on the list", 'The Film My Run newsletter will be with you next week.');
  } catch (e) {
    console.error('Newsletter confirm failed:', e);
    return page('Something went wrong', 'Please try the link again in a minute.', 500);
  }
}
