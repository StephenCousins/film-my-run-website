import type { BestFinish } from './types';

export type Getter = (url: string) => Promise<string | null>;

const UA = 'Mozilla/5.0 (compatible; FilmMyRunBot/1.0; +https://filmmyrun.com)';
const API = 'https://api.utmb.world/search/runners';

export const httpGet: Getter = async (url) => {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
};

/** "Kilian JORNET BURGADA" -> "Kilian Jornet Burgada": UTMB writes surnames in capitals. */
export function displayName(full: string): string {
  return full
    .trim()
    .split(/\s+/)
    .map((w) => (w === w.toUpperCase() && /\p{L}{2}/u.test(w) ? w.toLowerCase().replace(/(^|[-'\u2019])(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase()) : w))
    .join(' ');
}

export interface UtmbRanked { utmbId: number; uri: string; name: string; index: number | null; nationality: string | null; sex: 'M' | 'F' }
export interface UtmbRunner extends UtmbRanked { website: string | null; team: string | null; results: BestFinish[]; finishes: number }

const sexOf = (s: unknown): 'M' | 'F' => (s === 'F' ? 'F' : 'M'); // UTMB: H (homme) or F

export function parseRanked(json: unknown): UtmbRanked[] {
  const runners = (json as { runners?: unknown } | null)?.runners;
  if (!Array.isArray(runners)) return [];
  return runners
    .filter((r) => r && typeof r.id === 'number' && typeof r.uri === 'string' && typeof r.fullname === 'string')
    .map((r) => ({ utmbId: r.id, uri: r.uri, name: displayName(r.fullname), index: typeof r.ip === 'number' ? r.ip : null, nationality: r.nationality ?? null, sex: sexOf(r.sex) }));
}

type RawResult = { dateIso?: string; race?: string; eventName?: string; raceName?: string; distance?: string; elevationGain?: number; time?: string | null; isDnf?: boolean; rank?: number | null; rankGender?: number | null };

/** "Zegama-Aizkorri Mendi Maratoia", "UTMB Mont-Blanc CCC"; a race named after its event keeps its own name (Western States). */
function raceLabel(r: RawResult): string {
  const event = r.eventName?.replace(/®/g, '').trim();
  if (event && r.raceName) return r.raceName.toLowerCase().includes(event.toLowerCase()) ? r.raceName : `${event} ${r.raceName}`;
  return (r.race ?? event ?? 'Unknown race').replace(/\s\d{4}\s-\s/, ' ');
}

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;

export function parseRunnerPage(html: string, uri: string): UtmbRunner | null {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let p: Record<string, unknown>;
  try {
    p = JSON.parse(m[1])?.props?.pageProps;
  } catch {
    return null;
  }
  if (!p || typeof p.fullname !== 'string') return null;
  const general = (p.performanceIndexes as { piCategory: string; index: number | null }[] | undefined)?.find((x) => x.piCategory === 'general');
  const raw = ((p.results as { results?: RawResult[] } | undefined)?.results ?? []) as RawResult[];
  const sex = sexOf(p.gender);
  const finished = raw.filter((r) => !r.isDnf && r.time && r.dateIso);
  const results: BestFinish[] = finished.map((r) => ({
    race: raceLabel(r),
    year: Number(r.dateIso!.slice(0, 4)),
    distance: r.distance ? `${Math.round(Number(r.distance))} km${r.elevationGain ? `, ${r.elevationGain} m climb` : ''}` : null,
    time: r.time ?? null,
    position: r.rankGender ? `${ordinal(r.rankGender)} ${sex === 'F' ? 'woman' : 'man'}` : r.rank ? ordinal(r.rank) : null,
    source: 'UTMB',
  }));
  return {
    utmbId: Number(uri.split('.')[0]),
    uri,
    name: displayName(p.fullname),
    index: typeof general?.index === 'number' ? general.index : null,
    nationality: typeof p.nationalityCode === 'string' ? p.nationalityCode : null,
    sex,
    website: typeof p.website === 'string' && p.website ? p.website : null,
    team: typeof p.team === 'string' && p.team ? p.team : null,
    results,
    finishes: finished.length,
  };
}

export async function topRunners(sex: 'M' | 'F', n: number, get: Getter = httpGet): Promise<UtmbRanked[]> {
  const body = await get(`${API}?category=general&sex=${sex === 'F' ? 'F' : 'H'}&limit=${n}&offset=0&lang=en`);
  return body ? parseRanked(parseJson(body)) : [];
}

export async function utmbRunner(uri: string, get: Getter = httpGet): Promise<UtmbRunner | null> {
  const html = await get(`https://utmb.world/en/runner/${uri}`);
  return html ? parseRunnerPage(html, uri) : null;
}

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** A blocked/rate-limited reply (Cloudflare challenge page, etc.) is a 200 that isn't JSON; fail soft rather than throw. */
export function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/** The UTMB entry whose name is exactly this one (accents and case aside); null otherwise. */
export async function findUtmb(name: string, get: Getter = httpGet): Promise<UtmbRanked | null> {
  const body = await get(`${API}?search=${encodeURIComponent(name)}&limit=10&lang=en`);
  if (!body) return null;
  const hits = parseRanked(parseJson(body)).filter((r) => plain(r.name) === plain(name));
  return hits.length === 1 ? hits[0] : null;
}
