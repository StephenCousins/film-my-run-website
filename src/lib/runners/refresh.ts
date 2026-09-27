import { prisma } from '@/lib/db';
import { utmbRunner } from './utmb';

interface RefreshDeps {
  runners: () => Promise<{ slug: string; utmb_uri: string | null; utmb_index: number | null }[]>;
  read: (uri: string) => Promise<{ index: number | null } | null>;
  update: (slug: string, index: number | null, at: Date) => Promise<void>;
  now: Date;
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
 */
export async function refreshUtmbIndexes(deps: RefreshDeps = liveDeps()): Promise<{ updated: number; missing: string[] }> {
  let updated = 0;
  const missing: string[] = [];
  for (const r of await deps.runners()) {
    const page = r.utmb_uri ? await deps.read(r.utmb_uri) : null;
    if (!page) { missing.push(r.slug); continue; }
    await deps.update(r.slug, page.index, deps.now);
    updated++;
  }
  return { updated, missing };
}
