import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all races ordered by date descending
    const races = await prisma.races.findMany({
      orderBy: {
        date: 'desc',
      },
    });

    // Transform data for frontend
    const data = races.map((race) => ({
      id: race.id,
      date: race.date?.toISOString().split('T')[0] || null,
      event: race.event,
      type: race.type,
      distance_km: race.distance_km ? Number(race.distance_km) : null,
      time_hms: race.time_hms,
      secs: race.time_seconds,
      elev: race.elevation,
      pos: race.position,
      terrain: race.terrain,
      video: race.video_url,
      strava: race.strava_url,
      results: race.results_url,
    }));

    // Get top 10 fastest marathons (by time_seconds, ascending)
    const marathons = await prisma.races.findMany({
      where: {
        type: 'Marathon',
        time_seconds: { not: null },
      },
      orderBy: {
        time_seconds: 'asc',
      },
      take: 10,
    });

    const marathonsData = marathons.map((race) => ({
      id: race.id,
      date: race.date?.toISOString().split('T')[0] || null,
      event: race.event,
      type: race.type,
      distance_km: race.distance_km ? Number(race.distance_km) : null,
      time_hms: race.time_hms,
      secs: race.time_seconds,
    }));

    // Get top 10 longest ultras (by time_seconds, descending - longest time means longest race)
    const ultras = await prisma.races.findMany({
      where: {
        type: 'Ultra',
        time_seconds: { not: null },
      },
      orderBy: {
        time_seconds: 'desc',
      },
      take: 10,
    });

    const ultrasData = ultras.map((race) => ({
      id: race.id,
      date: race.date?.toISOString().split('T')[0] || null,
      event: race.event,
      type: race.type,
      distance_km: race.distance_km ? Number(race.distance_km) : null,
      time_hms: race.time_hms,
      secs: race.time_seconds,
    }));

    // Get unique years from race dates
    const yearsResult = await prisma.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int as year
      FROM races
      WHERE date IS NOT NULL
      ORDER BY year DESC
    `;
    const years = yearsResult.map((r) => r.year);

    return NextResponse.json({
      ok: true,
      message: 'OK',
      data,
      marathons: marathonsData,
      ultras: ultrasData,
      years,
    });
  } catch (error) {
    console.error('Race API error:', error);
    return NextResponse.json(
      { ok: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
