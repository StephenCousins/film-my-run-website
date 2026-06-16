import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

  const agg = await prisma.shoe_user_ratings.aggregate({
    where: { shoe_id: shoeId },
    _avg: { score: true },
    _count: { score: true },
  });

  return NextResponse.json({
    rating: parseFloat(rating.score.toString()),
    userAvg: agg._avg.score ? parseFloat(agg._avg.score.toString()) : null,
    userCount: agg._count.score,
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

  await prisma.shoe_user_ratings.deleteMany({
    where: { shoe_id: shoeId, user_id: userId },
  });

  const agg = await prisma.shoe_user_ratings.aggregate({
    where: { shoe_id: shoeId },
    _avg: { score: true },
    _count: { score: true },
  });

  return NextResponse.json({
    userAvg: agg._avg.score ? parseFloat(agg._avg.score.toString()) : null,
    userCount: agg._count.score,
  });
}
