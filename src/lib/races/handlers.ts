import { NextRequest, NextResponse } from 'next/server';
import { isFmrClub } from '@/lib/chat/handlers';
import { isInstallId } from '@/lib/chat/validate';
import { memberFromBearer } from '@/lib/members/handlers';
import { liveMemberDeps } from '@/lib/members/store';

/**
 * Race-day pacing's race library (25 Sep 2026): the Crew Notes library, one
 * race database for both apps. This site holds the service key and a day's
 * cache, so the phone never sees the key and a Crew Notes outage never
 * reaches a runner.
 *
 * GET /api/app/v1/races            every race, summary only (anyone: it is the shop window)
 * GET /api/app/v1/races?slug=x     the course, checkpoint by checkpoint (FMR Club)
 */
export type RaceSummary = {
  slug: string;
  name: string;
  courseName: string | null;
  country: string | null;
  distanceKm: number | null;
  elevationGainM: number | null;
  checkpointCount: number;
  verified: boolean;
};

export type RacesDeps = {
  list: () => Promise<RaceSummary[] | null>;
  course: (slug: string) => Promise<unknown | null>;
  memberForRequest?: (req: Request) => Promise<{ proUntil: string | null } | null>;
  debugIds?: string;
  now?: () => number;
};

/** Shorter races are left out of Ultra Race Pacing. */
export const MIN_ULTRA_KM = 45;

export async function handleRaces(req: NextRequest, deps: RacesDeps): Promise<Response> {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) {
    const races = await deps.list();
    if (!races) return NextResponse.json({ ok: false, error: 'Race library unavailable' }, { status: 503 });
    // A pacer needs somewhere to pace to: a start and a finish at least. And
    // it paces ultras only (Stephen, 25 Sep: "Ultra Race Pacing"); 45 km, not
    // 50, because a 50K's GPX often measures short (the Arc 50 is 49.0 km).
    return NextResponse.json({
      ok: true,
      races: races.filter((r) => r.checkpointCount >= 2 && (r.distanceKm ?? 0) >= MIN_ULTRA_KM),
    });
  }
  const installId = req.headers.get('X-FMR-Install') ?? '';
  const now = deps.now ? deps.now() : Date.now();
  if (!(await isFmrClub(req, isInstallId(installId) ? installId : '', deps, now))) {
    return NextResponse.json({ ok: false, error: 'FMR Club required' }, { status: 403 });
  }
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  const course = await deps.course(slug);
  if (!course) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, course });
}

const CREWNOTES_API = 'https://crewnotes-api-production.up.railway.app/v1/partner';

async function fromCrewNotes<T>(path: string): Promise<T | null> {
  const key = process.env.CREWNOTES_PARTNER_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${CREWNOTES_API}${path}`, {
      headers: { 'X-Service-Key': key },
      // The library changes when a race is re-seeded, not by the minute.
      next: { revalidate: 86_400 },
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export const liveRacesDeps: RacesDeps = {
  list: async () => (await fromCrewNotes<{ races: RaceSummary[] }>('/races'))?.races ?? null,
  course: (slug) => fromCrewNotes<unknown>(`/races/${encodeURIComponent(slug)}`),
  memberForRequest: (req) => memberFromBearer(req, liveMemberDeps),
};
