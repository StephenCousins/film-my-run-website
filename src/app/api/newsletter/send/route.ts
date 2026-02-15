import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Resend } from 'resend';
import { buildNewsletterHtml, wrapWithApprovalBanner, type NewsletterPayload } from '@/lib/newsletter-template';
import { autoPopulateNewsletter } from '@/lib/newsletter-auto-populate';
import { z } from 'zod';
import crypto from 'crypto';

const payloadSchema = z.object({
  subject: z.string().min(1).max(200),
  intro: z.string().optional(),
  parkrun: z.object({ text: z.string() }).optional(),
  news: z.array(z.object({ title: z.string(), url: z.string().url(), source: z.string(), imageUrl: z.string().url().optional(), description: z.string().optional() })).optional(),
  blogPost: z.object({ title: z.string(), url: z.string().url(), snippet: z.string(), imageUrl: z.string().url().optional() }).optional(),
  videoOfTheWeek: z.object({ title: z.string(), url: z.string().url(), description: z.string(), thumbnailUrl: z.string().url() }).optional(),
  appOfTheWeek: z.object({ name: z.string(), url: z.string().url(), description: z.string() }).optional(),
  sessionOfTheWeek: z.object({ title: z.string(), description: z.string() }).optional(),
  trainingTip: z.object({ text: z.string(), citation: z.string().optional() }).optional(),
  scienceSection: z.object({ text: z.string(), citation: z.string().optional() }).optional(),
  nutritionTip: z.object({ text: z.string(), citation: z.string().optional() }).optional(),
  fromTheArchives: z.object({ title: z.string(), url: z.string().url(), description: z.string(), imageUrl: z.string().url().optional() }).optional(),
  whatsNew: z.object({ text: z.string() }).optional(),
});

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
    const result = payloadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload', details: result.error.errors }, { status: 400 });
    }

    const payload = result.data as NewsletterPayload;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.co.uk';

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
    const viewInBrowserUrl = `${baseUrl}/api/newsletter/view/${issue.id}`;
    const newsletterHtml = buildNewsletterHtml(payload, '#', baseUrl, viewInBrowserUrl);
    const adminHtml = wrapWithApprovalBanner(newsletterHtml, approveUrl);

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
