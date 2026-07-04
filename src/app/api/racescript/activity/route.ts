import { NextRequest, NextResponse } from 'next/server';
import { getEphemeral } from '@/lib/racescript/store';
import type { ActivityData } from '@/lib/racescript/strava';
import type { RaceWeather } from '@/lib/racescript/weather';

export async function GET(req: NextRequest) {
  const session = req.nextUrl.searchParams.get('session') || '';
  const data = getEphemeral<{ activity: ActivityData; weather: RaceWeather | null }>(session);
  if (!data) {
    return NextResponse.json(
      { error: 'Your Strava session has expired. Please connect again.' },
      { status: 404 }
    );
  }
  const a = data.activity;
  // Return a summary for the UI (not the full description — that stays server-side).
  return NextResponse.json({
    activity: {
      name: a.name,
      sportType: a.sportType,
      distanceKm: a.distanceKm,
      movingTimeSec: a.movingTimeSec,
      elevationGainM: a.elevationGainM,
      startLocalIso: a.startLocalIso,
      gearName: a.gearName,
      photoUrls: a.photoUrls.slice(0, 6),
      hasDescription: !!a.description,
      athleteName: a.athleteName,
    },
    weather: data.weather,
  });
}
