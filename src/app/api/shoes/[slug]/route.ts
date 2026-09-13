import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { reviewSelect, serializeReview, serializeShoe, shoeSelect } from '../serialize';

export const revalidate = 300;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const shoe = await prisma.shoes.findUnique({
    where: { slug },
    select: { ...shoeSelect, shoe_reviews: { select: reviewSelect } },
  });
  if (!shoe) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...serializeShoe(shoe),
    reviews: shoe.shoe_reviews.map(serializeReview),
  });
}
