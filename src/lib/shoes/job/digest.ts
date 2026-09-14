import { createHmac, timingSafeEqual } from 'crypto';
import { Resend } from 'resend';
import type { JobReport } from './weekly';

/**
 * Resend delivers from the default `onboarding@resend.dev` sender only to the
 * account owner's address until filmmyrun.com is verified at resend.com/domains,
 * so the digest goes to the gmail address by default. Override with SHOE_DIGEST_TO.
 */
export const DIGEST_TO = process.env.SHOE_DIGEST_TO || 'stephen.cousins@gmail.com';

/** Throws without CRON_SECRET: a link signed with an empty key would be guessable by anyone who read this file. */
export function publishToken(candidateId: number): string {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET is not set');
  return createHmac('sha256', secret).update(String(candidateId)).digest('hex');
}

/** Constant-time compare; no secret or a length mismatch is a plain reject (timingSafeEqual throws on unequal lengths). */
export function verifyPublishToken(candidateId: number, token: string): boolean {
  if (!process.env.CRON_SECRET) return false;
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

interface Line {
  text: string;
  /** Labelled links after the text. There is no per-shoe page yet, so a shoe links to its API record and to the finder. */
  links?: { label: string; href: string }[];
  note?: string;
  /** Held rows only: the signed one-click publish link. */
  publishUrl?: string;
}
interface Section { title: string; lines: Line[]; empty: string }

function sections(report: JobReport, baseUrl: string, signPublish: (candidateId: number) => string): Section[] {
  const shoeLinks = (slug: string) => [
    { label: 'data', href: `${baseUrl}/api/shoes/${slug}` },
    { label: 'finder', href: `${baseUrl}/tools/shoe-finder` },
  ];
  return [
    {
      title: `Published (${report.published.length})`,
      lines: report.published.map(p => ({ text: p.slug, links: shoeLinks(p.slug), note: p.imageUrl ? undefined : 'no image' })),
      empty: 'Nothing published.',
    },
    {
      title: `Held (${report.held.length})`,
      lines: report.held.map(h => ({ text: h.slug, note: h.reasons.join(', '), publishUrl: signPublish(h.id) })),
      empty: 'Nothing held.',
    },
    {
      title: `Linked to existing shoes (${report.linkedExisting.length})`,
      lines: report.linkedExisting.map(slug => ({ text: slug, links: shoeLinks(slug) })),
      empty: 'None.',
    },
    {
      title: `Errors (${report.errored.length})`,
      lines: report.errored.map(e => ({ text: e.slug, note: e.error })),
      empty: 'No errors.',
    },
    {
      title: `Images stored (${report.imagesStored.length})`,
      lines: report.imagesStored.map(slug => ({ text: slug, links: shoeLinks(slug) })),
      empty: 'None stored.',
    },
    {
      title: `Images cleared (${report.imagesCleared.length})`,
      lines: report.imagesCleared.map(slug => ({ text: slug, links: shoeLinks(slug) })),
      empty: 'None cleared.',
    },
    {
      title: `Feeds that returned nothing (${report.feedsEmpty.length})`,
      lines: report.feedsEmpty.map(f => ({ text: f })),
      empty: 'Every feed had entries.',
    },
    {
      title: `Stores that returned nothing (${report.storesEmpty.length})`,
      lines: report.storesEmpty.map(f => ({ text: f })),
      empty: 'Every store had something.',
    },
  ];
}

/** One line on where discovery stood: what it found, from which kinds of source, and which sources went quiet or refused. */
export function discoverySummary(report: JobReport): string {
  const n = report.nominations;
  const list = (xs: string[]) => (xs.length ? xs.join(', ') : 'none');
  return `Discovered ${report.discovered} from ${n.feeds + n.shops + n.versionBumps} nominations (feeds ${n.feeds}, shops ${n.shops}, version bumps ${n.versionBumps}); feeds empty: ${list(report.feedsEmpty)}; stores empty: ${list(report.storesEmpty)}`;
}

function summaryLines(report: JobReport): string[] {
  return [
    discoverySummary(report),
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
      ...(s.lines.length ? s.lines.map(l => `- ${l.text}${(l.links ?? []).map(k => ` ${k.label}: ${k.href}`).join('')}${l.note ? ` (${l.note})` : ''}${l.publishUrl ? ` publish anyway: ${l.publishUrl}` : ''}`) : [s.empty]),
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
        ? `<ul style="margin: 0; padding-left: 20px; line-height: 1.7;">${s.lines.map(l => `<li>${escapeHtml(l.text)}${(l.links ?? []).map(k => ` <a href="${escapeHtml(k.href)}" style="color: #18181b;">${escapeHtml(k.label)}</a>`).join('')}${l.note ? ` <span style="color: #52525b;">(${escapeHtml(l.note)})</span>` : ''}${l.publishUrl ? ` <a href="${escapeHtml(l.publishUrl)}" style="color: #f88c00;">publish anyway</a>` : ''}</li>`).join('')}</ul>`
        : `<p style="margin: 0; color: #a1a1aa;">${escapeHtml(s.empty)}</p>`}`).join('')}
      <p style="margin-top: 24px; font-size: 12px; color: #a1a1aa;">Sent by the Shoe Finder weekly job on filmmyrun.com</p>
    </div>
  `;
  return { subject, html, text };
}

export interface SendDeps {
  apiKey: string | undefined;
  baseUrl: string;
  /** The Resend SDK's shape: it resolves `{ data, error }` and never throws on an API error. */
  send: (msg: { from: string; to: string; subject: string; html: string; text: string }) => Promise<{ error: { name: string; message: string } | null }>;
}

function liveSendDeps(): SendDeps {
  const apiKey = process.env.RESEND_API_KEY;
  return {
    apiKey,
    baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.com',
    send: msg => new Resend(apiKey).emails.send(msg),
  };
}

/**
 * Emails the digest to Stephen. Skipped (returns false) on a dry run or
 * without a Resend key. A Resend API error (unverified sender, 422, 429)
 * comes back in the response rather than as a throw, so it is turned into
 * one here: a digest that quietly never arrives is the failure this whole
 * pipeline was built to end.
 */
export async function sendDigest(report: JobReport, deps: SendDeps = liveSendDeps()): Promise<boolean> {
  if (report.dryRun || !deps.apiKey) return false;
  if (!process.env.CRON_SECRET) { console.warn('Shoe Finder digest not sent: CRON_SECRET is not set, cannot sign publish links'); return false; }
  const { subject, html, text } = renderDigest(report, deps.baseUrl, id => publishLink(deps.baseUrl, id));
  const { error } = await deps.send({ from: process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>', to: DIGEST_TO, subject, html, text });
  if (error) throw new Error(`Resend: ${error.name}: ${error.message}`);
  return true;
}
