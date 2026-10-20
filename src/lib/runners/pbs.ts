import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { RunnerSource } from './types';
import { httpGet, parseJson, type Getter } from './utmb';

/** One line of a Wikipedia infobox's personal bests. */
export interface PersonalBest {
  event: string; // "Marathon", "1500 m"
  section: string | null; // "Indoors", "Road" when the infobox groups them
  time: string; // "2:01:09"
  mark: string | null; // "WR", "NR", "AR", "WB" when the infobox marks it
  place: string | null; // "Berlin"
  year: number | null;
}

/** Templates with no visible text that matters here: footnotes and notes. */
const DROP_TEMPLATE = /^(efn|notetag|refn|sfn|r|citation needed|cn|nowrap\b.*)$/i;

/** Innermost templates first: {{AthAbbr|WR}} becomes "WR", footnotes go, the rest keep their last argument. */
function flattenTemplates(s: string): string {
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/\{\{([^{}]*)\}\}/g, (_, body: string) => {
      const [name, ...args] = body.split('|').map((x) => x.trim());
      const n = name.toLowerCase();
      if (n === 'ubl' || n === 'unbulleted list' || n === 'plainlist' || n === 'flatlist') return `\n${args.join('\n')}\n`;
      if (n === 'athabbr') return ` ${args[0] ?? ''} `;
      if (DROP_TEMPLATE.test(n.split(/[-\s]/)[0]) || n.startsWith('efn') || n.startsWith('notetag')) return '';
      return args[args.length - 1] ?? '';
    });
  }
  return s;
}

/** The infobox's personal_best field, up to the next infobox parameter. */
function field(wikitext: string): string | null {
  const m = wikitext.match(/(?:^|\n)\s*\|\s*personal_?bests?\s*=([\s\S]*?)(?=\n\s*\|\s*[a-z_]+\s*=|\n\}\}\s*\n)/i);
  return m ? m[1] : null;
}

const MARKS = /^(WR|WB|AR|NR|CR|ER|OR)$/;

/**
 * Personal bests from an athlete article's wikitext. Lines it can't read are left out,
 * never guessed. The first line for an event wins: a second marathon line is usually a
 * non-record exhibition (Kipchoge's Vienna 1:59:40).
 */
export function parsePersonalBests(wikitext: string): PersonalBest[] {
  const raw = field(wikitext);
  if (!raw) return [];
  // Links before templates: a link's own "|" ([[Mile run|Mile]]) must not split a template or a line.
  const text = flattenTemplates(
    raw.replace(/<ref[^>]*\/>/gi, '').replace(/<ref[\s\S]*?<\/ref>/gi, '').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1'),
  )
    .replace(/\{\{\s*(ubl|unbulleted list|plainlist|flatlist)\b/gi, '\n') // a list cut off by the field's end keeps its opener
    .replace(/&nbsp;/g, ' ')
    .replace(/'{2,}/g, '')
    .replace(/<br\s*\/?>/gi, '\n');
  const out: PersonalBest[] = [];
  const seen = new Set<string>();
  let section: string | null = null;
  for (const piece of text.split(/\n|\|/).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean)) {
    const m = piece.match(/^([^:]+?)\s*:\s*(\d[\d:.,]*)\s*(.*)$/);
    if (!m) {
      // A short label line is a heading ("Track", "Indoors"); anything else isn't ours to read.
      if (piece.length <= 20 && !/\d/.test(piece)) section = piece.replace(/:$/, '');
      continue;
    }
    const [, event, time, rest] = m;
    if (event.length > 30) continue;
    const where = rest.match(/\(([^()]*?)\s*(\d{4})\)/);
    const mark = rest.replace(/\(.*?\)/g, ' ').split(/\s+/).find((w) => MARKS.test(w)) ?? null;
    const key = `${event.toLowerCase()}|${section ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ event, section, time, mark, place: where?.[1].replace(/,$/, '').trim() || null, year: where ? Number(where[2]) : null });
  }
  return out;
}

/** "https://en.wikipedia.org/wiki/Eliud_Kipchoge" -> "Eliud_Kipchoge"; null for anything else. */
export function wikiTitle(url: string): string | null {
  const m = url.match(/^https:\/\/en\.wikipedia\.org\/wiki\/([^?#]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function personalBestsFor(title: string, get: Getter = httpGet): Promise<PersonalBest[] | null> {
  const body = await get(`https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&section=0&redirects=1&format=json&page=${encodeURIComponent(title)}`);
  const json = body ? (parseJson(body) as { parse?: { wikitext?: { '*'?: string } } } | null) : null;
  const text = json?.parse?.wikitext?.['*'];
  return typeof text === 'string' ? parsePersonalBests(text) : null;
}

interface PbDeps {
  runners: () => Promise<{ slug: string; sources: unknown }[]>;
  read: (title: string) => Promise<PersonalBest[] | null>;
  save: (slug: string, pbs: PersonalBest[]) => Promise<void>;
  deadlineMs?: number;
  clock?: () => number;
}

const liveDeps = (): PbDeps => ({
  runners: () => prisma.runners.findMany({ where: { status: 'published' }, select: { slug: true, sources: true } }),
  read: (title) => personalBestsFor(title),
  save: async (slug, pbs) => { await prisma.runners.update({ where: { slug }, data: { personal_bests: pbs as unknown as Prisma.InputJsonValue } }); },
});

/**
 * Personal bests for every runner whose page cites a Wikipedia article: that exact
 * article, never a name search (namesakes). Monthly, free (no AI). A failed read, or an
 * article whose infobox has none, keeps what was stored.
 */
export async function refreshPersonalBests(deps: PbDeps = liveDeps()): Promise<{ withPbs: number; read: number; cutShort: boolean }> {
  const clock = deps.clock ?? Date.now;
  const deadline = clock() + (deps.deadlineMs ?? 5 * 60_000);
  let withPbs = 0;
  let read = 0;
  for (const r of await deps.runners()) {
    const url = ((r.sources as RunnerSource[] | null) ?? []).find((s) => s.name === 'Wikipedia')?.url;
    const title = url ? wikiTitle(url) : null;
    if (!title) continue;
    if (clock() >= deadline) return { withPbs, read, cutShort: true };
    const pbs = await deps.read(title).catch(() => null);
    if (pbs === null) continue;
    read++;
    if (!pbs.length) continue;
    await deps.save(r.slug, pbs);
    withPbs++;
  }
  return { withPbs, read, cutShort: false };
}
