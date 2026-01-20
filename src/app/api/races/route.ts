import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all races ordered by date descending
    const races = await prisma.race.findMany({
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
      distanceKm: race.distanceKm ? Number(race.distanceKm) : null,
      timeHms: race.timeHms,
      secs: race.timeSeconds,
      elev: race.elevation,
      pos: race.position,
      terrain: race.terrain,
      video: race.videoUrl,
      strava: race.stravaUrl,
      results: race.resultsUrl,
    }));

    // Get top 10 fastest marathons (by time_seconds, ascending)
    const marathons = await prisma.race.findMany({
      where: {
        type: 'Marathon',
        timeSeconds: { not: null },
      },
      orderBy: {
        timeSeconds: 'asc',
      },
      take: 10,
    });

    const marathonsData = marathons.map((race) => ({
      id: race.id,
      date: race.date?.toISOString().split('T')[0] || null,
      event: race.event,
      type: race.type,
      distanceKm: race.distanceKm ? Number(race.distanceKm) : null,
      timeHms: race.timeHms,
      secs: race.timeSeconds,
    }));

    // Get top 10 longest ultras (by time_seconds, descending - longest time means longest race)
    const ultras = await prisma.race.findMany({
      where: {
        type: 'Ultra',
        timeSeconds: { not: null },
      },
      orderBy: {
        timeSeconds: 'desc',
      },
      take: 10,
    });

    const ultrasData = ultras.map((race) => ({
      id: race.id,
      date: race.date?.toISOString().split('T')[0] || null,
      event: race.event,
      type: race.type,
      distanceKm: race.distanceKm ? Number(race.distanceKm) : null,
      timeHms: race.timeHms,
      secs: race.timeSeconds,
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
