import { prisma } from '@/lib/db';
import { utmbRunner } from './utmb';

interface RefreshDeps {
  runners: () => Promise<{ slug: string; utmb_uri: string | null; utmb_index: number | null }[]>;
  read: (uri: string) => Promise<{ index: number | null } | null>;
  update: (slug: string, index: number | null, at: Date) => Promise<void>;
  now: Date;
  /** Wall-clock budget for the whole refresh, ms; default 5 minutes. Kept separate from
   * `now` (which only timestamps the writes), so a test can pass 0 without needing `now`
   * to be the real current time. */
  deadlineMs?: number;
  /** The clock the deadline is measured against; defaults to Date.now. */
  clock?: () => number;
}

const liveDeps = (): RefreshDeps => ({
  runners: () => prisma.runners.findMany({ where: { utmb_uri: { not: null } }, select: { slug: true, utmb_uri: true, utmb_index: true } }),
  read: (uri) => utmbRunner(uri),
  update: async (slug, index, at) => { await prisma.runners.update({ where: { slug }, data: { utmb_index: index, utmb_index_at: at } }); },
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
export async function refreshUtmbIndexes(deps: RefreshDeps = liveDeps()): Promise<{ updated: number; missing: string[]; cutShort?: number; note?: string }> {
  const clock = deps.clock ?? Date.now;
  const deadline = clock() + (deps.deadlineMs ?? 5 * 60_000);
  const runners = await deps.runners();
  const attempted: { slug: string; index: number | null }[] = [];
  const missing: string[] = [];
  let cutShort = 0;
  for (let i = 0; i < runners.length; i++) {
    if (clock() >= deadline) { cutShort = runners.length - i; break; }
    const r = runners[i];
    const page = r.utmb_uri ? await deps.read(r.utmb_uri) : null;
    if (!page) { missing.push(r.slug); continue; }
    attempted.push({ slug: r.slug, index: page.index });
  }
  const hadKnownIndex = runners.some((r) => r.utmb_index !== null);
  if (attempted.length && attempted.every((a) => a.index === null) && hadKnownIndex) {
    const result: { updated: number; missing: string[]; cutShort?: number; note?: string } = { updated: 0, missing, note: 'UTMB pages no longer show an index; nothing changed' };
    if (cutShort) result.cutShort = cutShort;
    return result;
  }
  for (const a of attempted) await deps.update(a.slug, a.index, deps.now);
  const result: { updated: number; missing: string[]; cutShort?: number } = { updated: attempted.length, missing };
  if (cutShort) result.cutShort = cutShort;
  return result;
}
