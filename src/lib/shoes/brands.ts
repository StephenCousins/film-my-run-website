import { prisma } from '@/lib/db';

export interface Brand {
  id: number;
  name: string;
  aliases: string[];
  domain: string;
  newArrivalsUrl: string | null;
}

export interface BrandDeps {
  findAll: () => Promise<Brand[]>;
}

const liveDeps: BrandDeps = {
  findAll: async () =>
    (await prisma.shoe_brands.findMany({ orderBy: { name: 'asc' } })).map(b => ({
      id: b.id, name: b.name, aliases: b.aliases, domain: b.domain, newArrivalsUrl: b.new_arrivals_url,
    })),
};

/** Long enough to serve one request's dozens of lookups from memory, short enough that a new alias counts within minutes, not at the next deploy. */
export const BRAND_CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { brands: Brand[]; loadedAt: number } | null = null;

export async function loadBrands(deps: BrandDeps = liveDeps, now: () => number = Date.now): Promise<Brand[]> {
  if (!cache || now() - cache.loadedAt >= BRAND_CACHE_TTL_MS) cache = { brands: await deps.findAll(), loadedAt: now() };
  return cache.brands;
}

/** Test hook; also called at the start of every weekly run so a brand added since the process started counts. */
export function resetBrandCache() { cache = null; }

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function resolveBrand(text: string, brands: Brand[]): Brand | null {
  const n = norm(text);
  if (!n) return null;
  for (const b of brands) {
    if (norm(b.name) === n) return b;
    if (b.aliases.some(a => norm(a) === n)) return b;
  }
  return null;
}
