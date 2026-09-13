import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Per-user, so never cached.
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const rows = await prisma.shoe_user_ratings.findMany({
    where: { user_id: parseInt(session.user.id) },
    select: { shoe_id: true, score: true },
  });

  const ratings: Record<number, number> = {};
  for (const r of rows) ratings[r.shoe_id] = parseFloat(r.score.toString());

  return NextResponse.json({ ratings });
}
