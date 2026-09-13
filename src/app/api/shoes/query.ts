import type { Prisma } from '@prisma/client';
import { isShoeCategory, isShoeTerrain } from '@/lib/shoes/taxonomy';

const ORDER_BY: Record<string, Prisma.shoesOrderByWithRelationInput[]> = {
  score: [{ avg_score: { sort: 'desc', nulls: 'last' } }, { review_count: 'desc' }],
  user_rating: [{ user_avg_score: { sort: 'desc', nulls: 'last' } }, { user_rating_count: 'desc' }],
  brand: [{ brand: 'asc' }, { model: 'asc' }],
  newest: [{ release_year: { sort: 'desc', nulls: 'last' } }],
};

function parseIntParam(v: string | null): number | null {
  if (v === null) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Turns the catalogue's query string into a Prisma `where` + `orderBy`.
 * Pure, so it can be unit-tested without a database. Invalid enum values
 * are ignored rather than rejected; superseded shoes are hidden unless
 * `includeSuperseded=1`.
 */
export function buildShoeQuery(sp: URLSearchParams): {
  where: Prisma.shoesWhereInput;
  orderBy: Prisma.shoesOrderByWithRelationInput[];
} {
  const terrain = sp.get('terrain');
  const category = sp.get('category');
  const brand = sp.get('brand');
  const sort = sp.get('sort') ?? 'score';
  const minDrop = parseIntParam(sp.get('minDrop'));
  const maxDrop = parseIntParam(sp.get('maxDrop'));
  const search = sp.get('search');

  const where: Prisma.shoesWhereInput = {};
  const and: Prisma.shoesWhereInput[] = [];

  if (sp.get('includeSuperseded') !== '1') where.superseded_by_id = null;
  if (terrain && terrain !== 'all' && isShoeTerrain(terrain)) {
    and.push({ OR: [{ terrain }, { terrain: 'both' }] });
  }
  if (isShoeCategory(category)) where.category = category;
  if (brand) where.brand = brand;
  if (minDrop !== null || maxDrop !== null) {
    where.drop_mm = {
      ...(minDrop !== null ? { gte: minDrop } : {}),
      ...(maxDrop !== null ? { lte: maxDrop } : {}),
    };
  }
  if (search) {
    and.push({
      OR: [
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ],
    });
  }
  if (and.length > 0) where.AND = and;

  return { where, orderBy: ORDER_BY[sort] ?? ORDER_BY.score };
}
