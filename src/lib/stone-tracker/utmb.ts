/**
 * Thin client for UTMB's public data.
 *
 * - Runner search hits the JSON API (api.utmb.world).
 * - Profile/race-history is read from the runner page's embedded __NEXT_DATA__,
 *   because the results API is multi-tenant and the page already server-renders
 *   everything we need (indexes + full race history).
 *
 * All calls are server-side (route handlers) and cached, to be respectful of
 * UTMB's infrastructure.
 */

const SEARCH_URL = 'https://api.utmb.world/search/runners';
const PROFILE_BASE = 'https://utmb.world/runner';
const UA =
  'Mozilla/5.0 (compatible; FilmMyRun-StoneTracker/1.0; +https://filmmyrun.co.uk/tools/stone-tracker)';
const CACHE_SECONDS = 300;

export interface RunnerMatch {
  id: number;
  fullname: string;
  nationality: string; // ISO-2 country code, e.g. "GB"
  ageGroup: string; // e.g. "55-59"
  sex: string; // "H" | "F"
  index: number | null; // general UTMB Index
  uri: string; // profile slug, e.g. "812784.stephen.cousins"
}

export async function searchRunners(name: string, limit = 25): Promise<RunnerMatch[]> {
  const url = `${SEARCH_URL}?search=${encodeURIComponent(name)}&limit=${limit}`;
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': UA },
    next: { revalidate: CACHE_SECONDS },
  });
  if (!res.ok) throw new Error(`UTMB search failed (${res.status})`);
  const data = await res.json();
  return (data.runners || [])
    .filter((r: { uri?: string }) => !!r.uri)
    .map(
      (r: {
        id: number;
        fullname: string;
        nationality: string;
        ageGroup: string;
        sex: string;
        ip: number | null;
        uri: string;
      }): RunnerMatch => ({
        id: r.id,
        fullname: r.fullname,
        nationality: r.nationality,
        ageGroup: r.ageGroup,
        sex: r.sex,
        index: r.ip ?? null,
        uri: r.uri,
      })
    );
}

export interface RaceResult {
  dateIso: string;
  eventName: string;
  raceName: string;
  piCategory: string | null; // "20k" | "50k" | "100k" | "100m" | null
  isDnf: boolean;
  utmbEventStatus: string; // "event" | "final" | ""
}

export interface PerformanceIndex {
  piCategory: string; // "general" | "20k" | ...
  index: number | null;
}

export interface RunnerProfile {
  fullname: string;
  nationalityCode: string;
  ageGroup: string;
  gender: string;
  performanceIndexes: PerformanceIndex[];
  results: RaceResult[];
}

export async function fetchRunnerProfile(uri: string): Promise<RunnerProfile> {
  // uri looks like "812784.stephen.cousins" — guard against path traversal.
  if (!/^\d+\.[a-z0-9.\-']+$/i.test(uri)) throw new Error('Invalid runner id');

  const res = await fetch(`${PROFILE_BASE}/${uri}`, {
    headers: { 'user-agent': UA },
    next: { revalidate: CACHE_SECONDS },
  });
  if (!res.ok) throw new Error(`UTMB profile failed (${res.status})`);

  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Could not parse UTMB profile');

  const pp = JSON.parse(m[1])?.props?.pageProps || {};
  const results: RaceResult[] = (pp.results?.results || []).map(
    (r: {
      dateIso: string;
      eventName: string;
      raceName: string;
      piCategory: string | null;
      isDnf: boolean;
      utmbEventStatus?: string;
    }): RaceResult => ({
      dateIso: r.dateIso,
      eventName: r.eventName,
      raceName: r.raceName,
      piCategory: r.piCategory,
      isDnf: !!r.isDnf,
      utmbEventStatus: r.utmbEventStatus || '',
    })
  );

  return {
    fullname: pp.fullname || '',
    nationalityCode: pp.nationalityCode || '',
    ageGroup: pp.ageGroup || '',
    gender: pp.gender || '',
    performanceIndexes: pp.performanceIndexes || [],
    results,
  };
}
