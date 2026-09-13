import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CATEGORY_LABELS, SOURCE_LABELS, TERRAIN_LABELS } from '@/lib/shoes/taxonomy';
import { buildShoeQuery } from './query';
import { serializeShoe, shoeSelect } from './serialize';

// Catalogue only: no session, no reviews, no per-user ratings, so the
// response is the same for everyone and can be cached. Reviews live at
// /api/shoes/[slug]; the signed-in user's own ratings at /api/shoes/my-ratings.
export const revalidate = 300;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { where, orderBy } = buildShoeQuery(searchParams);

  const [shoes, allShoes] = await Promise.all([
    prisma.shoes.findMany({ where, orderBy, select: shoeSelect }),
    prisma.shoes.findMany({
      select: { brand: true, category: true },
      distinct: ['brand', 'category'],
      orderBy: { brand: 'asc' },
    }),
  ]);

  const data = shoes.map(serializeShoe);
  const brands = [...new Set(allShoes.map(s => s.brand))].sort();
  const categories = [...new Set(allShoes.map(s => s.category))].sort();

  return NextResponse.json({
    shoes: data,
    meta: {
      brands,
      categories,
      total: data.length,
      labels: { categories: CATEGORY_LABELS, sources: SOURCE_LABELS, terrains: TERRAIN_LABELS },
    },
  });
}
