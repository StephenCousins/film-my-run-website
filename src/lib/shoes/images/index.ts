import { prisma } from '@/lib/db';
import { sleep } from '../search';
import type { Brand } from '../brands';
import type { BrandPage } from '../publish/brandPage';
import { imageCandidates, type ImageCandidate, type ImagePhase } from './candidates';
import { isLikelyProductImage, checkImageSize, visionConfirmShoeImage } from './verify';
import { storeImage } from './store';

export type { ImageCandidate, ImageMethod, ImagePhase } from './candidates';
export { RETAILER_DOMAINS, isProductPageUrl, imageCandidates, brandPageCandidates, retailerCandidates } from './candidates';
export { NON_CATALOGUE_HOSTS, isLikelyProductImage, checkImageSize, visionConfirmShoeImage } from './verify';
export { storeImage, imageKey, isR2ImageUrl, R2_SHOES_PREFIX } from './store';

export interface ImageOutcome {
  url: string;
  sourceUrl: string;
  method: string;
}

export interface ImageWrite {
  image_url: string;
  image_source_url: string;
  image_method: string;
  image_verified_at: Date;
}

export interface FindImageDeps {
  /** Called once per phase; the retailer phase only runs if nothing from the brand phase stored. */
  imageCandidates: (input: { brand: Brand; model: string; brandPage: BrandPage | null }, phase: ImagePhase) => Promise<ImageCandidate[]>;
  isLikelyProductImage: (url: string) => boolean;
  checkImageSize: (url: string) => Promise<{ ok: boolean; reason?: string }>;
  visionConfirmShoeImage: (brand: string, model: string, url: string) => Promise<boolean | null>;
  storeImage: (slug: string, sourceUrl: string) => Promise<string>;
  writeImage: (slug: string, data: ImageWrite) => Promise<void>;
}

const liveFindDeps: FindImageDeps = {
  imageCandidates: (input, phase) => imageCandidates(input, undefined, { phase }),
  isLikelyProductImage,
  checkImageSize: url => checkImageSize(url),
  visionConfirmShoeImage: (brand, model, url) => visionConfirmShoeImage(brand, model, url),
  storeImage: (slug, sourceUrl) => storeImage(slug, sourceUrl),
  writeImage: async (slug, data) => { await prisma.shoes.update({ where: { slug }, data }); },
};

const PHASES: ImagePhase[] = ['brand', 'retailer'];

/**
 * Find, verify and store one image for a shoe. Brand-page candidates go
 * through the full verify+store path first; retailer searches only run when
 * none of them stored. Each candidate must pass the URL heuristics, the
 * size/type HEAD check, and an explicit vision YES before it is copied to R2;
 * only after the copy succeeds is anything written to the row. A wrong image
 * is worse than none, so a vision NO and a vision failure (null) are treated
 * the same: skip.
 */
export async function findAndStoreImage(
  shoe: { slug: string; brand: Brand; model: string },
  brandPage: BrandPage | null,
  deps: FindImageDeps = liveFindDeps
): Promise<ImageOutcome | null> {
  for (const phase of PHASES) {
    const candidates = await deps.imageCandidates({ brand: shoe.brand, model: shoe.model, brandPage }, phase);
    const stored = await tryCandidates(shoe, candidates, deps);
    if (stored) return stored;
  }
  return null;
}

async function tryCandidates(shoe: { slug: string; brand: Brand; model: string }, candidates: ImageCandidate[], deps: FindImageDeps): Promise<ImageOutcome | null> {
  for (const candidate of candidates) {
    if (!deps.isLikelyProductImage(candidate.url)) continue;
    const size = await deps.checkImageSize(candidate.url);
    if (!size.ok) continue;
    const verdict = await deps.visionConfirmShoeImage(shoe.brand.name, shoe.model, candidate.url);
    if (verdict !== true) continue;

    let url: string;
    try {
      url = await deps.storeImage(shoe.slug, candidate.url);
    } catch (err) {
      console.error(`Shoe image store failed for ${shoe.slug} from ${candidate.url}:`, err);
      continue;
    }
    await deps.writeImage(shoe.slug, {
      image_url: url,
      image_source_url: candidate.url,
      image_method: candidate.method,
      image_verified_at: new Date(),
    });
    return { url, sourceUrl: candidate.url, method: candidate.method };
  }
  return null;
}

export interface AuditImageDeps {
  listImages: (limit?: number) => Promise<{ slug: string; image_url: string }[]>;
  /** HTTP status of a HEAD request, or null when no response came back at all. */
  head: (url: string) => Promise<number | null>;
  clearImage: (slug: string) => Promise<void>;
  /** Pause between HEADs so the audit does not hammer R2; tests pass a no-op. */
  sleep?: typeof sleep;
}

async function headStatus(url: string): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    return res.status;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export const liveAuditDeps: AuditImageDeps = {
  listImages: async limit => {
    const rows = await prisma.shoes.findMany({
      where: { image_url: { not: null } },
      select: { slug: true, image_url: true },
      orderBy: { slug: 'asc' },
      ...(limit !== undefined ? { take: limit } : {}),
    });
    return rows.flatMap(r => (r.image_url ? [{ slug: r.slug, image_url: r.image_url }] : []));
  },
  head: headStatus,
  clearImage: async slug => {
    await prisma.shoes.update({
      where: { slug },
      data: { image_url: null, image_source_url: null, image_method: null, image_verified_at: null },
    });
  },
  sleep,
};

/** Statuses that say the object is gone, as opposed to the request having a bad day. */
const GONE_STATUSES = new Set([404, 410]);

export interface AuditResult {
  checked: number;
  cleared: string[];
  /** HEADs that answered neither 2xx nor gone (429, 5xx, 401/403, no response): left alone, but the audit was degraded. */
  unverified: number;
}

/**
 * HEAD every stored image and clear the four image fields on any that is
 * gone (404/410), so the page shows a placeholder rather than a broken img.
 * Anything else that is not a 2xx — rate limiting, a 5xx, an auth error, no
 * response at all — says nothing about the image and is counted as
 * unverified rather than cleared: an R2 blip must not empty the catalogue.
 */
export async function auditImages(
  deps: AuditImageDeps = liveAuditDeps,
  opts: { limit?: number } = {}
): Promise<AuditResult> {
  const rows = await deps.listImages(opts.limit);
  const pause = deps.sleep ?? (async () => {});
  const cleared: string[] = [];
  let unverified = 0;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0) await pause(250);
    const row = rows[i];
    const status = await deps.head(row.image_url);
    if (status !== null && status >= 200 && status < 300) continue;
    if (status !== null && GONE_STATUSES.has(status)) {
      await deps.clearImage(row.slug);
      cleared.push(row.slug);
    } else {
      unverified++;
    }
  }
  return { checked: rows.length, cleared, unverified };
}
