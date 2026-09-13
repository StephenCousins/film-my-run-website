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

let cache: Brand[] | null = null;

export async function loadBrands(deps: BrandDeps = liveDeps): Promise<Brand[]> {
  if (!cache) cache = await deps.findAll();
  return cache;
}

/** Test hook and for after inserting a brand. */
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
