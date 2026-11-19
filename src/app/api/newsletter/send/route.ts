import { NextRequest, NextResponse } from 'next/server';
import { hasBearerSecret } from '@/lib/cron-auth';
import type { NewsletterPayload } from '@/lib/newsletter-template';
import { newsletterPayloadSchema } from '@/lib/newsletter-payload-schema';
import { stageDraft } from '@/lib/newsletter/stage';

/**
 * Stages this week's draft and emails it to the admin. Never sends to subscribers.
 * The server's own Monday timer does this on time (src/instrumentation.ts); this route is the GitHub backup and
 * manual trigger. A second call the same London day returns the existing draft; `"force": true` makes a new one.
 */
export async function POST(request: NextRequest) {
  if (!hasBearerSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const result = newsletterPayloadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload', details: result.error.errors }, { status: 400 });
    }
    const r = await stageDraft(result.data as NewsletterPayload, { force: body?.force === true });
    return NextResponse.json({ ok: true, ...r });
  } catch (error) {
    console.error('Newsletter send error:', error);
    return NextResponse.json({ error: 'Failed to stage newsletter' }, { status: 500 });
  }
}
