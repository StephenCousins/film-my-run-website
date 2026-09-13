import { prisma } from '@/lib/db';
import type { CandidateStatus, Prisma } from '@prisma/client';
import { loadBrands, type Brand } from '../brands';
import { discover, liveDiscoverDeps, type DiscoverReport } from '../discovery';
import { evaluate, type CandidateInput, type GateHold, type GatePass } from '../publish/gate';
import { findBrandProductPage, type BrandPage } from '../publish/brandPage';
import { publishCandidate } from '../publish/publish';
import { auditImages, findAndStoreImage, liveAuditDeps, type AuditResult, type ImageOutcome } from '../images';
import { fetchReviewsForShoe, type ReviewResult } from '../reviews';
import { recomputeShoeScore } from '../scores';

export interface JobReport {
  /** Candidates upserted by discovery this run. */
  discovered: number;
  published: { slug: string; imageUrl: string | null }[];
  /** Published this run but no image passed verification; the image phase retries next week. */
  publishedWithoutImage: string[];
  /** Candidates whose slug was already a shoe: marked published against it, nothing re-created. */
  linkedExisting: string[];
  held: { id: number; slug: string; reasons: string[] }[];
  errored: { slug: string; error: string }[];
  /** Held candidates older than eight weeks, closed as rejected. */
  rejectedStale: number;
  reviewsRefreshed: number;
  imagesStored: string[];
  imagesCleared: string[];
  feedsEmpty: string[];
  durationMs: number;
  dryRun: boolean;
}

export interface WeeklyOpts {
  dryRun?: boolean;
  /** Candidates evaluated per run; each costs a brand-page search, a review search and two LLM calls. */
  maxPublish?: number;
  maxImages?: number;
  maxStaleRefresh?: number;
}

export interface ShoeRef { id: number; slug: string; brand: Brand; model: string }

export interface WeeklyDeps {
  discover: () => Promise<DiscoverReport>;
  /** Candidates in the given statuses, oldest first_seen_at first. */
  listCandidates: (statuses: CandidateStatus[]) => Promise<CandidateInput[]>;
  shoeExists: (slug: string) => Promise<{ id: number } | null>;
  linkCandidate: (candidateId: number, shoeId: number) => Promise<void>;
  evaluate: (c: CandidateInput) => Promise<GatePass | GateHold>;
  publishCandidate: (c: CandidateInput, pass: GatePass) => Promise<{ shoeId: number; slug: string; supersededSlug: string | null }>;
  holdCandidate: (id: number, reasons: string[], partial: GateHold['partial']) => Promise<void>;
  /** Closes held candidates older than the cutoff; returns how many. */
  rejectStale: (olderThanWeeks: number) => Promise<number>;
  /** Closes a candidate that can never publish; `reasons` is recorded in hold_reasons. */
  rejectCandidate: (candidateId: number, reasons: string[]) => Promise<void>;
  staleShoes: (limit: number) => Promise<ShoeRef[]>;
  fetchReviewsForShoe: (brand: string, model: string) => Promise<ReviewResult[]>;
  upsertReviews: (shoeId: number, reviews: ReviewResult[]) => Promise<void>;
  recomputeShoeScore: (shoeId: number) => Promise<unknown>;
  touchReviewed: (shoeId: number) => Promise<void>;
  auditImages: () => Promise<AuditResult>;
  shoesNeedingImage: (limit: number) => Promise<ShoeRef[]>;
  findBrandProductPage: (brand: Brand, model: string) => Promise<BrandPage | null>;
  findAndStoreImage: (shoe: { slug: string; brand: Brand; model: string }, brandPage: BrandPage | null) => Promise<ImageOutcome | null>;
  now: () => Date;
  log: (msg: string) => void;
}

export const DEFAULTS = { maxPublish: 10, maxImages: 20, maxStaleRefresh: 10 } as const;
export const STALE_REVIEW_DAYS = 30;
export const REJECT_HELD_AFTER_WEEKS = 8;

const SHOE_REF_SELECT = { id: true, slug: true, model: true, brand_id: true } as const;

async function withBrands(rows: { id: number; slug: string; model: string; brand_id: number }[]): Promise<ShoeRef[]> {
  const brands = new Map((await loadBrands()).map(b => [b.id, b]));
  return rows.flatMap(r => { const brand = brands.get(r.brand_id); return brand ? [{ id: r.id, slug: r.slug, model: r.model, brand }] : []; });
}

/** The page html is large and re-fetched on the next pass; keep only what a digest, a manual override or a later reader needs. */
function brandPageEvidence(page: BrandPage): { url: string; title: string; source: BrandPage['source'] } {
  return { url: page.url, title: page.title, source: page.source };
}

/** The candidate's stored evidence with `patch` laid over it, as a Prisma-safe JSON value. */
async function mergedEvidence(candidateId: number, patch: Record<string, unknown>): Promise<Prisma.InputJsonObject> {
  const current = await prisma.shoe_candidates.findUnique({ where: { id: candidateId }, select: { evidence: true } });
  const evidence = (current?.evidence && typeof current.evidence === 'object' && !Array.isArray(current.evidence)) ? current.evidence as Record<string, unknown> : {};
  return JSON.parse(JSON.stringify({ ...evidence, ...patch }));
}

/**
 * Every write on the deps object swapped for a no-op that returns a plausible
 * shape, so a dry run reports what a live run would do without touching the
 * database or R2. The reads and the paid calls (search, page fetch, LLM) still
 * run. `findAndStoreImage` is stubbed whole: its only useful output is the
 * stored URL, and a vision call whose answer is thrown away is money spent.
 */
export function withDryRun(deps: WeeklyDeps): WeeklyDeps {
  const noop = async () => {};
  return {
    ...deps,
    linkCandidate: noop,
    publishCandidate: async c => ({ shoeId: -1, slug: c.slug, supersededSlug: null }),
    holdCandidate: noop,
    rejectStale: async () => 0,
    rejectCandidate: noop,
    upsertReviews: noop,
    recomputeShoeScore: noop,
    touchReviewed: noop,
    findAndStoreImage: async () => null,
  };
}

/**
 * Real deps. `discover` and `auditImages` take their own deps objects, and
 * their writers (`upsertCandidate`, `clearImage`) cannot be reached from
 * withDryRun, so this is where a dry run stubs those two.
 */
export function liveDeps(dryRun: boolean): WeeklyDeps {
  const noop = async () => {};
  return {
    discover: () => discover(dryRun ? { ...liveDiscoverDeps, upsertCandidate: noop } : liveDiscoverDeps),
    listCandidates: async statuses => {
      const brands = new Map((await loadBrands()).map(b => [b.id, b]));
      const rows = await prisma.shoe_candidates.findMany({
        where: { status: { in: statuses } },
        orderBy: { first_seen_at: 'asc' },
        select: { id: true, slug: true, brand_id: true, model_text: true, evidence: true },
      });
      return rows.map(r => ({
        id: r.id,
        slug: r.slug,
        brand: (r.brand_id !== null && brands.get(r.brand_id)) || null,
        model: r.model_text,
        evidence: { sources: (r.evidence as { sources?: CandidateInput['evidence']['sources'] } | null)?.sources ?? [] },
      }));
    },
    shoeExists: slug => prisma.shoes.findUnique({ where: { slug }, select: { id: true } }),
    linkCandidate: async (candidateId, shoeId) => {
      await prisma.shoe_candidates.update({ where: { id: candidateId }, data: { status: 'published', shoe_id: shoeId, decided_at: new Date() } });
    },
    evaluate: c => evaluate(c),
    publishCandidate: async (c, pass) => {
      const r = await publishCandidate(c, pass);
      // Which page proved the shoe (brand site, or a retailer standing in for one that refused) stays on the closed candidate.
      await prisma.shoe_candidates.update({ where: { id: c.id }, data: { evidence: await mergedEvidence(c.id, { brandPage: brandPageEvidence(pass.brandPage) }) } });
      return r;
    },
    holdCandidate: async (id, reasons, partial) => {
      const evidence = await mergedEvidence(id, {
        ...(partial.brandPage ? { brandPage: brandPageEvidence(partial.brandPage) } : {}),
        ...(partial.reviews ? { reviews: partial.reviews } : {}),
        ...(partial.brandUnreachable ? { brandUnreachable: partial.brandUnreachable } : {}),
      });
      await prisma.shoe_candidates.update({ where: { id }, data: { status: 'held', hold_reasons: reasons, evidence, decided_at: new Date() } });
    },
    rejectStale: async olderThanWeeks => {
      const cutoff = new Date(Date.now() - olderThanWeeks * 7 * 24 * 60 * 60 * 1000);
      const where = { status: 'held' as const, first_seen_at: { lt: cutoff } };
      return (await prisma.shoe_candidates.updateMany({ where, data: { status: 'rejected', decided_at: new Date() } })).count;
    },
    rejectCandidate: async (candidateId, reasons) => {
      await prisma.shoe_candidates.update({ where: { id: candidateId }, data: { status: 'rejected', hold_reasons: reasons, decided_at: new Date() } });
    },
    staleShoes: async limit => {
      const cutoff = new Date(Date.now() - STALE_REVIEW_DAYS * 24 * 60 * 60 * 1000);
      const rows = await prisma.shoes.findMany({
        where: { OR: [{ last_reviewed: null }, { last_reviewed: { lt: cutoff } }] },
        orderBy: { last_reviewed: { sort: 'asc', nulls: 'first' } },
        take: limit,
        select: SHOE_REF_SELECT,
      });
      return withBrands(rows);
    },
    fetchReviewsForShoe: (brand, model) => fetchReviewsForShoe(brand, model),
    upsertReviews: async (shoeId, reviews) => {
      for (const review of reviews) {
        await prisma.shoe_reviews.upsert({
          where: { shoe_id_source: { shoe_id: shoeId, source: review.source } },
          update: { source_url: review.source_url, expert_score: review.expert_score, summary: review.summary, fetched_at: new Date() },
          create: { shoe_id: shoeId, source: review.source, source_url: review.source_url, expert_score: review.expert_score, summary: review.summary },
        });
      }
    },
    recomputeShoeScore: shoeId => recomputeShoeScore(shoeId),
    touchReviewed: async shoeId => { await prisma.shoes.update({ where: { id: shoeId }, data: { last_reviewed: new Date() } }); },
    auditImages: () => auditImages(dryRun ? { ...liveAuditDeps, clearImage: noop } : liveAuditDeps),
    shoesNeedingImage: async limit => {
      // Anything not in R2 is either missing or a hotlink from the old catalogue; both get the full find+store.
      const rows = await prisma.shoes.findMany({
        where: { OR: [{ image_url: null }, { NOT: { image_url: { contains: '/shoes/' } } }] },
        orderBy: { slug: 'asc' },
        take: limit,
        select: SHOE_REF_SELECT,
      });
      return withBrands(rows);
    },
    findBrandProductPage: async (brand, model) => {
      const found = await findBrandProductPage(brand, model);
      // An unreachable brand site is no different from an absent page here: the retailer phase of findAndStoreImage runs either way.
      return found.kind === 'found' ? found.page : null;
    },
    findAndStoreImage: (shoe, brandPage) => findAndStoreImage(shoe, brandPage),
    now: () => new Date(),
    log: msg => console.log(msg),
  };
}

/**
 * shoe_candidates.shoe_id is unique, so a shoe that already has a candidate
 * (it was published from one, then re-nominated under a variant slug) cannot
 * take a second. That candidate is closed rather than retried every week.
 */
async function linkOrReject(deps: WeeklyDeps, c: CandidateInput, shoeId: number): Promise<void> {
  try {
    await deps.linkCandidate(c.id, shoeId);
  } catch (err) {
    if ((err as { code?: unknown } | null)?.code !== 'P2002') throw err;
    await deps.rejectCandidate(c.id, ['shoe_already_linked']);
  }
}

function errorMessage(err: unknown): string {
  return String((err as { message?: unknown } | null)?.message ?? err);
}

/**
 * The weekly pipeline: discover → close stale holds → evaluate and publish
 * (capped) → refresh stale reviews → audit stored images → find images for
 * shoes without one (capped). Every candidate and every shoe runs inside its
 * own try/catch so one bad page or a rate-limited search costs that item, not
 * the run; failures are reported under `errored` with the message.
 */
export async function runWeekly(opts: WeeklyOpts = {}, injected?: WeeklyDeps): Promise<JobReport> {
  const started = Date.now();
  const dryRun = opts.dryRun ?? false;
  const base = injected ?? liveDeps(dryRun);
  const deps = dryRun ? withDryRun(base) : base;
  const maxPublish = opts.maxPublish ?? DEFAULTS.maxPublish;
  const maxImages = opts.maxImages ?? DEFAULTS.maxImages;
  const maxStaleRefresh = opts.maxStaleRefresh ?? DEFAULTS.maxStaleRefresh;

  const report: JobReport = {
    discovered: 0, published: [], publishedWithoutImage: [], linkedExisting: [], held: [], errored: [],
    rejectedStale: 0, reviewsRefreshed: 0, imagesStored: [], imagesCleared: [], feedsEmpty: [], durationMs: 0, dryRun,
  };
  const fail = (slug: string, err: unknown) => {
    console.error(err);
    report.errored.push({ slug, error: errorMessage(err) });
  };

  deps.log(`Shoe Finder weekly${dryRun ? ' (dry run)' : ''}: discovering`);
  try {
    const d = await deps.discover();
    report.discovered = d.candidatesUpserted;
    report.feedsEmpty = d.feedsEmpty;
    deps.log(`discovery: ${d.nominations} nominations, ${d.candidatesUpserted} candidates upserted, ${d.alreadyKnown} already known`);
  } catch (err) {
    fail('discover', err);
  }

  try {
    report.rejectedStale = await deps.rejectStale(REJECT_HELD_AFTER_WEEKS);
  } catch (err) {
    fail('rejectStale', err);
  }

  // New candidates first: a backlog of holds re-evaluated every week must not
  // use up the cap before anything new gets a look.
  let candidates: CandidateInput[] = [];
  try {
    candidates = [...(await deps.listCandidates(['pending'])), ...(await deps.listCandidates(['held']))];
  } catch (err) {
    fail('listCandidates', err);
  }
  let evaluated = 0;
  for (const c of candidates) {
    if (evaluated >= maxPublish) break;
    try {
      const existing = await deps.shoeExists(c.slug);
      if (existing) {
        await linkOrReject(deps, c, existing.id);
        report.linkedExisting.push(c.slug);
        deps.log(`${c.slug}: already in the catalogue, linked`);
        continue;
      }
      evaluated++;
      const verdict = await deps.evaluate(c);
      if (!verdict.publish) {
        await deps.holdCandidate(c.id, verdict.reasons, verdict.partial);
        report.held.push({ id: c.id, slug: c.slug, reasons: verdict.reasons });
        deps.log(`${c.slug}: held (${verdict.reasons.join(', ')})`);
        continue;
      }
      const r = await deps.publishCandidate(c, verdict);
      const entry = { slug: r.slug, imageUrl: null as string | null };
      report.published.push(entry);
      deps.log(`${c.slug}: published${r.supersededSlug ? `, supersedes ${r.supersededSlug}` : ''}`);
      try {
        const image = c.brand ? await deps.findAndStoreImage({ slug: c.slug, brand: c.brand, model: c.model }, verdict.brandPage) : null;
        if (image) { entry.imageUrl = image.url; report.imagesStored.push(c.slug); }
      } catch (err) {
        fail(c.slug, err);
      }
      if (!entry.imageUrl) report.publishedWithoutImage.push(c.slug);
    } catch (err) {
      fail(c.slug, err);
    }
  }

  let stale: ShoeRef[] = [];
  try {
    stale = await deps.staleShoes(maxStaleRefresh);
  } catch (err) {
    fail('staleShoes', err);
  }
  for (const shoe of stale) {
    try {
      const reviews = await deps.fetchReviewsForShoe(shoe.brand.name, shoe.model);
      await deps.upsertReviews(shoe.id, reviews);
      await deps.recomputeShoeScore(shoe.id);
      await deps.touchReviewed(shoe.id);
      report.reviewsRefreshed++;
      deps.log(`${shoe.slug}: ${reviews.length} reviews refreshed`);
    } catch (err) {
      fail(shoe.slug, err);
    }
  }

  try {
    const audit = await deps.auditImages();
    report.imagesCleared = audit.cleared;
    deps.log(`image audit: ${audit.checked} checked, ${audit.cleared.length} cleared, ${audit.unverified} unverified`);
  } catch (err) {
    fail('auditImages', err);
  }

  let needImage: ShoeRef[] = [];
  try {
    needImage = await deps.shoesNeedingImage(maxImages);
  } catch (err) {
    fail('shoesNeedingImage', err);
  }
  for (const shoe of needImage) {
    try {
      const brandPage = await deps.findBrandProductPage(shoe.brand, shoe.model);
      const image = await deps.findAndStoreImage({ slug: shoe.slug, brand: shoe.brand, model: shoe.model }, brandPage);
      if (image) { report.imagesStored.push(shoe.slug); deps.log(`${shoe.slug}: image stored (${image.method})`); }
      else deps.log(`${shoe.slug}: no image passed verification`);
    } catch (err) {
      fail(shoe.slug, err);
    }
  }

  report.durationMs = Date.now() - started;
  deps.log(`done in ${report.durationMs}ms: ${report.published.length} published, ${report.held.length} held, ${report.errored.length} errors`);
  return report;
}
