import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Resend } from 'resend';
import { buildNewsletterHtml, wrapWithApprovalBanner, type NewsletterPayload } from '@/lib/newsletter-template';
import { autoPopulateNewsletter } from '@/lib/newsletter-auto-populate';
import { newsletterPayloadSchema } from '@/lib/newsletter-payload-schema';
import crypto from 'crypto';

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

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const adminEmail = process.env.NEWSLETTER_ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json({ error: 'NEWSLETTER_ADMIN_EMAIL not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const result = newsletterPayloadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload', details: result.error.errors }, { status: 400 });
    }

    const payload = result.data as NewsletterPayload;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.com';

    // Auto-populate all missing sections (dryRun=false to update rotation tracking)
    await autoPopulateNewsletter(payload, baseUrl, false);

    // Generate a unique approval token
    const approveToken = crypto.randomUUID();

    // Save as draft
    const issue = await prisma.newsletter_issues.create({
      data: {
        subject: payload.subject,
        content: payload as object,
        recipient_count: 0,
        status: 'draft',
        approve_token: approveToken,
      },
    });

    // Build the newsletter HTML for admin preview
    const approveUrl = `${baseUrl}/api/newsletter/approve?token=${approveToken}`;
    const editUrl = `${baseUrl}/admin/newsletter/${approveToken}`;
    const viewInBrowserUrl = `${baseUrl}/api/newsletter/view/${issue.id}`;
    const newsletterHtml = buildNewsletterHtml(payload, '#', baseUrl, viewInBrowserUrl);
    const adminHtml = wrapWithApprovalBanner(newsletterHtml, approveUrl, editUrl);

    // Send only to admin for review
    const resend = new Resend(resendKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>';
    const adminEmails = adminEmail.split(',').map((e) => e.trim()).filter(Boolean);

    for (const email of adminEmails) {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `[DRAFT] ${payload.subject}`,
        html: adminHtml,
      });
    }

    return NextResponse.json({ ok: true, status: 'draft', issueId: issue.id });
  } catch (error) {
    console.error('Newsletter send error:', error);
    return NextResponse.json({ error: 'Failed to stage newsletter' }, { status: 500 });
  }
}
