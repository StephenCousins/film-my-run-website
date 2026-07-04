import { NextRequest, NextResponse } from 'next/server';
import { parseActivityId, getAuthorizeUrl, stravaConfigured } from '@/lib/racescript/strava';
import { putEphemeral } from '@/lib/racescript/store';

const TOOL = '/tools/racescript';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  if (!stravaConfigured()) {
    return NextResponse.redirect(new URL(`${TOOL}?error=strava_not_configured`, origin));
  }
  const activityId = parseActivityId(req.nextUrl.searchParams.get('activity') || '');
  if (!activityId) {
    return NextResponse.redirect(new URL(`${TOOL}?error=bad_activity`, origin));
  }

  // Stash the intended activity; the random key doubles as the OAuth state.
  const state = putEphemeral({ activityId }, 10 * 60 * 1000);
  const base = process.env.NEXT_PUBLIC_SITE_URL || origin;
  const redirectUri = `${base}/api/racescript/callback`;
  return NextResponse.redirect(getAuthorizeUrl(redirectUri, state));
}
