import { prisma } from '@/lib/db';
import { completeText } from '@/lib/llm';
import { loadBrands } from '../brands';
import { isSameLine, parseModelVersion } from '../versions';
import { readAllFeeds } from './sources/rss';
import { readAllShopifyNewArrivals } from './sources/shopifyNewArrivals';
import { readVersionBumps } from './sources/versionBumps';
import { normalise } from './normalise';
import type { Nomination, SourceResult, StoreStat } from './types';

// A type alias rather than an interface so it satisfies Prisma's InputJsonValue.
export type EvidenceSource = { source: string; url: string; title: string; publishedAt: string | null };
export interface CandidateUpsert { slug: string; brandId: number | null; brandText: string; modelText: string; holdReasons: string[]; evidence: { sources: EvidenceSource[] } }
export interface DiscoverDeps {
  readAllFeeds: () => Promise<SourceResult[]>;
  readAllShopifyNewArrivals: () => Promise<SourceResult[]>;
  readVersionBumps: () => Promise<SourceResult>;
  loadBrands: typeof loadBrands; completeText: typeof completeText;
  existingSlugs: () => Promise<{ slug: string; brand: string; model: string }[]>;
  upsertCandidate: (c: CandidateUpsert) => Promise<void>;
}
export interface DiscoverReport {
  nominations: number;
  /** Nominations by kind of source: review-site feeds, Shopify new arrivals, catalogue lines a store lists a newer version of. */
  feeds: number;
  shops: number;
  versionBumps: number;
  candidatesUpserted: number;
  alreadyKnown: number;
  /** Feeds that yielded nothing, with the error when there was one: 'irunfar (HTTP 403)' is a block, 'irunfar' is a quiet week. */
  feedsEmpty: string[];
  /** Stores (`shopify:<store>` new arrivals, `version-bump:<store>` lookups) that yielded nothing, the error appended the same way. */
  storesEmpty: string[];
  /** Every store read: products or lookups fetched, nominations produced, the error if it refused. */
  stores: StoreStat[];
  /** The one LLM call that turns headlines into shoes returned something unparseable; every nomination was lost. */
  normaliseFailed: boolean;
}

/** Union of evidence sources by url; the stored order is kept, new urls appended. */
export function mergeEvidenceSources(existing: unknown, incoming: EvidenceSource[]): EvidenceSource[] {
  const prior = (existing as { sources?: EvidenceSource[] } | null)?.sources;
  const merged = Array.isArray(prior) ? [...prior] : [];
  const seen = new Set(merged.map(s => s.url));
  for (const s of incoming) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    merged.push(s);
  }
  return merged;
}

export const liveDiscoverDeps: DiscoverDeps = {
  readAllFeeds: () => readAllFeeds(), readAllShopifyNewArrivals: () => readAllShopifyNewArrivals(), readVersionBumps: () => readVersionBumps(), loadBrands, completeText,
  existingSlugs: async () => prisma.shoes.findMany({ select: { slug: true, brand: true, model: true } }),
  upsertCandidate: async c => {
    // A candidate seen again keeps its status and hold reasons — the gate
    // re-evaluates those, not discovery — and gains evidence rather than
    // having it replaced.
    const current = await prisma.shoe_candidates.findUnique({ where: { slug: c.slug }, select: { evidence: true } });
    await prisma.shoe_candidates.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, brand_id: c.brandId, brand_text: c.brandText, model_text: c.modelText, hold_reasons: c.holdReasons, evidence: c.evidence, status: c.holdReasons.length ? 'held' : 'pending' },
      update: { last_seen_at: new Date(), evidence: { sources: mergeEvidenceSources(current?.evidence, c.evidence.sources) }, brand_id: c.brandId ?? undefined },
    });
  },
};

function evidenceOf(noms: Nomination[]): { sources: EvidenceSource[] } {
  return { sources: noms.map(n => ({ source: n.source, url: n.url, title: n.title, publishedAt: n.publishedAt?.toISOString() ?? null })) };
}

export async function discover(deps: DiscoverDeps = liveDiscoverDeps): Promise<DiscoverReport> {
  const brands = await deps.loadBrands();
  const [feedResults, shopResults, bumpResult] = await Promise.all([deps.readAllFeeds(), deps.readAllShopifyNewArrivals(), deps.readVersionBumps()]);
  const count = (rs: SourceResult[]) => rs.reduce((n, r) => n + r.nominations.length, 0);
  const noms = [...feedResults, ...shopResults, bumpResult].flatMap(r => r.nominations);
  const feedsEmpty = feedResults.filter(r => r.empty).map(r => (r.error ? `${r.source} (${r.error})` : r.source));
  const stores = [...shopResults, bumpResult].flatMap(r => r.stores ?? []);
  const storesEmpty = stores.filter(s => s.nominated === 0).map(s => (s.error ? `${s.store} (${s.error})` : s.store));

  const { resolved, unresolved, failed: normaliseFailed } = await normalise(noms, brands, { completeText: deps.completeText });
  const existing = await deps.existingSlugs();
  const existingSlugs = new Set(existing.map(e => e.slug));

  let upserted = 0, known = 0;
  for (const r of resolved) {
    const sameVersionExists = existingSlugs.has(r.slug) || existing.some(e => e.brand === r.brand.name && isSameLine(e.model, r.model) && parseModelVersion(e.model).versionNum === parseModelVersion(r.model).versionNum);
    if (sameVersionExists) { known++; continue; }
    await deps.upsertCandidate({ slug: r.slug, brandId: r.brand.id, brandText: r.brand.name, modelText: r.model, holdReasons: [], evidence: evidenceOf(r.nominations) });
    upserted++;
  }
  for (const u of unresolved) {
    await deps.upsertCandidate({ slug: u.slug, brandId: null, brandText: u.brandText, modelText: u.model, holdReasons: ['brand_unresolved'], evidence: evidenceOf(u.nominations) });
    upserted++;
  }
  return {
    nominations: noms.length, feeds: count(feedResults), shops: count(shopResults), versionBumps: bumpResult.nominations.length,
    candidatesUpserted: upserted, alreadyKnown: known, feedsEmpty, storesEmpty, stores, normaliseFailed,
  };
}
