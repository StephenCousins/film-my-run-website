/**
 * Sending an approved newsletter issue. Only ever on an explicit POST (the editor's "Send now" or
 * the confirmation page's button), never on a GET, so a mail scanner that prefetches the emailed
 * link, or a stray click, can't send anything. Deps injected, so it is tested without Prisma/Resend.
 */
import { buildNewsletterHtml, type NewsletterPayload } from '@/lib/newsletter-template';

export type Issue = { id: number; subject: string; status: string; recipient_count: number; content: unknown };
export type Recipient = { email: string; token: string };

export type SendDeps = {
  findIssue: (token: string) => Promise<Issue | null>;
  /** Atomically draft → sending; false if another request got there first (or it's sent). */
  claim: (id: number) => Promise<boolean>;
  /** sending → draft again, after a failure, so it can be retried. */
  release: (id: number) => Promise<void>;
  markSent: (id: number, count: number) => Promise<void>;
  subscribers: () => Promise<Recipient[]>;
  sendBatch: (emails: { from: string; to: string; subject: string; html: string; headers?: Record<string, string> }[]) => Promise<void>;
  adminEmails?: string;
  from: string;
  baseUrl: string;
};

/** Active subscribers, plus the admin addresses (who get a copy without an unsubscribe link). */
export async function recipients(d: Pick<SendDeps, 'subscribers' | 'adminEmails'>): Promise<Recipient[]> {
  const list = await d.subscribers();
  for (const email of (d.adminEmails ?? '').split(',').map((e) => e.trim()).filter(Boolean)) {
    if (!list.some((s) => s.email === email)) list.push({ email, token: 'admin' });
  }
  return list;
}

/** Section headings the issue has, in email order, for the confirmation page. */
export function sectionHeadings(p: NewsletterPayload): string[] {
  const has: [boolean, string][] = [
    [!!p.intro?.trim(), 'Intro'],
    [!!p.blogPost, `Latest post: ${p.blogPost?.title ?? ''}`],
    [!!p.videoOfTheWeek, `Video of the week: ${p.videoOfTheWeek?.title ?? ''}`],
    [!!p.news?.length, `Trail & ultra news (${p.news?.length ?? 0})`],
    [!!p.parkrun, 'parkrun'],
    [!!p.appOfTheWeek, `App of the week: ${p.appOfTheWeek?.name ?? ''}`],
    [!!p.sessionOfTheWeek, `Session of the week: ${p.sessionOfTheWeek?.title ?? ''}`],
    [!!p.trainingTip, 'Training tip'],
    [!!p.scienceSection, 'Science says'],
    [!!p.nutritionTip, 'Nutrition'],
    [!!p.fromTheArchives, `From the archives: ${p.fromTheArchives?.title ?? ''}`],
    [!!p.whatsNew, "What's new"],
  ];
  return has.filter(([on]) => on).map(([, label]) => label);
}

export type SendResult =
  | { kind: 'sent'; count: number }
  | { kind: 'not-found' }
  | { kind: 'already'; count: number }
  | { kind: 'busy' }
  | { kind: 'failed'; error: string };

export async function sendIssue(token: string, d: SendDeps): Promise<SendResult> {
  const issue = await d.findIssue(token);
  if (!issue) return { kind: 'not-found' };
  if (issue.status === 'sent') return { kind: 'already', count: issue.recipient_count };
  if (!(await d.claim(issue.id))) return { kind: 'busy' };
  try {
    const payload = issue.content as NewsletterPayload;
    const list = await recipients(d);
    for (let i = 0; i < list.length; i += 100) {
      await d.sendBatch(
        list.slice(i, i + 100).map((sub) => {
          const unsubscribeUrl = sub.token === 'admin' ? '#' : `${d.baseUrl}/api/newsletter/unsubscribe?token=${sub.token}`;
          return {
            from: d.from,
            to: sub.email,
            subject: payload.subject,
            html: buildNewsletterHtml(payload, unsubscribeUrl, d.baseUrl),
            // One-click unsubscribe in the mail app itself (RFC 8058), as Gmail and Yahoo require.
            ...(sub.token !== 'admin' && {
              headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
            }),
          };
        })
      );
    }
    await d.markSent(issue.id, list.length);
    return { kind: 'sent', count: list.length };
  } catch (e) {
    await d.release(issue.id).catch(() => {});
    return { kind: 'failed', error: (e as Error).message };
  }
}
