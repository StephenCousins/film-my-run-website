import { NextRequest, NextResponse } from 'next/server';
import { exchangeToken, fetchActivity } from '@/lib/racescript/strava';
import { getRaceWeather } from '@/lib/racescript/weather';
import { takeEphemeral, putEphemeral } from '@/lib/racescript/store';

const TOOL = '/tools/racescript';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const origin = req.nextUrl.origin;
  const err = sp.get('error');
  const code = sp.get('code');
  const state = sp.get('state');

  if (err || !code || !state) {
    return NextResponse.redirect(new URL(`${TOOL}?error=denied`, origin));
  }

  const pending = takeEphemeral<{ activityId: string }>(state);
  if (!pending) {
    return NextResponse.redirect(new URL(`${TOOL}?error=expired`, origin));
  }

  try {
    // Exchange the code, fetch the one activity, look up weather — then discard
    // the token (never stored). Only the derived context lives on, briefly.
    const token = await exchangeToken(code);
    const activity = await fetchActivity(token.accessToken, pending.activityId, token.athleteName);
    const weather = activity.startLatLng
      ? await getRaceWeather(activity.startLatLng[0], activity.startLatLng[1], activity.startLocalIso)
      : null;
    const session = putEphemeral({ activity, weather });
    return NextResponse.redirect(new URL(`${TOOL}?session=${session}`, origin));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch_failed';
    return NextResponse.redirect(new URL(`${TOOL}?error=${encodeURIComponent(msg)}`, origin));
  }
}
