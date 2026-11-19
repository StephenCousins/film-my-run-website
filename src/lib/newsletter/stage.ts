/** Builds this week's draft, checks it, and emails it to the admin for review. Server only. */
import crypto from 'crypto';
import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { buildNewsletterHtml, wrapWithApprovalBanner, type NewsletterPayload } from '@/lib/newsletter-template';
import { autoPopulateNewsletter } from '@/lib/newsletter-auto-populate';
import { getAllParkruns } from '@/lib/parkrun-db';
import { londonClock } from '@/lib/push/news-push';
import { checkIssue, warningsHtml } from './checks';

export const baseUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.com';

/** Most recent parkrun date, or null. */
export async function lastParkrunDate(): Promise<Date | null> {
  const runs = await getAllParkruns().catch(() => []);
  const d = runs[0] ? new Date(runs[0].date) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

/** Start of today in London (to the minute), as a UTC instant. */
export function londonMidnight(now: Date): Date {
  return new Date(now.getTime() - londonClock(now).minutes * 60_000 - now.getUTCSeconds() * 1000 - now.getUTCMilliseconds());
}

/** An issue created since London midnight today (sent_at is the creation time). */
export async function issueToday(now = new Date()) {
  return prisma.newsletter_issues.findFirst({ where: { sent_at: { gte: londonMidnight(now) } }, orderBy: { id: 'desc' } });
}

export type StageResult = { status: 'draft'; issueId: number; warnings: string[] } | { status: 'exists'; issueId: number };

/**
 * One draft a day: a second call (the timer and GitHub both firing, or a double click) returns the existing one
 * without emailing again. `force` makes a fresh one anyway.
 */
export async function stageDraft(payload: NewsletterPayload, opts: { force?: boolean; now?: Date } = {}): Promise<StageResult> {
  const now = opts.now ?? new Date();
  if (!opts.force) {
    const existing = await issueToday(now);
    if (existing) return { status: 'exists', issueId: existing.id };
  }
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.NEWSLETTER_ADMIN_EMAIL;
  if (!resendKey) throw new Error('RESEND_API_KEY not configured');
  if (!adminEmail) throw new Error('NEWSLETTER_ADMIN_EMAIL not configured');

  const base = baseUrl();
  await autoPopulateNewsletter(payload, base, false);
  const warnings = checkIssue(payload, { now, lastParkrun: await lastParkrunDate() });

  const approveToken = crypto.randomUUID();
  const issue = await prisma.newsletter_issues.create({
    data: { subject: payload.subject, content: payload as object, recipient_count: 0, status: 'draft', approve_token: approveToken },
  });

  const html = wrapWithApprovalBanner(
    buildNewsletterHtml(payload, '#', base, `${base}/api/newsletter/view/${issue.id}`),
    `${base}/api/newsletter/approve?token=${approveToken}`,
    `${base}/admin/newsletter/${approveToken}`,
  ).replace(/<body([^>]*)>/, `<body$1>${warningsHtml(warnings)}`);

  const resend = new Resend(resendKey);
  const from = process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>';
  for (const to of adminEmail.split(',').map((e) => e.trim()).filter(Boolean)) {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `[DRAFT${warnings.length ? `, ${warnings.length} to check` : ''}] ${payload.subject}`,
      html,
    });
    if (error) throw new Error(`Draft email failed: ${error.message}`);
  }
  return { status: 'draft', issueId: issue.id, warnings };
}

/** Plain alert to the admin (no draft). */
export async function emailAdmin(subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = (process.env.NEWSLETTER_ADMIN_EMAIL ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  if (!key || !to.length) throw new Error('RESEND_API_KEY or NEWSLETTER_ADMIN_EMAIL not configured');
  const { error } = await new Resend(key).emails.send({ from: process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>', to, subject, text });
  if (error) throw new Error(error.message);
}
