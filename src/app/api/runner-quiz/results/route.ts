import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { QUIZ, parseResult } from '@/lib/runner-quiz';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    // Drop expired entries as we go, so the map doesn't grow with every IP ever seen.
    for (const [key, e] of rateLimitMap) if (now > e.resetAt) rateLimitMap.delete(key);
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 10;
}

// Body: { type: "<id>", scores: [S, M, D, R] } from the website or the app.
// Scores go in the old columns: surface_l = S, method_l = M, distance_l = D, spirit_l = R.
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const parsed = parseResult(await request.json().catch(() => null));
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid result' }, { status: 400 });
    }

    const [s, m, d, r] = parsed.scores;
    await prisma.quiz_results.create({
      data: { tribe: parsed.type.name, surface_l: s, method_l: m, distance_l: d, spirit_l: r },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Quiz result store error:', error);
    return NextResponse.json({ error: 'Failed to store result' }, { status: 500 });
  }
}

// Counts only the current 12 types; rows from the old quiz stay stored but aren't counted.
export async function GET() {
  try {
    const names = QUIZ.types.map((t) => t.name);
    const groups = await prisma.quiz_results.groupBy({
      by: ['tribe'],
      where: { tribe: { in: names } },
      _count: { tribe: true },
    });
    const total = groups.reduce((n, g) => n + g._count.tribe, 0);
    const types = QUIZ.types
      .map((t) => {
        const count = groups.find((g) => g.tribe === t.name)?._count.tribe ?? 0;
        return { id: t.id, name: t.name, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
      })
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ total, types }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (error) {
    console.error('Quiz stats error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
