/**
 * Things that have gone wrong in real issues, checked before the draft is emailed and again before it is sent.
 * Warnings only: the draft still goes out to Stephen, with the list at the top.
 */
import type { NewsletterPayload } from '@/lib/newsletter-template';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
/** A parkrun card is only right for the weekend just gone (Saturday, Christmas Day or New Year's Day). */
export const PARKRUN_MAX_DAYS = 6;

const londonWeekday = (d: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long' }).format(d).toLowerCase();
const norm = (u: string) => u.split(/[?#]/)[0].replace(/\/$/, '');

export function checkIssue(p: NewsletterPayload, ctx: { now: Date; lastParkrun?: Date | null }): string[] {
  const out: string[] = [];

  const links: [string, string | undefined][] = [
    ['Latest post', p.blogPost?.url],
    ['From the archives', p.fromTheArchives?.url],
    ['Video of the week', p.videoOfTheWeek?.url],
    ...(p.news ?? []).map((n, i): [string, string] => [`News ${i + 1}`, n.url]),
  ];
  const seen = new Map<string, string>();
  for (const [where, url] of links) {
    if (!url) continue;
    const key = norm(url);
    if (seen.has(key)) out.push(`${where} is the same link as ${seen.get(key)}: ${url}`);
    else seen.set(key, where);
  }

  (p.news ?? []).forEach((n, i) => {
    if (!n.description?.trim()) out.push(`News ${i + 1} ("${n.title}") has no blurb.`);
    try {
      if (new URL(n.url).pathname.replace(/\/$/, '') === '/news') out.push(`News ${i + 1} ("${n.title}") links to the news page, not the story.`);
    } catch {
      out.push(`News ${i + 1} ("${n.title}") has a broken link: ${n.url}`);
    }
  });

  const greeting = (p.intro ?? '').trim().split(/[.!?\n]/)[0].toLowerCase();
  const today = londonWeekday(ctx.now);
  const named = DAYS.find((d) => greeting.includes(d));
  if (named && named !== today) out.push(`The greeting mentions ${cap(named)} but it's ${cap(today)}.`);
  else if (/weekend/.test(greeting) && !['friday', 'saturday', 'sunday'].includes(today)) out.push(`The greeting mentions the weekend but it's ${cap(today)}.`);

  if (p.parkrun) {
    const days = ctx.lastParkrun ? (ctx.now.getTime() - ctx.lastParkrun.getTime()) / 86_400_000 : Infinity;
    if (days > PARKRUN_MAX_DAYS + 1) {
      const when = ctx.lastParkrun ? ctx.lastParkrun.toISOString().slice(0, 10) : 'not found';
      out.push(`There's a parkrun card, but your last parkrun was ${when}. Remove it if you didn't run this weekend.`);
    }
  }

  return out;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** For HTML pages and the draft email. */
export function warningsHtml(warnings: string[]): string {
  if (!warnings.length) return '';
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  return `<div style="margin:16px auto;max-width:600px;padding:16px 20px;background:#fef2f2;border:2px solid #dc2626;border-radius:8px;text-align:left;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#7f1d1d;font-size:14px">
  <p style="margin:0 0 8px;font-weight:700;font-size:16px">Check before sending (${warnings.length})</p>
  <ul style="margin:0;padding-left:20px">${warnings.map((w) => `<li style="margin:4px 0">${esc(w)}</li>`).join('')}</ul>
</div>`;
}
