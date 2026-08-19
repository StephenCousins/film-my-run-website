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
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.com';
      resend.emails.send({
        from: fromEmail,
        to: email,
        subject: "You're in! Welcome to Film My Run",
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 32px 32px; background-color: #18181b; border-radius: 12px 12px 0 0;" align="center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#f88c00" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/>
              </svg>
              <h1 style="margin: 16px 0 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                Welcome to the crew!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px; background-color: #ffffff;">
              <p style="margin: 0 0 20px; color: #18181b; font-size: 16px; line-height: 1.6;">
                You&rsquo;re officially on the Film My Run mailing list. Here&rsquo;s what to expect in your inbox:
              </p>

              <!-- What you'll get -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; background-color: #fafafa; border-radius: 8px; border-left: 3px solid #f88c00;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; color: #18181b; font-size: 14px; line-height: 1.5;">
                          <span style="color: #f88c00; font-weight: 700; margin-right: 8px;">&#9650;</span>
                          <strong>Trail &amp; ultra running news</strong> &mdash; the week&rsquo;s biggest stories
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #18181b; font-size: 14px; line-height: 1.5;">
                          <span style="color: #f88c00; font-weight: 700; margin-right: 8px;">&#9658;</span>
                          <strong>Video picks</strong> &mdash; the best running films and vlogs
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #18181b; font-size: 14px; line-height: 1.5;">
                          <span style="color: #f88c00; font-weight: 700; margin-right: 8px;">&#9733;</span>
                          <strong>Training tips &amp; sessions</strong> &mdash; practical advice you can use this week
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #18181b; font-size: 14px; line-height: 1.5;">
                          <span style="color: #f88c00; font-weight: 700; margin-right: 8px;">&#9998;</span>
                          <strong>Race reports &amp; blog posts</strong> &mdash; from parkruns to 100-milers
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #18181b; font-size: 14px; line-height: 1.5;">
                          <span style="color: #f88c00; font-weight: 700; margin-right: 8px;">&#9881;</span>
                          <strong>New tools &amp; features</strong> &mdash; first to know when we launch something
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px; color: #52525b; font-size: 15px; line-height: 1.6;">
                In the meantime, have a look around:
              </p>

              <!-- CTA buttons -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${siteUrl}/blog" style="display: inline-block; padding: 12px 28px; background-color: #f88c00; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 999px;">
                      Read the Blog
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 0 8px;">
                          <a href="https://youtube.com/@filmmyrun" style="color: #f88c00; font-size: 13px; font-weight: 600; text-decoration: none;">YouTube</a>
                        </td>
                        <td style="color: #e4e4e7;">|</td>
                        <td style="padding: 0 8px;">
                          <a href="https://instagram.com/filmmyrun" style="color: #f88c00; font-size: 13px; font-weight: 600; text-decoration: none;">Instagram</a>
                        </td>
                        <td style="color: #e4e4e7;">|</td>
                        <td style="padding: 0 8px;">
                          <a href="${siteUrl}/tools/parkrun" style="color: #f88c00; font-size: 13px; font-weight: 600; text-decoration: none;">Parkrun Stats</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 12px 12px;" align="center">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; line-height: 1.5;">
                You&rsquo;re receiving this because you subscribed at Film My Run.
                <br />If this wasn&rsquo;t you, just ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
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
