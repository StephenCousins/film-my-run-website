import { createHmac, timingSafeEqual } from 'crypto';
import { Resend } from 'resend';
import type { JobReport } from './weekly';

export const DIGEST_TO = 'stephen@filmmyrun.com';

export function publishToken(candidateId: number): string {
  return createHmac('sha256', process.env.CRON_SECRET ?? '').update(String(candidateId)).digest('hex');
}

/** Constant-time compare; a length mismatch is a plain reject since timingSafeEqual throws on it. */
export function verifyPublishToken(candidateId: number, token: string): boolean {
  const expected = Buffer.from(publishToken(candidateId), 'utf8');
  const given = Buffer.from(token, 'utf8');
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

export function publishLink(baseUrl: string, candidateId: number): string {
  return `${baseUrl}/api/shoes/candidates/${candidateId}/publish?token=${publishToken(candidateId)}`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function digestSubject(report: JobReport): string {
  const errors = report.errored.length;
  return `Shoe Finder weekly${report.dryRun ? ' (dry run)' : ''}: ${report.published.length} published, ${report.held.length} held, ${errors} ${errors === 1 ? 'error' : 'errors'}`;
}

interface Section { title: string; lines: { text: string; href?: string; note?: string }[]; empty: string }

function sections(report: JobReport, baseUrl: string, signPublish: (candidateId: number) => string): Section[] {
  const shoeUrl = (slug: string) => `${baseUrl}/tools/shoe-finder/${slug}`;
  return [
    {
      title: `Published (${report.published.length})`,
      lines: report.published.map(p => ({ text: p.slug, href: shoeUrl(p.slug), note: p.imageUrl ? undefined : 'no image' })),
      empty: 'Nothing published.',
    },
    {
      title: `Held (${report.held.length})`,
      lines: report.held.map(h => ({ text: h.slug, note: `${h.reasons.join(', ')}; publish anyway: ${signPublish(h.id)}` })),
      empty: 'Nothing held.',
    },
    {
      title: `Linked to existing shoes (${report.linkedExisting.length})`,
      lines: report.linkedExisting.map(slug => ({ text: slug, href: shoeUrl(slug) })),
      empty: 'None.',
    },
    {
      title: `Errors (${report.errored.length})`,
      lines: report.errored.map(e => ({ text: e.slug, note: e.error })),
      empty: 'No errors.',
    },
    {
      title: `Images stored (${report.imagesStored.length})`,
      lines: report.imagesStored.map(slug => ({ text: slug, href: shoeUrl(slug) })),
      empty: 'None stored.',
    },
    {
      title: `Images cleared (${report.imagesCleared.length})`,
      lines: report.imagesCleared.map(slug => ({ text: slug, href: shoeUrl(slug) })),
      empty: 'None cleared.',
    },
    {
      title: `Feeds that returned nothing (${report.feedsEmpty.length})`,
      lines: report.feedsEmpty.map(f => ({ text: f })),
      empty: 'Every feed had entries.',
    },
  ];
}

function summaryLines(report: JobReport): string[] {
  return [
    `${report.discovered} new candidates discovered`,
    `${report.rejectedStale} stale holds rejected`,
    `${report.reviewsRefreshed} shoes had reviews refreshed`,
    `Ran in ${Math.round(report.durationMs / 1000)}s${report.dryRun ? ' (dry run: nothing was written)' : ''}`,
  ];
}

/**
 * The weekly email. Held candidates carry a signed one-click publish link
 * (the token is checked by the publish route), which is the only action the
 * digest asks for; everything else is a record. Every string in the report
 * came from a feed, a page or an error message and is escaped for the HTML.
 */
export function renderDigest(report: JobReport, baseUrl: string, signPublish: (candidateId: number) => string): { subject: string; html: string; text: string } {
  const subject = digestSubject(report);
  const secs = sections(report, baseUrl, signPublish);
  const summary = summaryLines(report);

  const text = [
    subject, '',
    ...summary, '',
    ...secs.flatMap(s => [
      s.title,
      ...(s.lines.length ? s.lines.map(l => `- ${l.text}${l.href ? ` ${l.href}` : ''}${l.note ? ` (${l.note})` : ''}`) : [s.empty]),
      '',
    ]),
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #18181b;">
      <h2 style="margin: 0 0 4px; color: #f88c00;">${escapeHtml(subject)}</h2>
      <p style="margin: 0 0 20px; color: #52525b; font-size: 14px;">${summary.map(escapeHtml).join('<br>')}</p>
      ${secs.map(s => `
      <h3 style="margin: 20px 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #52525b;">${escapeHtml(s.title)}</h3>
      ${s.lines.length
        ? `<ul style="margin: 0; padding-left: 20px; line-height: 1.7;">${s.lines.map(l => `<li>${l.href ? `<a href="${escapeHtml(l.href)}" style="color: #18181b;">${escapeHtml(l.text)}</a>` : escapeHtml(l.text)}${l.note ? ` <span style="color: #52525b;">(${linkify(l.note)})</span>` : ''}</li>`).join('')}</ul>`
        : `<p style="margin: 0; color: #a1a1aa;">${escapeHtml(s.empty)}</p>`}`).join('')}
      <p style="margin-top: 24px; font-size: 12px; color: #a1a1aa;">Sent by the Shoe Finder weekly job on filmmyrun.com</p>
    </div>
  `;
  return { subject, html, text };
}

/** Notes are plain text except for the publish link, which becomes an anchor. */
function linkify(note: string): string {
  const i = note.indexOf('https://');
  if (i === -1) return escapeHtml(note);
  const url = note.slice(i);
  return `${escapeHtml(note.slice(0, i))}<a href="${escapeHtml(url)}" style="color: #f88c00;">publish</a>`;
}

export interface SendDeps {
  apiKey: string | undefined;
  baseUrl: string;
  send: (msg: { from: string; to: string; subject: string; html: string; text: string }) => Promise<void>;
}

function liveSendDeps(): SendDeps {
  const apiKey = process.env.RESEND_API_KEY;
  return {
    apiKey,
    baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.com',
    send: async msg => { await new Resend(apiKey).emails.send(msg); },
  };
}

/** Emails the digest to Stephen. Skipped (returns false) on a dry run or without a Resend key. */
export async function sendDigest(report: JobReport, deps: SendDeps = liveSendDeps()): Promise<boolean> {
  if (report.dryRun || !deps.apiKey) return false;
  const { subject, html, text } = renderDigest(report, deps.baseUrl, id => publishLink(deps.baseUrl, id));
  await deps.send({ from: process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>', to: DIGEST_TO, subject, html, text });
  return true;
}
