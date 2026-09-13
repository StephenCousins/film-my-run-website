import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recomputeShoeScore } from '@/lib/shoes/scores';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const shoeId = body?.shoeId;
  const score = body?.score;

  if (typeof shoeId !== 'number' || typeof score !== 'number' || score < 1 || score > 10 || score % 0.5 !== 0) {
    return NextResponse.json({ error: 'Invalid rating. Must be 1-10 in 0.5 increments.' }, { status: 400 });
  }

  const userId = parseInt(session.user.id);

  const shoe = await prisma.shoes.findUnique({ where: { id: shoeId } });
  if (!shoe) {
    return NextResponse.json({ error: 'Shoe not found' }, { status: 404 });
  }

  const rating = await prisma.shoe_user_ratings.upsert({
    where: { shoe_id_user_id: { shoe_id: shoeId, user_id: userId } },
    update: { score },
    create: { shoe_id: shoeId, user_id: userId, score },
  });

  const s = await recomputeShoeScore(shoeId);

  return NextResponse.json({
    rating: parseFloat(rating.score.toString()),
    userAvg: s.userAvgScore,
    userCount: s.userRatingCount,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const shoeId = parseInt(searchParams.get('shoeId') ?? '');
  if (isNaN(shoeId)) {
    return NextResponse.json({ error: 'Missing shoeId' }, { status: 400 });
  }

  const userId = parseInt(session.user.id);

  const shoe = await prisma.shoes.findUnique({ where: { id: shoeId }, select: { id: true } });
  if (!shoe) {
    return NextResponse.json({ error: 'Shoe not found' }, { status: 404 });
  }

  await prisma.shoe_user_ratings.deleteMany({
    where: { shoe_id: shoeId, user_id: userId },
  });

  const s = await recomputeShoeScore(shoeId);

  return NextResponse.json({ userAvg: s.userAvgScore, userCount: s.userRatingCount });
}
