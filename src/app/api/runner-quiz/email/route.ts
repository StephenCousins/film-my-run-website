import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { findClosestIdeology } from '@/app/tools/runner-quiz/quiz-data';

const schema = z.object({
  email: z.string().email().max(255),
  scores: z.object({
    surfaceL: z.number().min(0).max(100),
    methodL: z.number().min(0).max(100),
    distanceL: z.number().min(0).max(100),
    spiritL: z.number().min(0).max(100),
  }),
  subscribeNewsletter: z.boolean().optional(),
});

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 5;
}

function axisBar(label: string, leftLabel: string, rightLabel: string, leftPct: number, leftColor: string, rightColor: string): string {
  const rightPct = 100 - leftPct;
  const pctRounded = Math.round(leftPct);
  const dominant = leftPct >= 50 ? 'left' : 'right';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
      <tr>
        <td style="padding-bottom: 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: ${dominant === 'left' ? leftColor : '#a1a1aa'};">${leftLabel}</td>
              <td align="center" style="font-size: 11px; font-weight: 600; color: #71717a;">${label}</td>
              <td align="right" style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: ${dominant === 'right' ? rightColor : '#a1a1aa'};">${rightLabel}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #3f3f46; border-radius: 4px; overflow: hidden;">
            <tr>
              <td width="${pctRounded}%" style="height: 24px; background-color: ${leftColor};"></td>
              <td width="${100 - pctRounded}%" style="height: 24px; background-color: ${rightColor};"></td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 2px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 12px; font-weight: 700; color: #a1a1aa;">${pctRounded}%</td>
              <td align="right" style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 12px; font-weight: 700; color: #a1a1aa;">${100 - pctRounded}%</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function buildEmail(ideology: ReturnType<typeof findClosestIdeology>, scores: z.infer<typeof schema>['scores'], siteUrl: string): string {
  const shareR = `${Math.round(scores.surfaceL)}-${Math.round(scores.methodL)}-${Math.round(scores.distanceL)}-${Math.round(scores.spiritL)}`;
  const quizUrl = `${siteUrl}/tools/runner-quiz?r=${shareR}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Orange stripe -->
          <tr><td style="height: 5px; background-color: #f88c00; border-radius: 12px 12px 0 0;"></td></tr>

          <!-- Header -->
          <tr>
            <td style="padding: 40px 32px 24px; background-color: #18181b;">
              <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #f88c00;">
                Your Running Tribe
              </p>
              <p style="margin: 0 0 4px; font-size: 18px; font-style: italic; color: #f88c00;">The</p>
              <h1 style="margin: 0 0 20px; font-size: 42px; font-weight: 900; color: #fafafa; text-transform: uppercase; letter-spacing: -0.5px; line-height: 1;">
                ${ideology.name}
              </h1>
              <p style="margin: 0; font-size: 16px; color: #a1a1aa; line-height: 1.6;">
                ${ideology.desc}
              </p>
            </td>
          </tr>

          <!-- Profile -->
          <tr>
            <td style="padding: 28px 32px; background-color: #18181b; border-top: 1px solid #27272a;">
              <p style="margin: 0 0 24px; font-size: 15px; color: #d4d4d8; line-height: 1.7;">
                ${ideology.profile}
              </p>

              <!-- Traits -->
              <p style="margin: 0 0 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #71717a;">
                Tell-tale signs
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                ${ideology.traits.map(t => `<tr>
                  <td style="padding: 5px 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
                    <span style="color: #f88c00; font-weight: 700; margin-right: 8px;">&#x2022;</span>${t}
                  </td>
                </tr>`).join('')}
              </table>

              <!-- Details grid -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="50%" style="padding: 12px 16px; background-color: #27272a; border-radius: 8px 0 0 8px; vertical-align: top;">
                    <p style="margin: 0 0 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #71717a;">Runners you'd admire</p>
                    <p style="margin: 0; font-size: 13px; color: #d4d4d8; font-weight: 600;">${ideology.famous}</p>
                  </td>
                  <td width="50%" style="padding: 12px 16px; background-color: #27272a; border-radius: 0 8px 8px 0; border-left: 1px solid #3f3f46; vertical-align: top;">
                    <p style="margin: 0 0 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #71717a;">Your ideal race</p>
                    <p style="margin: 0; font-size: 13px; color: #d4d4d8; font-weight: 600;">${ideology.idealRace}</p>
                  </td>
                </tr>
              </table>

              <!-- Mantra -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 16px 20px; border-left: 4px solid #f88c00; background-color: #27272a; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0; font-size: 20px; font-weight: 700; font-style: italic; color: #fafafa;">
                      &ldquo;${ideology.mantra}&rdquo;
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Axis bars -->
          <tr>
            <td style="padding: 28px 32px; background-color: #18181b; border-top: 1px solid #27272a;">
              <p style="margin: 0 0 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #71717a;">
                Your four axes
              </p>
              ${axisBar('Surface', 'Road', 'Trail', scores.surfaceL, '#fafafa', '#f88c00')}
              ${axisBar('Method', 'Numbers', 'Feel', scores.methodL, '#3b82f6', '#f59e0b')}
              ${axisBar('Distance', 'Speed', 'Ultra', scores.distanceL, '#ef4444', '#8b5cf6')}
              ${axisBar('Spirit', 'Compete', 'Connect', scores.spiritL, '#eab308', '#14b8a6')}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 28px 32px; background-color: #18181b; border-top: 1px solid #27272a;" align="center">
              <p style="margin: 0 0 16px; font-size: 15px; color: #a1a1aa;">
                Think a friend would enjoy this?
              </p>
              <a href="${quizUrl}" style="display: inline-block; padding: 14px 32px; background-color: #f88c00; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 999px; text-transform: uppercase; letter-spacing: 1px;">
                Share Your Result
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #09090b; border-top: 1px solid #27272a; border-radius: 0 0 12px 12px;" align="center">
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #f88c00;">filmmyrun.com</p>
              <p style="margin: 0; color: #52525b; font-size: 11px; line-height: 1.5;">
                You received this because you requested your Runner Quiz results.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { email, scores, subscribeNewsletter } = parsed.data;
    const ideology = findClosestIdeology(scores.surfaceL, scores.methodL, scores.distanceL, scores.spiritL);

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const resend = new Resend(resendKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.com';

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `You're "The ${ideology.name}" — Your Runner Quiz Results`,
      html: buildEmail(ideology, scores, siteUrl),
    });

    if (subscribeNewsletter) {
      const token = crypto.randomUUID();
      await prisma.newsletter_subscribers.upsert({
        where: { email },
        create: { email, token, status: 'active' },
        update: { status: 'active', token, unsubscribed_at: null },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Runner quiz email error:', error);
    return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 });
  }
}
