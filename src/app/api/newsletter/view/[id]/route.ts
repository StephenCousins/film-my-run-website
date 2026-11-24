import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildNewsletterHtml, type NewsletterPayload } from '@/lib/newsletter-template';

/**
 * "View this email in your browser".
 *
 * Sent issues (and one that is part-way through sending, so the link works for the first people to get it)
 * are public at /api/newsletter/view/<id>. A draft is only shown with its review token
 * (?token=<approve_token>, the same token as the editor link), so nobody can read next week's draft by
 * stepping through ids.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const issueId = parseInt(id, 10);
  if (isNaN(issueId)) {
    return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 });
  }

  const issue = await prisma.newsletter_issues.findUnique({
    where: { id: issueId },
  });

  const token = request.nextUrl.searchParams.get('token');
  const published = issue?.status === 'sent' || issue?.status === 'sending';
  const reviewer = !!issue?.approve_token && token === issue.approve_token;
  if (!issue || (!published && !reviewer)) {
    return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
  }

  const payload = issue.content as unknown as NewsletterPayload;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.com';
  // The web copy has no personal unsubscribe link: each subscriber's email carries their own.
  const html = buildNewsletterHtml(payload, '#', baseUrl);

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
