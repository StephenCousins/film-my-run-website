import { prisma } from '@/lib/db';
import { slugBase } from '@/lib/news/plan';
import type { RunnerFile, RunnerSource } from './types';
import { findUtmb, httpGet, utmbRunner, type Getter, type UtmbRunner } from './utmb';
import { wikipediaArticle } from './wikipedia';

export interface GatherDeps {
  get: Getter;
  /** Our published stories that name this runner: title, link and plain text. */
  ourStories: (name: string) => Promise<{ title: string; url: string; text: string }[]>;
}

const RUNNING_WORDS = /\b(runner|runners|running|ran|marathons?|ultramarathons?|ultra-trail|ultrarunning|ultrarunner|athlete|athletics|trail running|track and field|middle-distance|long-distance|mile)\b/i;

/** A race name's first two words, lowercased and stripped of punctuation (hyphens
 * kept: "Mont-Blanc" is one word). "UTMB Mont-Blanc CCC" -> "utmb mont-blanc". */
export const raceKey = (race: string) =>
  race.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().split(/\s+/).slice(0, 2).join(' ');

/**
 * Whether a Wikipedia article actually talks about (at least one of) the races a
 * UTMB profile lists results for — the guard against two different people sharing
 * a name (a namesake's UTMB profile, a musician's Wikipedia page). Case-insensitive
 * on each race's first two distinctive words ("Western States", "Hardrock"), plus
 * "UTMB"/"Ultra-Trail du Mont-Blanc" in the text counting for any result whose race
 * itself contains "UTMB".
 */
function utmbRacesInText(utmb: UtmbRunner, wikiText: string): boolean {
  const text = wikiText.toLowerCase();
  const mentionsUtmb = text.includes('utmb') || text.includes('ultra-trail du mont-blanc');
  return utmb.results.some((r) => {
    if (mentionsUtmb && /utmb/i.test(r.race)) return true;
    const key = raceKey(r.race);
    return key.length > 0 && text.includes(key);
  });
}

const liveDeps: GatherDeps = {
  get: httpGet,
  ourStories: async (name) => {
    const rows = await prisma.news_stories.findMany({ where: { status: 'published', content: { contains: name } }, select: { title: true, slug: true, content: true }, orderBy: { published_at: 'desc' }, take: 10 });
    return rows.map((r) => ({ title: r.title, url: `https://filmmyrun.com/news/${r.slug}`, text: r.content.replace(/<[^>]+>/g, ' ') }));
  },
};

/**
 * Everything we can find on one runner, cheapest first: the UTMB entry (index and
 * results), Wikipedia, and our own stories. No UTMB entry and no Wikipedia article
 * is null: a runner we can't find results for gets no page.
 */
/** `noUtmbSearch`: never look a name up on UTMB (a page with no UTMB link must not pick up a namesake's). */
export async function gatherRunner(input: { name?: string; utmbUri?: string; era?: 'current' | 'historic'; noUtmbSearch?: boolean }, deps: GatherDeps = liveDeps): Promise<RunnerFile | null> {
  const uri = input.utmbUri ?? (input.name && !input.noUtmbSearch ? (await findUtmb(input.name, deps.get))?.uri : undefined);
  let utmb = uri ? await utmbRunner(uri, deps.get) : null;
  const name = utmb?.name ?? input.name?.trim();
  if (!name) return null;
  const wikiPage = await wikipediaArticle(name, deps.get);
  // Only use it if it's actually about running: a same-named actor, politician etc. would
  // otherwise pass straight through as a source. Whole words only, so "trailer", "track
  // record", "ultrasound" and "Milestone" don't count; "running mate" is stripped first so
  // a politician's own running mate doesn't count as the article being about running.
  const wiki = wikiPage && RUNNING_WORDS.test(wikiPage.text.slice(0, 2000).replace(/running mate/gi, '')) ? wikiPage : null;
  // Two different people can share a name: a UTMB namesake and an unrelated
  // Wikipedia subject. On a name lookup only (an explicit utmbUri is trusted
  // outright), drop the UTMB entry unless the article actually names one of its races.
  if (utmb && wiki && !input.utmbUri && !utmbRacesInText(utmb, wiki.text)) utmb = null;
  if (!utmb && !wiki) return null;

  const texts: RunnerFile['texts'] = [];
  if (utmb) {
    const src: RunnerSource = { name: 'UTMB', url: `https://utmb.world/en/runner/${utmb.uri}` };
    const lines = [
      `${utmb.name}, ${utmb.nationality ?? 'nationality not given'}, ${utmb.sex === 'F' ? 'woman' : 'man'}.`,
      utmb.index !== null ? `General UTMB Index: ${utmb.index}.` : 'No current UTMB Index.',
      utmb.team ? `Team: ${utmb.team}.` : '',
      ...utmb.results.map((r) => `${r.year}: ${r.race}, ${r.distance ?? ''}, ${r.time ?? ''}, ${r.position ?? ''}.`),
    ];
    texts.push({ source: src, text: lines.filter(Boolean).join('\n') });
  }
  if (wiki) texts.push({ source: { name: 'Wikipedia', url: wiki.url }, text: wiki.text.slice(0, 20000) });
  const ours = await deps.ourStories(name);
  if (ours.length) texts.push({ source: { name: 'Film My Run', url: ours[0].url }, text: ours.map((s) => `${s.title}\n${s.text}`).join('\n\n').slice(0, 12000) });

  return {
    slug: slugBase(name),
    name,
    aliases: [],
    nationality: utmb?.nationality ?? null,
    sex: utmb?.sex ?? null,
    birthYear: null,
    disciplines: utmb ? ['trail_ultra'] : [],
    era: input.era ?? 'current',
    utmb: utmb ? { id: utmb.utmbId, uri: utmb.uri, index: utmb.index, website: utmb.website, picture: utmb.picture } : null,
    texts,
    results: utmb?.results ?? [],
    photoCandidates: wiki?.image ? [wiki.image] : [],
  };
}
