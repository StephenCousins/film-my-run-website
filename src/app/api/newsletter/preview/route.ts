import { NextRequest, NextResponse } from 'next/server';
import { hasBearerSecret } from '@/lib/cron-auth';
import { buildNewsletterHtml, type NewsletterPayload } from '@/lib/newsletter-template';
import { autoPopulateNewsletter } from '@/lib/newsletter-auto-populate';
import { newsletterPayloadSchema } from '@/lib/newsletter-payload-schema';

const verifyAuth = (request: NextRequest) => hasBearerSecret(request);

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
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.com';

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
