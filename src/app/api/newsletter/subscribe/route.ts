import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';
import { Resend } from 'resend';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
});

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const result = subscribeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { email } = result.data;
    const token = crypto.randomUUID();

    // Upsert: re-subscribing sets status back to active
    await prisma.newsletter_subscribers.upsert({
      where: { email },
      create: {
        email,
        token,
        status: 'active',
      },
      update: {
        status: 'active',
        token,
        unsubscribed_at: null,
      },
    });

    // Send welcome email via Resend (non-blocking — don't fail the subscription if email fails)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>';
      resend.emails.send({
        from: fromEmail,
        to: email,
        subject: 'Welcome to the Film My Run newsletter!',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 16px;">
            <h1 style="font-size: 22px; color: #18181b; margin-bottom: 16px;">Welcome!</h1>
            <p style="color: #52525b; font-size: 15px; line-height: 1.6;">
              Thanks for subscribing to the Film My Run newsletter. You'll receive trail &amp; ultra running news, training tips, and exclusive content from the world of running filmmaking.
            </p>
            <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px;">
              If you didn't subscribe, you can safely ignore this email.
            </p>
          </div>
        `,
      }).catch((err) => {
        console.error('Failed to send welcome email:', err);
      });
    }

    return NextResponse.json({ ok: true, message: "You're subscribed! Check your inbox for a welcome email." });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
