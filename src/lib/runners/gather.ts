import { prisma } from '@/lib/db';
import { slugBase } from '@/lib/news/plan';
import type { RunnerFile, RunnerSource } from './types';
import { findUtmb, httpGet, utmbRunner, type Getter } from './utmb';
import { wikipediaArticle } from './wikipedia';

export interface GatherDeps {
  get: Getter;
  /** Our published stories that name this runner: title, link and plain text. */
  ourStories: (name: string) => Promise<{ title: string; url: string; text: string }[]>;
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
export async function gatherRunner(input: { name?: string; utmbUri?: string; era?: 'current' | 'historic' }, deps: GatherDeps = liveDeps): Promise<RunnerFile | null> {
  const uri = input.utmbUri ?? (input.name ? (await findUtmb(input.name, deps.get))?.uri : undefined);
  const utmb = uri ? await utmbRunner(uri, deps.get) : null;
  const name = utmb?.name ?? input.name?.trim();
  if (!name) return null;
  const wiki = await wikipediaArticle(name, deps.get);
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
    utmb: utmb ? { id: utmb.utmbId, uri: utmb.uri, index: utmb.index, website: utmb.website } : null,
    texts,
    results: utmb?.results ?? [],
    photoCandidates: wiki?.image ? [wiki.image] : [],
  };
}
