import { prisma } from '@/lib/db';
import { NEWS_CONFIG } from '@/lib/news/config';
import { monthSpentUsd } from '@/lib/news/run';
import { sanitizeContent } from '@/lib/sanitize';
import { checkedBio, positionRank, PROFILE_ESTIMATE_USD } from './auto';
import { gatherRunner, raceKey } from './gather';
import { loadNameIndex, mentionedSlugs } from './names';
import { verifiedBioText } from './runner-file';
import { saveRunner } from './save';
import type { BestFinish, Discipline, RunnerFile, RunnerPhoto, RunnerSource } from './types';
import { checkProfile, editProfile, reviseProfile } from './write';

export const MONTHLY_BIO_LIMIT = 20;
export const MONTHLY_BUDGET_USD = 3.0;
const PREVIOUS = 'Film My Run previous profile';

/** A published runners row, as much of it as the refresh reads. */
export interface PageRow {
  slug: string; name: string; aliases: string[]; nationality: string | null; sex: string | null; birth_year: number | null;
  disciplines: string[]; era: string; bio: string; best_finishes: unknown; sources: unknown; photos: unknown;
  utmb_id: number | null; utmb_uri: string | null; utmb_index: number | null; written_by: string; bio_checked_at: Date | null;
}

export interface MonthlyDeps {
  runners: () => Promise<PageRow[]>;
  /** Slugs whose bio failed for a real reason in the last 30 days: not tried again. */
  recentFailures: () => Promise<Set<string>>;
  /** The newest published story that mentions each runner (the "In the news" matcher). */
  latestNews: () => Promise<Map<string, Date>>;
  monthSpentUsd: () => Promise<number>;
  gather: (row: PageRow) => Promise<RunnerFile | null>;
  write: typeof reviseProfile;
  check: typeof checkProfile;
  edit: typeof editProfile;
  save: (f: RunnerFile, writtenBy: 'session' | 'auto') => Promise<unknown>;
  /** Hears the summary so far after every bio, so a killed job still leaves its spend recorded. */
  progress?: (s: MonthlySummary) => Promise<void>;
  /** Wall-clock budget from the start for starting new bios, ms (default 10 minutes). */
  bioDeadlineMs?: number;
  clock?: () => number;
}

export interface MonthlySummary { biosRefreshed: string[]; skipped: { slug: string; reason: string }[]; costUsd: number; cutShort: boolean }

/** Skips that are a limit, not something wrong with the page: never held against it. */
const NOT_A_FAILURE = /^(budget|out of time|failed recently)$/;

/** Pure: the slugs whose bio failed for a real reason, across several runs' summaries. */
export function monthlyFailures(summaries: unknown[]): Set<string> {
  const out = new Set<string>();
  for (const x of summaries) for (const k of (x as { monthlyRefresh?: MonthlySummary } | null)?.monthlyRefresh?.skipped ?? []) if (!NOT_A_FAILURE.test(k.reason)) out.add(k.slug);
  return out;
}

const SELECT = { slug: true, name: true, aliases: true, nationality: true, sex: true, birth_year: true, disciplines: true, era: true, bio: true, best_finishes: true, sources: true, photos: true, utmb_id: true, utmb_uri: true, utmb_index: true, written_by: true, bio_checked_at: true } as const;

export const liveMonthlyDeps = (): MonthlyDeps => ({
  runners: () => prisma.runners.findMany({ where: { status: 'published' }, select: SELECT }),
  recentFailures: async () => {
    const rows = await prisma.news_runs.findMany({ where: { started_at: { gte: new Date(Date.now() - 30 * 86_400_000) } }, select: { summary: true } });
    return monthlyFailures(rows.map((r) => r.summary));
  },
  latestNews: async () => {
    // ponytail: every published story, like storiesAbout; filter by date if it passes a few thousand.
    const index = await loadNameIndex();
    const rows = await prisma.news_stories.findMany({ where: { status: 'published' }, select: { content: true, published_at: true, created_at: true } });
    const out = new Map<string, Date>();
    for (const r of rows) {
      const at = r.published_at ?? r.created_at;
      for (const slug of mentionedSlugs(sanitizeContent(r.content), index)) if (!(out.get(slug)! > at)) out.set(slug, at);
    }
    return out;
  },
  monthSpentUsd: () => monthSpentUsd(new Date()),
  // No UTMB link on the page: Wikipedia and our stories only, never a UTMB name search (a namesake).
  gather: (row) => gatherRunner(row.utmb_uri ? { utmbUri: row.utmb_uri, era: row.era as 'current' | 'historic' } : { name: row.name, era: row.era as 'current' | 'historic', noUtmbSearch: true }),
  write: (f, prev) => reviseProfile(f, prev),
  check: (f, b) => checkProfile(f, b),
  edit: (f, b, fix) => editProfile(f, b, fix),
  save: (f, by) => saveRunner(f, by),
});

const isPodium = (b: BestFinish) => /^(1st|2nd|3rd)\b/.test(b.position ?? '');
/** Same race (its first two words, as gather matches races) in the same year. */
const key = (b: BestFinish) => `${raceKey(b.race)}|${b.year}`;
const FMR = 'Film My Run';

/**
 * Existing finishes plus the new ones. Nothing a session chose is ever dropped: over
 * 10, only UTMB entries go, lowest place first, then oldest.
 */
export function mergeFinishes(have: BestFinish[], added: BestFinish[]): BestFinish[] {
  const all = [...have, ...added];
  const droppable = all.filter((b) => b.source === 'UTMB').sort((a, b) => positionRank(b.position) - positionRank(a.position) || a.year - b.year);
  const drop = new Set(droppable.slice(0, Math.max(0, all.length - 10)));
  return all.filter((b) => !drop.has(b));
}

/** Old sources plus new ones by URL; one "Film My Run" entry, the newest. */
function mergeSources(old: RunnerSource[], fresh: RunnerSource[]): RunnerSource[] {
  const hasNewFmr = fresh.some((s) => s.name === FMR);
  const kept = old.filter((s) => !(hasNewFmr && s.name === FMR));
  return [...kept, ...fresh.filter((s) => !kept.some((o) => o.url === s.url))];
}
/** After the last bio check: by date when the result has one, else a later year. */
const isNew = (b: BestFinish, since: Date | null) => !since || (b.date ? new Date(b.date) > since : b.year > since.getUTCFullYear());

/** A UTMB podium in the page's best finishes since its bio was last checked: the bio should mention it. */
export const hasNewPodium = (r: Pick<PageRow, 'best_finishes' | 'bio_checked_at'>) =>
  ((r.best_finishes as BestFinish[] | null) ?? []).some((b) => b.source === 'UTMB' && isPodium(b) && isNew(b, r.bio_checked_at));

/**
 * New UTMB podiums from a freshly read results list, merged into the page's best
 * finishes (no AI; the weekly UTMB refresh calls it). Not a duplicate, not one from
 * before the last bio check. Null when nothing new survives the cap of 10. Adds the
 * UTMB source in the same update when the page lacks one.
 */
export function addPodiums(row: Pick<PageRow, 'best_finishes' | 'sources' | 'bio_checked_at' | 'utmb_uri'>, results: BestFinish[]): { finishes: BestFinish[]; sources: RunnerSource[]; added: number } | null {
  const have = (row.best_finishes as BestFinish[] | null) ?? [];
  const seen = new Set(have.map(key));
  const added = results.filter((b) => isPodium(b) && isNew(b, row.bio_checked_at) && !seen.has(key(b)) && seen.add(key(b)));
  if (!added.length) return null;
  const finishes = mergeFinishes(have, added);
  const kept = added.filter((b) => finishes.includes(b)).length;
  if (!kept) return null;
  const old = (row.sources as RunnerSource[] | null) ?? [];
  const sources = old.some((s) => s.name === 'UTMB') ? old : [...old, { name: 'UTMB', url: `https://utmb.world/en/runner/${row.utmb_uri}` }];
  return { finishes, sources, added: kept };
}
const unescape = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/**
 * Once a month (Stephen, 28 Sep 2026): up to 20 bios with a new podium (added by the
 * weekly UTMB refresh since 20 Oct 2026) or a newer story are revised through
 * OpenRouter and the same fix loop as automatic pages. A bio that fails the checks
 * leaves the old one untouched and isn't retried for 30 days. Its own $3 budget, never
 * more than what's left of the monthly news ceiling; no bio starts after 10 minutes.
 */
export async function monthlyRefresh(deps: MonthlyDeps = liveMonthlyDeps()): Promise<MonthlySummary> {
  const clock = deps.clock ?? Date.now;
  const start = clock();
  const bioDeadline = start + (deps.bioDeadlineMs ?? 10 * 60_000);
  const out: MonthlySummary = { biosRefreshed: [], skipped: [], costUsd: 0, cutShort: false };
  const rows = await deps.runners();

  // 1. Which bios.
  const news = await deps.latestNews();
  const newsAfter = (r: PageRow) => {
    const at = news.get(r.slug);
    return at && (!r.bio_checked_at || at > r.bio_checked_at) ? at.getTime() : 0;
  };
  const picked = rows
    .filter((r) => hasNewPodium(r) || newsAfter(r) > 0)
    .sort((a, b) => newsAfter(b) - newsAfter(a) || (b.utmb_index ?? -1) - (a.utmb_index ?? -1))
    .slice(0, MONTHLY_BIO_LIMIT);

  // 2. Revise them.
  const failed = await deps.recentFailures();
  const budget = Math.min(MONTHLY_BUDGET_USD, NEWS_CONFIG.monthlyCeilingGbp * NEWS_CONFIG.usdPerGbp - (await deps.monthSpentUsd()));
  for (const row of picked) {
    if (failed.has(row.slug)) { out.skipped.push({ slug: row.slug, reason: 'failed recently' }); continue; }
    if (clock() >= bioDeadline) { out.cutShort = true; out.skipped.push({ slug: row.slug, reason: 'out of time' }); continue; }
    if (budget - out.costUsd < PROFILE_ESTIMATE_USD) { out.cutShort = true; out.skipped.push({ slug: row.slug, reason: 'budget' }); continue; }
    try {
      const g = await deps.gather(row);
      if (!g) { out.skipped.push({ slug: row.slug, reason: 'no UTMB entry or Wikipedia article found' }); continue; }
      const previous = unescape(verifiedBioText(row.bio)).split(/\n\n+/).filter(Boolean);
      const sources = mergeSources((row.sources as RunnerSource[] | null) ?? [], g.texts.map((t) => t.source));
      const utmb = g.utmb ?? (row.utmb_uri && row.utmb_id ? { id: row.utmb_id, uri: row.utmb_uri, index: row.utmb_index, website: null } : null);
      // The page as saved: everything it already has, only the bio and sources new.
      const page = (bio: string[]): RunnerFile => ({
        ...g, slug: row.slug, name: row.name, aliases: row.aliases, nationality: row.nationality ?? g.nationality, sex: (row.sex as 'M' | 'F' | null) ?? g.sex,
        birthYear: row.birth_year, disciplines: row.disciplines as Discipline[], era: row.era as 'current' | 'historic', utmb,
        bio, bestFinishes: (row.best_finishes as BestFinish[] | null) ?? [], photos: (row.photos as RunnerPhoto[] | null) ?? [], sources,
      });
      // What the writer and checker see: the previous profile is one more source, but not
      // one the near-copy check runs against (a revision is meant to keep its wording).
      const f: RunnerFile = { ...page([]), texts: [...g.texts, { source: { name: PREVIOUS, url: `https://filmmyrun.com/runners/${row.slug}` }, text: previous.join('\n\n') }] };
      const w = await deps.write(f, previous);
      out.costUsd += w.costUsd;
      if (!w.bio) { out.skipped.push({ slug: row.slug, reason: 'the writer returned nothing' }); continue; }
      const r = await checkedBio(f, w.bio, page, deps);
      out.costUsd += r.costUsd;
      if (!r.bio) { out.skipped.push({ slug: row.slug, reason: r.reason ?? 'failed the checks' }); console.log(`Monthly refresh kept the old bio for ${row.slug}: ${r.reason}`); continue; }
      await deps.save(page(r.bio), row.written_by === 'auto' ? 'auto' : 'session');
      out.biosRefreshed.push(row.slug);
    } catch (e) {
      out.skipped.push({ slug: row.slug, reason: `error: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}` });
    }
    await deps.progress?.(out).catch((e) => console.error("monthly refresh: progress record failed", e));
  }
  return out;
}
