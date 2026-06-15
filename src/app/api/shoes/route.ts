import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const terrain = searchParams.get('terrain'); // road | trail | both | all
  const category = searchParams.get('category');
  const brand = searchParams.get('brand');
  const sort = searchParams.get('sort') ?? 'score'; // score | brand | newest
  const minDrop = searchParams.get('minDrop');
  const maxDrop = searchParams.get('maxDrop');
  const search = searchParams.get('search');

  const where: Record<string, unknown> = {};

  if (terrain && terrain !== 'all') {
    where.OR = [{ terrain }, { terrain: 'both' }];
  }
  if (category) where.category = category;
  if (brand) where.brand = brand;
  if (minDrop !== null || maxDrop !== null) {
    where.drop_mm = {
      ...(minDrop !== null ? { gte: parseInt(minDrop) } : {}),
      ...(maxDrop !== null ? { lte: parseInt(maxDrop) } : {}),
    };
  }
  if (search) {
    where.OR = [
      { brand: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderBy =
    sort === 'brand'
      ? [{ brand: 'asc' as const }, { model: 'asc' as const }]
      : sort === 'newest'
        ? [{ release_year: 'desc' as const }]
        : [{ avg_score: 'desc' as const }, { review_count: 'desc' as const }];

  const shoes = await prisma.shoes.findMany({
    where,
    orderBy,
    include: {
      shoe_reviews: {
        select: {
          source: true,
          source_url: true,
          expert_score: true,
          user_score: true,
          user_count: true,
          summary: true,
        },
      },
    },
  });

  const data = shoes.map(s => ({
    id: s.id,
    brand: s.brand,
    model: s.model,
    slug: s.slug,
    terrain: s.terrain,
    category: s.category,
    dropMm: s.drop_mm,
    weightG: s.weight_g,
    stackHeightMm: s.stack_height_mm,
    priceGbp: s.price_gbp,
    releaseYear: s.release_year,
    description: s.description,
    imageUrl: s.image_url,
    buyUrl: s.buy_url,
    avgScore: s.avg_score ? parseFloat(s.avg_score.toString()) : null,
    reviewCount: s.review_count,
    lastReviewed: s.last_reviewed,
    reviews: s.shoe_reviews.map(r => ({
      source: r.source,
      sourceUrl: r.source_url,
      expertScore: r.expert_score ? parseFloat(r.expert_score.toString()) : null,
      userScore: r.user_score ? parseFloat(r.user_score.toString()) : null,
      userCount: r.user_count,
      summary: r.summary,
    })),
  }));

  // Build available brands/categories for filters
  const allShoes = await prisma.shoes.findMany({
    select: { brand: true, category: true },
    distinct: ['brand', 'category'],
    orderBy: { brand: 'asc' },
  });
  const brands = [...new Set(allShoes.map(s => s.brand))].sort();
  const categories = [...new Set(allShoes.map(s => s.category))].sort();

  return NextResponse.json({ shoes: data, meta: { brands, categories, total: data.length } });
}
