import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import type { NewsletterPayload } from '@/lib/newsletter-template';
import { sectionHeadings, sendIssue } from '@/lib/newsletter/send-issue';
import { liveRecipientCount, liveSendDeps } from '@/lib/newsletter/send-deps';

function htmlPage(title: string, message: string, color: string = '#18181b', extra = ''): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
  <div style="text-align: center; padding: 48px; max-width: 480px;">
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: ${color};">${title}</h1>
    <p style="margin: 0; font-size: 16px; color: #52525b; line-height: 1.6;">${message}</p>
    ${extra}
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * GET: the emailed "Approve" link. It never sends: it shows what would go out and a "Send now"
 * button that POSTs, so a mail scanner prefetching the link, or a stray click, sends nothing.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return htmlPage('Invalid Link', 'No approval token provided.', '#ef4444');
  try {
    const issue = await prisma.newsletter_issues.findUnique({ where: { approve_token: token } });
    if (!issue) return htmlPage('Not Found', 'This approval link is invalid or has expired.', '#ef4444');
    if (issue.status === 'sent') {
      return htmlPage('Already Sent', `This newsletter was already sent to ${issue.recipient_count} subscriber${issue.recipient_count === 1 ? '' : 's'}.`);
    }
    const payload = issue.content as unknown as NewsletterPayload;
    const n = await liveRecipientCount();
    const sections = sectionHeadings(payload).map((h) => `<li style="margin:4px 0">${esc(h)}</li>`).join('');
    const action = `/api/newsletter/approve?token=${encodeURIComponent(token)}`;
    return htmlPage(
      'Send this newsletter?',
      `<strong style="color:#18181b">${esc(payload.subject)}</strong>`,
      '#18181b',
      `<ul style="text-align:left;margin:20px auto;padding-left:20px;color:#52525b;font-size:15px;max-width:360px">${sections}</ul>
      <form method="POST" action="${action}" style="margin-top:24px">
        <button type="submit" style="padding:14px 28px;background:#f88c00;color:#000;font-weight:700;font-size:16px;border:0;border-radius:999px;cursor:pointer">Send now to ${n} subscriber${n === 1 ? '' : 's'}</button>
      </form>
      <p style="margin-top:16px;font-size:14px"><a href="/admin/newsletter/${encodeURIComponent(token)}" style="color:#f88c00">Edit it first</a></p>`
    );
  } catch (error) {
    console.error('Newsletter approve page error:', error);
    return htmlPage('Error', 'Something went wrong. Please try again.', '#ef4444');
  }
}

/** POST: send. JSON for the editor (Accept: application/json), a page for the form. */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const reply = (status: number, json: object, title: string, message: string, color?: string) =>
    wantsJson ? Response.json(json, { status }) : htmlPage(title, message, color);

  const deps = liveSendDeps();
  if (!deps) return reply(500, { ok: false, error: 'RESEND_API_KEY is not configured' }, 'Configuration Error', 'RESEND_API_KEY is not configured.', '#ef4444');
  const r = await sendIssue(token, deps);
  switch (r.kind) {
    case 'sent':
      return reply(200, { ok: true, sent: r.count }, 'Newsletter Sent!', `Sent to ${r.count} subscriber${r.count === 1 ? '' : 's'}.`, '#16a34a');
    case 'already':
      return reply(409, { ok: false, error: 'already_sent', sent: r.count }, 'Already Sent', `This newsletter was already sent to ${r.count} subscribers.`);
    case 'busy':
      return reply(409, { ok: false, error: 'sending' }, 'Already Sending', 'This newsletter is being sent right now.');
    case 'not-found':
      return reply(404, { ok: false, error: 'not_found' }, 'Not Found', 'This approval link is invalid or has expired.', '#ef4444');
    default:
      console.error('Newsletter send failed:', r.error);
      return reply(500, { ok: false, error: r.error }, 'Error', 'Something went wrong while sending. Nothing was marked sent; you can try again.', '#ef4444');
  }
}
