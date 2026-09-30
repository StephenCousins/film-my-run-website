import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildNewsletterHtml, type NewsletterPayload } from '@/lib/newsletter-template';
import { newsletterPayloadSchema } from '@/lib/newsletter-payload-schema';
import { liveRecipientCount } from '@/lib/newsletter/send-deps';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const issue = await prisma.newsletter_issues.findUnique({
    where: { approve_token: token },
  });

  if (!issue) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  if (issue.status === 'sent') {
    return NextResponse.json({ error: 'This newsletter has already been sent and can no longer be edited' }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = newsletterPayloadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload', details: result.error.errors }, { status: 400 });
  }

  const payload = result.data as NewsletterPayload;

  await prisma.newsletter_issues.update({
    where: { approve_token: token },
    data: {
      subject: payload.subject,
      content: payload as object,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.com';
  const html = buildNewsletterHtml(payload, '#unsubscribe-preview', baseUrl);

  return NextResponse.json({ ok: true, html });
}

/** GET → { ok, recipients }: how many a send would go to now, for the editor's confirmation. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const issue = await prisma.newsletter_issues.findUnique({ where: { approve_token: token }, select: { status: true } });
  if (!issue) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  return NextResponse.json({ ok: true, recipients: await liveRecipientCount(), status: issue.status });
}
