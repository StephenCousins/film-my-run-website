import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { QUIZ, parseResult, rankTypes, type QuizType, type Scores } from '@/lib/runner-quiz';

// Body: { email, type: "<id>", scores: [S, M, D, R], subscribeNewsletter? }.
const schema = z.object({
  email: z.string().email().max(255),
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

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function axisRow(low: string, high: string, score: number, colour: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 18px;">
      <tr>
        <td style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #a1a1aa;">${low}</td>
        <td align="right" style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #a1a1aa;">${high}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top: 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius: 4px; overflow: hidden;">
            <tr>
              <td width="${score}%" style="height: 10px; background-color: ${colour};"></td>
              <td width="${100 - score}%" style="height: 10px; background-color: #3f3f46;"></td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td colspan="2" style="padding-top: 2px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 12px; font-weight: 700; color: #d4d4d8;">${score}</td></tr>
    </table>`;
}

function buildEmail(t: QuizType, second: QuizType, scores: Scores, siteUrl: string): string {
  const quizUrl = `${siteUrl}/tools/runner-quiz?r=${t.id}`;
  const shirtUrl = `${siteUrl}/shop/runner-type-tee?type=${t.id}&s=${scores.join('-')}`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr><td style="height: 5px; background-color: ${t.colour}; border-radius: 12px 12px 0 0;"></td></tr>
          <tr>
            <td style="padding: 40px 32px 24px; background-color: #18181b;">
              <p style="margin: 0 0 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #f88c00;">Your runner type</p>
              <h1 style="margin: 0 0 12px; font-size: 38px; font-weight: 900; color: #fafafa; line-height: 1.05;">${t.shirtLines.map(esc).join('<br />')}</h1>
              <p style="margin: 0 0 20px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #a1a1aa;">${esc(t.name)}</p>
              <p style="margin: 0; font-size: 16px; color: #d4d4d8; line-height: 1.6;">${esc(t.profile)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px; background-color: #18181b; border-top: 1px solid #27272a;">
              <p style="margin: 0 0 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #71717a;">Your Runner DNA</p>
              ${QUIZ.axes.map((a, k) => axisRow(a.low, a.high, scores[k], t.colour)).join('')}
              <p style="margin: 8px 0 0; font-size: 15px; color: #d4d4d8;">With a streak of ${esc(second.name)}.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px; background-color: #18181b; border-top: 1px solid #27272a;">
              ${t.traits.map((x) => `<p style="margin: 0 0 8px; font-size: 14px; color: #a1a1aa;"><span style="color: #f88c00; font-weight: 700; margin-right: 8px;">&#x2022;</span>${esc(x)}</p>`).join('')}
              <p style="margin: 16px 0 0; font-size: 20px; font-weight: 700; font-style: italic; color: #fafafa;">&ldquo;${esc(t.mantra)}&rdquo;</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px; background-color: #18181b; border-top: 1px solid #27272a;" align="center">
              <a href="${shirtUrl}" style="display: inline-block; margin: 0 6px 12px; padding: 14px 28px; background-color: #f88c00; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 999px;">Get the ${esc(t.name)} shirt</a>
              <a href="https://youtu.be/${t.film.id}" style="display: inline-block; margin: 0 6px 12px; padding: 14px 28px; background-color: #27272a; color: #fafafa; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 999px;">Watch: ${esc(t.film.title)}</a>
              <p style="margin: 8px 0 0; font-size: 13px;"><a href="${quizUrl}" style="color: #a1a1aa;">Share your result</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #09090b; border-top: 1px solid #27272a; border-radius: 0 0 12px 12px;" align="center">
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #f88c00;">filmmyrun.com</p>
              <p style="margin: 0; color: #52525b; font-size: 11px; line-height: 1.5;">You received this because you asked for your Runner Quiz result.</p>
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

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const result = parseResult(body);
    if (!result) {
      return NextResponse.json({ error: 'Invalid result' }, { status: 400 });
    }

    const { email, subscribeNewsletter } = parsed.data;
    const { type, scores } = result;
    const second = rankTypes(scores)[1];

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
      subject: `You're a ${type.name}: your Runner Quiz result`,
      html: buildEmail(type, second, scores, siteUrl),
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
