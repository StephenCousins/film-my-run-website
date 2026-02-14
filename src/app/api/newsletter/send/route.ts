import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Resend } from 'resend';
import { buildNewsletterHtml, type NewsletterPayload } from '@/lib/newsletter-template';
import { z } from 'zod';

const payloadSchema = z.object({
  subject: z.string().min(1).max(200),
  news: z.array(z.object({ title: z.string(), url: z.string().url(), source: z.string(), imageUrl: z.string().url().optional(), description: z.string().optional() })).optional(),
  blogPost: z.object({ title: z.string(), url: z.string().url(), snippet: z.string(), imageUrl: z.string().url().optional() }).optional(),
  videoOfTheWeek: z.object({ title: z.string(), url: z.string().url(), description: z.string(), thumbnailUrl: z.string().url() }).optional(),
  appOfTheWeek: z.object({ name: z.string(), url: z.string().url(), description: z.string() }).optional(),
  sessionOfTheWeek: z.object({ title: z.string(), description: z.string() }).optional(),
  trainingTip: z.object({ text: z.string(), citation: z.string().optional() }).optional(),
  scienceSection: z.object({ text: z.string(), citation: z.string().optional() }).optional(),
  nutritionTip: z.object({ text: z.string(), citation: z.string().optional() }).optional(),
  fromTheArchives: z.object({ title: z.string(), url: z.string().url(), description: z.string() }).optional(),
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

  try {
    const body = await request.json();
    const result = payloadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload', details: result.error.errors }, { status: 400 });
    }

    const payload = result.data as NewsletterPayload;
    const resend = new Resend(resendKey);

    // Fetch all active subscribers
    const subscribers = await prisma.newsletter_subscribers.findMany({
      where: { status: 'active' },
      select: { email: true, token: true },
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.co.uk';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>';

    // Always send a copy to the admin
    const adminEmail = process.env.NEWSLETTER_ADMIN_EMAIL;
    if (adminEmail) {
      const adminEmails = adminEmail.split(',').map((e) => e.trim()).filter(Boolean);
      for (const email of adminEmails) {
        const isSubscriber = subscribers.some((s) => s.email === email);
        if (!isSubscriber) {
          subscribers.push({ email, token: 'admin' });
        }
      }
    }

    if (subscribers.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, subject: payload.subject, message: 'No active subscribers.' });
    }

    // Send in batches of 100 (Resend batch API limit)
    let totalSent = 0;
    for (let i = 0; i < subscribers.length; i += 100) {
      const batch = subscribers.slice(i, i + 100);
      const emails = batch.map((sub) => ({
        from: fromEmail,
        to: sub.email,
        subject: payload.subject,
        html: buildNewsletterHtml(
          payload,
          sub.token === 'admin' ? '#' : `${baseUrl}/api/newsletter/unsubscribe?token=${sub.token}`
        ),
      }));

      await resend.batch.send(emails);
      totalSent += batch.length;
    }

    // Record the issue
    await prisma.newsletter_issues.create({
      data: {
        subject: payload.subject,
        content: body,
        recipient_count: totalSent,
      },
    });

    return NextResponse.json({ ok: true, sent: totalSent, subject: payload.subject });
  } catch (error) {
    console.error('Newsletter send error:', error);
    return NextResponse.json({ error: 'Failed to send newsletter' }, { status: 500 });
  }
}
