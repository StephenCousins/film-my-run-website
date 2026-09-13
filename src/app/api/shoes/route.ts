import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CATEGORY_LABELS, SOURCE_LABELS, TERRAIN_LABELS } from '@/lib/shoes/taxonomy';
import { buildShoeQuery } from './query';
import { reviewSelect, serializeReview, serializeShoe, shoeSelect } from './serialize';

// Catalogue only: no session, no per-user ratings, so the response is the
// same for everyone. Reviews are left out unless `withReviews=1` (the iPhone
// app's /api/app/v1/shoes alias forces that on); otherwise they live at
// /api/shoes/[slug]. The signed-in user's own ratings are at /api/shoes/my-ratings.
//
// This route reads the query string, which Next treats as a dynamic API, so
// `revalidate` would have no effect here. The v1 alias's Cache-Control header
// provides caching for the app.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { where, orderBy } = buildShoeQuery(searchParams);
  const withReviews = searchParams.get('withReviews') === '1';

  const [data, allShoes] = await Promise.all([
    withReviews
      ? prisma.shoes
          .findMany({ where, orderBy, select: { ...shoeSelect, shoe_reviews: { select: reviewSelect } } })
          .then(rows => rows.map(s => ({ ...serializeShoe(s), reviews: s.shoe_reviews.map(serializeReview) })))
      : prisma.shoes.findMany({ where, orderBy, select: shoeSelect }).then(rows => rows.map(serializeShoe)),
    prisma.shoes.findMany({
      select: { brand: true, category: true },
      distinct: ['brand', 'category'],
      orderBy: { brand: 'asc' },
    }),
  ]);

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
