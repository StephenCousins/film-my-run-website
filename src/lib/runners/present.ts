import { prisma } from '@/lib/db';
import { sanitizeContent } from '@/lib/sanitize';
import { loadNameIndex, mentionedSlugs } from './names';
import type { BestFinish, RunnerPhoto } from './types';

/** The word used to prefilter a name in the DB query: the last word, with any
 * apostrophe part removed ("O'Neill" -> "Neill", straight or curly quote). */
export function lastNameWord(n: string): string {
  const word = n.trim().split(/\s+/).pop() ?? '';
  const parts = word.split(/['\u2019]/);
  return parts[parts.length - 1];
}

export function personJsonLd(r: { name: string; slug: string; nationality: string | null; birthYear?: number | null; photos: RunnerPhoto[]; bioText: string; sameAs: string[] }) {
  const photo = r.photos.find((p) => p.kind === 'portrait') ?? r.photos[0];
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: r.name,
    url: `https://filmmyrun.com/runners/${r.slug}`,
    description: r.bioText.slice(0, 300),
    ...(r.nationality ? { nationality: r.nationality } : {}),
    ...(r.birthYear ? { birthDate: String(r.birthYear) } : {}),
    ...(photo ? { image: photo.url } : {}),
    ...(r.sameAs.length ? { sameAs: r.sameAs } : {}),
  };
}

/**
 * Our published stories about a runner, newest first: exactly the stories whose
 * text links them (mentionedSlugs), so the two directions always agree.
 * ponytail: scans every published story per page view (hundreds of rows); add a
 * story_runners table if it passes a few thousand.
 */
export async function storiesAbout(slug: string, preloaded?: Map<string, string>) {
  const index = preloaded ?? await loadNameIndex();
  const names = [...index.entries()].filter(([, s]) => s === slug).map(([n]) => n);
  if (!names.length) return [];
  const rows = await prisma.news_stories.findMany({
    where: { status: 'published', OR: names.map((n) => ({ content: { contains: lastNameWord(n), mode: 'insensitive' } })) },
    select: { slug: true, title: true, image_url: true, content: true, published_at: true, created_at: true },
    orderBy: { published_at: 'desc' },
  });
  return rows
    .filter((r) => mentionedSlugs(sanitizeContent(r.content), index).has(slug))
    .map((r) => ({ slug: r.slug, title: r.title, imageUrl: r.image_url, publishedAt: (r.published_at ?? r.created_at).toISOString() }));
}

/** "Born 1989 (age 36 or 37)": only the year is known, so the age is a pair.
 * Legends get the year alone, since some have died and the page never says so. */
export function bornLine(birthYear: number | null, era: string, now = new Date()): string | null {
  if (!birthYear) return null;
  if (era === 'historic') return `Born ${birthYear}`;
  const a = now.getFullYear() - birthYear;
  return `Born ${birthYear} (age ${a - 1} or ${a})`;
}

/** The title says what people search for: "Ruth Croft age", "... results", "... UTMB Index". */
export function runnerTitle(name: string, birthYear: number | null, utmbIndex: number | null): string {
  const parts = [birthYear ? 'age' : null, 'results', utmbIndex !== null ? 'UTMB Index' : 'profile'].filter(Boolean) as string[];
  return `${name}: ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Race names compare without case, punctuation or a trailing distance ("UTMB 100" is "UTMB"). */
export function raceKey(race: string): string {
  return race.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
    .replace(/(\s+\d+(\s?(k|km|mi|miles?))?)+$/, '').trim();
}

export interface SimilarCandidate { slug: string; name: string; nationality: string | null; sex: string | null; disciplines: string[]; era: string; races: string[]; utmbIndex: number | null }

/**
 * Up to `n` runners like this one: same sex and shared races count most, then
 * discipline, era and country; ties go to the higher UTMB Index. Nobody with nothing in common.
 * ponytail: scores every published runner per view (hundreds); precompute if it passes a few thousand.
 */
export function similarRunners(me: SimilarCandidate, all: SimilarCandidate[], n = 6): SimilarCandidate[] {
  const mine = new Set(me.races.map(raceKey));
  return all
    .filter((r) => r.slug !== me.slug)
    .map((r) => {
      const shared = new Set(r.races.map(raceKey).filter((k) => mine.has(k))).size;
      const disc = r.disciplines.some((d) => me.disciplines.includes(d)) ? 1 : 0;
      const sex = me.sex && r.sex === me.sex ? 3 : 0;
      return { r, score: sex + Math.min(shared, 3) * 2 + disc * 2 + (r.era === me.era ? 1 : 0) + (me.nationality && r.nationality === me.nationality ? 1 : 0), shared, disc };
    })
    .filter((x) => x.shared > 0 || x.disc > 0)
    .sort((a, b) => b.score - a.score || (b.r.utmbIndex ?? -1) - (a.r.utmbIndex ?? -1))
    .slice(0, n)
    .map((x) => x.r);
}

export interface Film { event: string; url: string; date: string }

/** Film My Run's own films of races in this runner's best finishes, newest film per race. */
export function filmsForFinishes(finishes: BestFinish[], films: Film[]): { race: string; film: Film }[] {
  const byKey = new Map<string, Film>();
  for (const f of [...films].sort((a, b) => b.date.localeCompare(a.date))) {
    const k = raceKey(f.event);
    if (k && !byKey.has(k)) byKey.set(k, f);
  }
  const out = new Map<string, { race: string; film: Film }>();
  for (const b of finishes) {
    const k = raceKey(b.race);
    const film = byKey.get(k);
    if (film && !out.has(k)) out.set(k, { race: b.race, film });
  }
  return [...out.values()];
}

/** The YouTube id of a youtu.be or youtube.com/watch link, for its thumbnail. */
export function youtubeId(url: string): string | null {
  return url.match(/(?:youtu\.be\/|[?&]v=)([\w-]{11})/)?.[1] ?? null;
}
