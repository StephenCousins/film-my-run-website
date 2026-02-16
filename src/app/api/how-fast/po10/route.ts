import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  validateAthleteId,
  fetchPo10Page,
  calculateOverallStats,
  updatePo10Summary,
  type PB,
} from '@/lib/how-fast/po10-scraper';

export const dynamic = 'force-dynamic';

const CACHE_HOURS = 6;

export async function GET(request: NextRequest) {
  const athlete_id = request.nextUrl.searchParams.get('id');

  const validation = validateAthleteId(athlete_id || '');
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const id = validation.sanitized!;

  try {
    // Check for existing athlete record
    const cached = await prisma.po10_athletes.findUnique({
      where: { athlete_id: id },
    });

    // If athlete exists, return stored data instantly
    if (cached && cached.pbs_json) {
      const cacheAge = (Date.now() - new Date(cached.updated_at).getTime()) / (1000 * 60 * 60);
      const needsRefresh = cacheAge >= CACHE_HOURS;

      // Update lookup count (non-blocking)
      prisma.po10_athletes.update({
        where: { athlete_id: id },
        data: {
          lookup_count: { increment: 1 },
          last_lookup_at: new Date(),
        },
      }).catch(() => {});

      // Log lookup (non-blocking)
      prisma.athlete_lookups.create({
        data: {
          source: 'po10',
          athlete_id: id,
          athlete_name: cached.name,
        },
      }).catch(() => {});

      const pbs = (cached.pbs_json as unknown as Record<string, PB>) || {};
      const stats = calculateOverallStats(
        pbs,
        cached.gender as 'male' | 'female' | null,
        cached.age_group
      );

      return NextResponse.json({
        ok: true,
        cached: true,
        needsRefresh,
        athlete: {
          name: cached.name,
          athleteId: id,
          club: cached.club,
          ageGroup: cached.age_group,
          gender: cached.gender,
          pbs,
        },
        stats,
      });
    }

    // New athlete: scrape fresh data
    const data = await fetchPo10Page(id);

    if (data.error) {
      if (cached) {
        return NextResponse.json({
          ok: true,
          cached: true,
          stale: true,
          needsRefresh: false,
          warning: data.error,
          athlete: {
            name: cached.name,
            athleteId: id,
            club: cached.club,
          },
        });
      }
      return NextResponse.json({ ok: false, error: data.error }, { status: 500 });
    }

    if (Object.keys(data.pbs).length === 0) {
      return NextResponse.json({ ok: false, error: 'No personal bests found for this athlete' }, { status: 404 });
    }

    const stats = calculateOverallStats(data.pbs, data.gender, data.age_group);

    // Save to cache
    await updatePo10Summary(id, data, stats);

    // Log lookup
    await prisma.athlete_lookups.create({
      data: {
        source: 'po10',
        athlete_id: id,
        athlete_name: data.name,
      },
    });

    return NextResponse.json({
      ok: true,
      cached: false,
      needsRefresh: false,
      athlete: {
        name: data.name,
        athleteId: data.athlete_id,
        club: data.club,
        ageGroup: data.age_group,
        gender: data.gender,
        pbs: data.pbs,
      },
      stats,
    });
  } catch (error) {
    console.error('Power of 10 scraper error:', error);

    // Try to return stale cache
    const cached = await prisma.po10_athletes.findUnique({
      where: { athlete_id: id },
    }).catch(() => null);

    if (cached) {
      const pbs = (cached.pbs_json as unknown as Record<string, PB>) || {};
      const stats = Object.keys(pbs).length > 0
        ? calculateOverallStats(pbs, cached.gender as 'male' | 'female' | null, cached.age_group)
        : null;

      return NextResponse.json({
        ok: true,
        cached: true,
        stale: true,
        needsRefresh: false,
        warning: error instanceof Error ? error.message : 'Failed to fetch fresh data',
        athlete: {
          name: cached.name,
          athleteId: id,
          club: cached.club,
          ageGroup: cached.age_group,
          gender: cached.gender,
          pbs,
        },
        stats,
      });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to fetch Power of 10 data' },
      { status: 500 }
    );
  }
}
