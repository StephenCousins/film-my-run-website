/**
 * Strava OAuth + activity fetch for RaceScript.
 *
 * Ephemeral use: we exchange the code for a token, pull the one activity, then
 * discard the token. Nothing is persisted.
 */

const AUTHORIZE = 'https://www.strava.com/oauth/authorize';
const TOKEN = 'https://www.strava.com/oauth/token';
const API = 'https://www.strava.com/api/v3';

export function stravaConfigured(): boolean {
  return !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
}

/** Extract the numeric activity id from a Strava activity URL or a raw id. */
export function parseActivityId(input: string): string | null {
  const s = input.trim();
  if (/^\d+$/.test(s)) return s;
  const m = s.match(/strava\.com\/activities\/(\d+)/i);
  return m ? m[1] : null;
}

export function getAuthorizeUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
    state,
  });
  return `${AUTHORIZE}?${p.toString()}`;
}

export interface StravaToken {
  accessToken: string;
  athleteName: string;
}

export async function exchangeToken(code: string): Promise<StravaToken> {
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed (${res.status})`);
  const data = await res.json();
  const a = data.athlete || {};
  return {
    accessToken: data.access_token,
    athleteName: [a.firstname, a.lastname].filter(Boolean).join(' '),
  };
}

export interface ActivityData {
  id: number;
  name: string;
  description: string;
  sportType: string;
  distanceKm: number;
  movingTimeSec: number;
  elapsedTimeSec: number;
  elevationGainM: number;
  startLocalIso: string;
  startLatLng: [number, number] | null;
  avgHr: number | null;
  maxHr: number | null;
  avgCadence: number | null;
  avgWatts: number | null;
  calories: number | null;
  sufferScore: number | null;
  achievementCount: number;
  prCount: number;
  gearName: string | null;
  bestEfforts: { name: string; timeSec: number }[];
  photoUrls: string[];
  athleteName: string;
}

// Strip his own promo boilerplate / links so it doesn't leak into the report.
function cleanDescription(desc: string): string {
  if (!desc) return '';
  return desc
    .split('\n')
    .filter((line) => {
      const l = line.toLowerCase();
      if (/https?:\/\/\S+/.test(l)) return false;
      if (/(subscribe|youtube|patreon|instagram\.com|film my run|linktr)/.test(l)) return false;
      return true;
    })
    .join('\n')
    .trim();
}

export async function fetchActivity(
  token: string,
  activityId: string,
  athleteName: string
): Promise<ActivityData> {
  const headers = { authorization: `Bearer ${token}` };

  const res = await fetch(`${API}/activities/${activityId}?include_all_efforts=true`, { headers });
  if (res.status === 404) throw new Error('Activity not found (is it yours, and readable?)');
  if (!res.ok) throw new Error(`Strava activity fetch failed (${res.status})`);
  const a = await res.json();

  // Photos (separate endpoint gives all uploaded photos + full-size URLs).
  let photoUrls: string[] = [];
  try {
    const pRes = await fetch(
      `${API}/activities/${activityId}/photos?size=1200&photo_sources=true`,
      { headers }
    );
    if (pRes.ok) {
      const photos = await pRes.json();
      photoUrls = (photos || [])
        .map((p: { urls?: Record<string, string> }) => {
          const urls = p.urls || {};
          const keys = Object.keys(urls);
          return keys.length ? urls[keys[keys.length - 1]] : null;
        })
        .filter(Boolean) as string[];
    }
  } catch {
    // photos are a nice-to-have
  }

  return {
    id: a.id,
    name: a.name || '',
    description: cleanDescription(a.description || ''),
    sportType: a.sport_type || a.type || 'Run',
    distanceKm: (a.distance || 0) / 1000,
    movingTimeSec: a.moving_time || 0,
    elapsedTimeSec: a.elapsed_time || 0,
    elevationGainM: a.total_elevation_gain || 0,
    startLocalIso: a.start_date_local || a.start_date || '',
    startLatLng:
      Array.isArray(a.start_latlng) && a.start_latlng.length === 2
        ? [a.start_latlng[0], a.start_latlng[1]]
        : null,
    avgHr: a.average_heartrate ?? null,
    maxHr: a.max_heartrate ?? null,
    avgCadence: a.average_cadence ?? null,
    avgWatts: a.average_watts ?? null,
    calories: a.calories ?? null,
    sufferScore: a.suffer_score ?? null,
    achievementCount: a.achievement_count ?? 0,
    prCount: a.pr_count ?? 0,
    gearName: a.gear?.name ?? null,
    bestEfforts: (a.best_efforts || []).map((b: { name: string; elapsed_time: number }) => ({
      name: b.name,
      timeSec: b.elapsed_time,
    })),
    photoUrls,
    athleteName,
  };
}
