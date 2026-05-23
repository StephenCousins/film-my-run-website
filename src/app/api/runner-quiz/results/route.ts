import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { findClosestIdeology } from '@/app/tools/runner-quiz/quiz-data';

const schema = z.object({
  surfaceL: z.number().min(0).max(100),
  methodL: z.number().min(0).max(100),
  distanceL: z.number().min(0).max(100),
  spiritL: z.number().min(0).max(100),
});

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 10;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid scores' }, { status: 400 });
    }

    const { surfaceL, methodL, distanceL, spiritL } = parsed.data;
    const ideology = findClosestIdeology(surfaceL, methodL, distanceL, spiritL);

    await prisma.quiz_results.create({
      data: {
        tribe: ideology.name,
        surface_l: surfaceL,
        method_l: methodL,
        distance_l: distanceL,
        spirit_l: spiritL,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Quiz result store error:', error);
    return NextResponse.json({ error: 'Failed to store result' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const [total, tribeGroups, avgScores] = await Promise.all([
      prisma.quiz_results.count(),

      prisma.quiz_results.groupBy({
        by: ['tribe'],
        _count: { tribe: true },
        orderBy: { _count: { tribe: 'desc' } },
      }),

      prisma.quiz_results.aggregate({
        _avg: {
          surface_l: true,
          method_l: true,
          distance_l: true,
          spirit_l: true,
        },
      }),
    ]);

    const tribes = tribeGroups.map(g => ({
      name: g.tribe,
      count: g._count.tribe,
      pct: total > 0 ? Math.round((g._count.tribe / total) * 100) : 0,
    }));

    const axisBreakdown = total > 0 ? {
      roadPct: Math.round(avgScores._avg.surface_l ?? 50),
      trailPct: 100 - Math.round(avgScores._avg.surface_l ?? 50),
      numbersPct: Math.round(avgScores._avg.method_l ?? 50),
      feelPct: 100 - Math.round(avgScores._avg.method_l ?? 50),
      speedPct: Math.round(avgScores._avg.distance_l ?? 50),
      ultraPct: 100 - Math.round(avgScores._avg.distance_l ?? 50),
      competePct: Math.round(avgScores._avg.spirit_l ?? 50),
      connectPct: 100 - Math.round(avgScores._avg.spirit_l ?? 50),
    } : null;

    return NextResponse.json({ total, tribes, axisBreakdown });
  } catch (error) {
    console.error('Quiz stats error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
