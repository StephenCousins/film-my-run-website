import { prisma } from '@/lib/db';
import type { Brand } from '../brands';
import type { BrandPage } from '../publish/brandPage';
import { imageCandidates, type ImageCandidate } from './candidates';
import { isLikelyProductImage, checkImageSize, visionConfirmShoeImage } from './verify';
import { storeImage } from './store';

export type { ImageCandidate, ImageMethod } from './candidates';
export { RETAILER_DOMAINS, isProductPageUrl, imageCandidates } from './candidates';
export { NON_CATALOGUE_HOSTS, isLikelyProductImage, checkImageSize, visionConfirmShoeImage } from './verify';
export { storeImage, imageKey } from './store';

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
  imageCandidates: (input: { brand: Brand; model: string; brandPage: BrandPage | null }) => Promise<ImageCandidate[]>;
  isLikelyProductImage: (url: string) => boolean;
  checkImageSize: (url: string) => Promise<{ ok: boolean; reason?: string }>;
  visionConfirmShoeImage: (brand: string, model: string, url: string) => Promise<boolean | null>;
  storeImage: (slug: string, sourceUrl: string) => Promise<string>;
  writeImage: (slug: string, data: ImageWrite) => Promise<void>;
}

const liveFindDeps: FindImageDeps = {
  imageCandidates: input => imageCandidates(input),
  isLikelyProductImage,
  checkImageSize: url => checkImageSize(url),
  visionConfirmShoeImage: (brand, model, url) => visionConfirmShoeImage(brand, model, url),
  storeImage: (slug, sourceUrl) => storeImage(slug, sourceUrl),
  writeImage: async (slug, data) => { await prisma.shoes.update({ where: { slug }, data }); },
};

/**
 * Find, verify and store one image for a shoe. Each candidate must pass the
 * URL heuristics, the size/type HEAD check, and an explicit vision YES before
 * it is copied to R2; only after the copy succeeds is anything written to the
 * row. A wrong image is worse than none, so a vision NO and a vision failure
 * (null) are treated the same: skip.
 */
export async function findAndStoreImage(
  shoe: { slug: string; brand: Brand; model: string },
  brandPage: BrandPage | null,
  deps: FindImageDeps = liveFindDeps
): Promise<ImageOutcome | null> {
  const candidates = await deps.imageCandidates({ brand: shoe.brand, model: shoe.model, brandPage });

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

const liveAuditDeps: AuditImageDeps = {
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
};

/**
 * HEAD every stored image and clear the four image fields on any that no
 * longer resolves, so the page shows a placeholder rather than a broken img.
 * A request that gets no response at all (timeout, DNS) says nothing about
 * the image and is left alone; only an actual non-2xx status clears.
 */
export async function auditImages(
  deps: AuditImageDeps = liveAuditDeps,
  opts: { limit?: number } = {}
): Promise<{ checked: number; cleared: string[] }> {
  const rows = await deps.listImages(opts.limit);
  const cleared: string[] = [];
  for (const row of rows) {
    const status = await deps.head(row.image_url);
    if (status === null) continue;
    if (status < 200 || status >= 300) {
      await deps.clearImage(row.slug);
      cleared.push(row.slug);
    }
  }
  return { checked: rows.length, cleared };
}
