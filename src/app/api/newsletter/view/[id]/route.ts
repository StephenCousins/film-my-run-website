import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildNewsletterHtml, type NewsletterPayload } from '@/lib/newsletter-template';

export async function GET(
  _request: NextRequest,
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

  if (!issue) {
    return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
  }

  const payload = issue.content as unknown as NewsletterPayload;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.co.uk';
  const html = buildNewsletterHtml(payload, '#', baseUrl);

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
