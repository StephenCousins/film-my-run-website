import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { addPodiums } from './monthly';
import type { BestFinish, RunnerSource } from './types';
import { utmbRunner } from './utmb';

/** What the refresh writes besides the index: the full results, and new podiums when there are any. */
export interface ResultsUpdate { results: BestFinish[]; finishes?: BestFinish[]; sources?: RunnerSource[] }
type Row = { slug: string; utmb_uri: string | null; utmb_index: number | null; best_finishes?: unknown; sources?: unknown; bio_checked_at?: Date | null };

interface RefreshDeps {
  runners: () => Promise<Row[]>;
  read: (uri: string) => Promise<{ index: number | null; results?: BestFinish[] } | null>;
  update: (slug: string, index: number | null, at: Date) => Promise<void>;
  /** Stores a runner's full UTMB results (and new podiums); left out, results are not stored. */
  saveResults?: (slug: string, u: ResultsUpdate) => Promise<void>;
  now: Date;
  /** Wall-clock budget for the whole refresh, ms; default 5 minutes. Kept separate from
   * `now` (which only timestamps the writes), so a test can pass 0 without needing `now`
   * to be the real current time. */
  deadlineMs?: number;
  /** The clock the deadline is measured against; defaults to Date.now. */
  clock?: () => number;
}

const liveDeps = (): RefreshDeps => ({
  // Oldest-checked (and never-checked) runners first, so a run cut short by the
  // deadline doesn't starve the same tail of runners every week.
  runners: () => prisma.runners.findMany({ where: { utmb_uri: { not: null } }, select: { slug: true, utmb_uri: true, utmb_index: true, best_finishes: true, sources: true, bio_checked_at: true }, orderBy: { utmb_index_at: { sort: 'asc', nulls: 'first' } } }),
  read: (uri) => utmbRunner(uri),
  update: async (slug, index, at) => { await prisma.runners.update({ where: { slug }, data: { utmb_index: index, utmb_index_at: at } }); },
  saveResults: async (slug, u) => {
    const json = (v: unknown) => v as Prisma.InputJsonValue;
    await prisma.runners.update({ where: { slug }, data: { results: json(u.results), ...(u.finishes ? { best_finishes: json(u.finishes), sources: json(u.sources) } : {}) } });
  },
  now: new Date(),
});

/**
 * Every runner's UTMB Index, refreshed on Mondays inside the news run (no AI, no
 * cost). A page UTMB no longer serves is listed, never deleted, and a failed read
 * keeps the last index and its date.
 *
 * Two guards on top of that:
 * - A deadline (default 5 minutes) stops the run before it can outlast the job that
 *   calls it; whatever's left is reported as not checked, not as missing.
 * - If every page it did manage to read came back with no index at all, while some
 *   runner had one before, that's UTMB's page changing shape, not every runner
 *   genuinely losing their ranking overnight: nothing is written.
 */
/**
 * Since 20 Oct 2026 it also stores each runner's full UTMB results (the race history
 * on the page) and adds new podiums to best finishes, from the same page read, so a
 * weekend's win shows by Monday. A page that comes back with no results keeps the
 * stored ones.
 */
export async function refreshUtmbIndexes(deps: RefreshDeps = liveDeps()): Promise<{ updated: number; missing: string[]; cutShort?: number; note?: string; podiums?: number }> {
  const clock = deps.clock ?? Date.now;
  const deadline = clock() + (deps.deadlineMs ?? 5 * 60_000);
  const runners = await deps.runners();
  const attempted: { row: Row; slug: string; index: number | null; results: BestFinish[] }[] = [];
  const missing: string[] = [];
  let cutShort = 0;
  for (let i = 0; i < runners.length; i++) {
    if (clock() >= deadline) { cutShort = runners.length - i; break; }
    const r = runners[i];
    const page = r.utmb_uri ? await deps.read(r.utmb_uri) : null;
    if (!page) { missing.push(r.slug); continue; }
    attempted.push({ row: r, slug: r.slug, index: page.index, results: page.results ?? [] });
  }
  const hadKnownIndex = runners.some((r) => r.utmb_index !== null);
  if (attempted.length && attempted.every((a) => a.index === null) && hadKnownIndex) {
    const result: { updated: number; missing: string[]; cutShort?: number; note?: string } = { updated: 0, missing, note: 'UTMB pages no longer show an index; nothing changed' };
    if (cutShort) result.cutShort = cutShort;
    return result;
  }
  let podiums = 0;
  for (const a of attempted) {
    await deps.update(a.slug, a.index, deps.now);
    if (!deps.saveResults || !a.results.length) continue;
    const results = [...a.results].sort((x, y) => (y.date ?? String(y.year)).localeCompare(x.date ?? String(x.year)));
    const p = addPodiums({ best_finishes: a.row.best_finishes ?? [], sources: a.row.sources ?? [], bio_checked_at: a.row.bio_checked_at ?? null, utmb_uri: a.row.utmb_uri }, results);
    podiums += p?.added ?? 0;
    await deps.saveResults(a.slug, { results, ...(p ? { finishes: p.finishes, sources: p.sources } : {}) });
  }
  const result: { updated: number; missing: string[]; cutShort?: number; podiums?: number } = { updated: attempted.length, missing, ...(podiums ? { podiums } : {}) };
  if (cutShort) result.cutShort = cutShort;
  return result;
}
