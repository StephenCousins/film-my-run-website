// Keyword search (BM25) for the site assistant, ported from zwift.run's (zwift-run-website src/lib/search.ts).
// The knowledge pack is split in two: the core (facts, YouTube figures, every race result, the films and a list of
// pages) goes whole into the cached system prompt; the rest (page text, blog, news, runner profiles) is cut into
// passages, and each question carries the best few. A full pack in every prompt cost ~$0.24 a cold question on
// Sonnet 5.5; the core alone is about a sixth of that. See docs/assistant.md.

export interface Passage {
  title: string;
  url: string;
  text: string;
}

/** Pack sections sent whole on every question. Everything else is searched. */
const CORE = /^# (Facts about|Film My Run YouTube|Stephen's race results|Stephen's films)/;

const STOP = new Set('a an and are as at be but by can do does for from has have how i if in is it its my of on or so that the this to was what when where which who why will with you your me we our they them their there about into than then too very just also any all more most some such only he his did stephen'.split(' '));

/** Lower-case words with a light stem (plurals and -ing/-ed), stop words dropped. Numbers kept. */
export function terms(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((w) => !STOP.has(w) && (w.length > 1 || /\d/.test(w)))
    .map((w) => (w.length > 4 ? w.replace(/(ies)$/, 'y').replace(/(ing|ed|es|s)$/, '') : w));
}

export interface Index { passages: Passage[]; tf: Map<string, number>[]; len: number[]; df: Map<string, number>; avg: number }

export function buildIndex(passages: Passage[]): Index {
  const df = new Map<string, number>();
  const tf = passages.map((p) => {
    const counts = new Map<string, number>();
    // The title counts twice: a post called "Great South Run" should beat one that mentions it in passing.
    for (const t of terms(`${p.title} ${p.title} ${p.text}`)) counts.set(t, (counts.get(t) ?? 0) + 1);
    for (const t of counts.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return counts;
  });
  const len = tf.map((m) => [...m.values()].reduce((a, b) => a + b, 0));
  return { passages, tf, len, df, avg: len.reduce((a, b) => a + b, 0) / Math.max(1, len.length) };
}

/** The best passages for a query, at most `perUrl` from one page so one long page can't crowd out the rest. */
export function search(index: Index, query: string, limit = 8, perUrl = 2): Passage[] {
  const q = [...new Set(terms(query))];
  if (!q.length) return [];
  const N = index.passages.length, k1 = 1.4, b = 0.75;
  const scored: [number, number][] = [];
  index.tf.forEach((tf, i) => {
    let s = 0;
    for (const t of q) {
      const f = tf.get(t);
      if (!f) continue;
      const n = index.df.get(t)!;
      s += Math.log(1 + (N - n + 0.5) / (n + 0.5)) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * index.len[i] / index.avg));
    }
    if (s > 0) scored.push([s, i]);
  });
  scored.sort((a, c) => c[0] - a[0]);
  const out: Passage[] = [], seen = new Map<string, number>();
  for (const [, i] of scored) {
    const p = index.passages[i];
    if ((seen.get(p.url) ?? 0) >= perUrl) continue;
    seen.set(p.url, (seen.get(p.url) ?? 0) + 1);
    out.push(p);
    if (out.length === limit) break;
  }
  return out;
}

/** Cut a long item into passages of about `size` characters at line or sentence ends, each keeping the title. */
function passagesOf(doc: Passage, size = 1400): Passage[] {
  if (doc.text.length <= size) return [doc];
  const parts = doc.text.match(new RegExp(`[\\s\\S]{1,${size}}(?:[.!?\\n](?=\\s)|$)|[\\s\\S]{1,${size}}`, 'g')) ?? [doc.text];
  return parts.map((t) => ({ ...doc, text: t.trim() })).filter((p) => p.text);
}

/**
 * Split pack.md into the core prompt and searchable passages. Searched sections are lists of items, each starting
 * "### Title" (pages, with a "URL: " line) or "- [Title](url)" (blog, films, news, runners). The core also gets a
 * list of every page, so the model can always link the right one.
 */
export function splitPack(md: string): { core: string; passages: Passage[] } {
  const sections = md.split(/^(?=# )/m);
  const core: string[] = [];
  const pageList: string[] = [];
  const passages: Passage[] = [];
  for (const section of sections) {
    if (!section.startsWith('# ') || CORE.test(section)) { core.push(section.trim()); continue; }
    const heading = section.slice(2, section.indexOf('\n')).trim();
    for (const item of section.split(/^(?=### |- \[)/m).slice(1)) {
      const link = item.match(/^- \[([^\]]+)\]\((\S+?)\)/);
      const page = item.match(/^### (.+)\nURL: (\S+)/);
      const title = link?.[1] ?? page?.[1];
      const url = link?.[2] ?? page?.[2];
      if (!title || !url) continue;
      if (page) pageList.push(`- [${title}](${url})`);
      passages.push(...passagesOf({ title: `${heading}: ${title}`, url, text: item.trim() }));
    }
  }
  if (pageList.length) core.push(`# Pages on filmmyrun.com (titles only; the search results carry their text)\n${pageList.join('\n')}`);
  return { core: core.filter(Boolean).join('\n\n'), passages };
}
