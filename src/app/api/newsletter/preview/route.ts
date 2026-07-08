import { NextRequest, NextResponse } from 'next/server';
import { buildNewsletterHtml, type NewsletterPayload } from '@/lib/newsletter-template';
import { autoPopulateNewsletter } from '@/lib/newsletter-auto-populate';
import { newsletterPayloadSchema } from '@/lib/newsletter-payload-schema';

function verifyAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  return bearerToken === cronSecret;
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = newsletterPayloadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload', details: result.error.errors }, { status: 400 });
    }

    const payload = result.data as NewsletterPayload;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.co.uk';

    // Auto-populate all missing sections (dryRun=true — don't update rotation tracking)
    await autoPopulateNewsletter(payload, baseUrl, true);

    const html = buildNewsletterHtml(payload, '#unsubscribe-preview', baseUrl);

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Newsletter preview error:', error);
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
  }
}
