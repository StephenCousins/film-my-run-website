// Checks the news sorter against a hand-labelled sample, without publishing anything.
//
// Run:  npx tsx --env-file=.env scripts/news-sorter-check.ts [--limit N] [--threshold X] [--fresh] [--labels <path>]
//
// Reads docs/news/sorter-labels.json (an array of { id, isNews, note?, unsure? }), loads
// those articles, runs the real sorter on each, and writes docs/news/sorter-check.md with
// a confusion table against the labels. Results are cached per article id + SORT_MODEL in
// docs/news/.sorter-cache.json, so re-running with a different --threshold costs nothing.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { articles } from '@prisma/client';
import { prisma } from '@/lib/db';
import { NEWS_CONFIG } from '@/lib/news/config';
import { extractPage } from '@/lib/news/gather';
import { SORT_MODEL } from '@/lib/news/models';
import { sortItem } from '@/lib/news/sort';
import { confidenceHistogram, confusion, type SorterRow } from '@/lib/news/sorter-check';
import type { Candidate, Verdict } from '@/lib/news/types';

interface Label { id: number; isNews: boolean; note?: string; unsure?: boolean; }
type CacheEntry = { verdict: Verdict | null; costUsd: number };
type Cache = Record<string, CacheEntry>;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

const LABELS_PATH = arg('labels') ?? 'docs/news/sorter-labels.json';
const CACHE_PATH = 'docs/news/.sorter-cache.json';
const REPORT_PATH = 'docs/news/sorter-check.md';

/** Runs `fn` over `items` with at most `limit` in flight at once. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

async function loadCache(): Promise<Cache> {
  try {
    return JSON.parse(await readFile(CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function toCandidate(a: articles, text: string | null, imageUrl: string | null, photoCredit: string | null): Candidate {
  return {
    articleId: a.id, url: a.link, source: a.source, title: a.title, pubDate: a.pub_date,
    summary: a.description ?? '', text, imageUrl: imageUrl ?? a.image_url, photoCredit,
  };
}

function fmtRow(r: SorterRow): string {
  return `| ${r.id} | ${r.source} | ${r.title.replace(/\|/g, '\\|')} | ${r.verdict?.type ?? 'null'} | ${r.verdict ? r.verdict.confidence.toFixed(2) : '—'} |`;
}

function confusionTable(c: ReturnType<typeof confusion>): string {
  return [
    `| | Predicted news | Predicted not-news |`,
    `|---|---|---|`,
    `| Labelled news | ${c.truePass} (true pass) | ${c.missed.length} (missed) |`,
    `| Labelled not-news | ${c.falsePass.length} (**false pass**) | ${c.trueReject} (true reject) |`,
  ].join('\n');
}

async function main() {
  const allLabels: Label[] = JSON.parse(await readFile(LABELS_PATH, 'utf-8'));
  const limitArg = arg('limit');
  const limit = limitArg !== undefined ? Number(limitArg) : undefined;
  const labels = limit !== undefined ? allLabels.slice(0, limit) : allLabels;
  const threshold = arg('threshold') !== undefined ? Number(arg('threshold')) : NEWS_CONFIG.newsThreshold;
  const fresh = has('fresh');

  console.log(`Loaded ${allLabels.length} labels${limit !== undefined ? `, checking first ${labels.length}` : ''}.`);

  const rows: SorterRow[] = [];
  let totalCost = 0;

  if (labels.length > 0) {
    const cache = await loadCache();
    const found = await prisma.articles.findMany({ where: { id: { in: labels.map((l) => l.id) } } });
    const byId = new Map(found.map((a) => [a.id, a]));

    const cached: { label: Label; a: articles; entry: CacheEntry }[] = [];
    const pending: { label: Label; a: articles }[] = [];
    for (const label of labels) {
      const a = byId.get(label.id);
      if (!a) { console.warn(`No article found for id ${label.id}, skipping.`); continue; }
      const hit = !fresh ? cache[`${label.id}:${SORT_MODEL}`] : undefined;
      if (hit) cached.push({ label, a, entry: hit });
      else pending.push({ label, a });
    }

    const candidates = await mapLimit(pending, 6, async ({ a }) => {
      const html = await fetchHtml(a.link);
      const page = html ? extractPage(html, a.link, a.source) : { text: null, imageUrl: null, photoCredit: null };
      return toCandidate(a, page.text, page.imageUrl, page.photoCredit);
    });
    const verdicts = await mapLimit(candidates, 6, (c) => sortItem(c));

    const newEntries: Cache = {};
    pending.forEach(({ label, a }, i) => {
      const { verdict, costUsd } = verdicts[i];
      newEntries[`${label.id}:${SORT_MODEL}`] = { verdict, costUsd };
      totalCost += costUsd;
      rows.push({ id: label.id, isNews: label.isNews, unsure: label.unsure, note: label.note, source: a.source, title: a.title, verdict, costUsd });
    });
    for (const { label, a, entry } of cached) {
      rows.push({ id: label.id, isNews: label.isNews, unsure: label.unsure, note: label.note, source: a.source, title: a.title, verdict: entry.verdict, costUsd: 0 });
    }

    if (Object.keys(newEntries).length > 0) {
      await mkdir('docs/news', { recursive: true });
      await writeFile(CACHE_PATH, JSON.stringify({ ...cache, ...newEntries }, null, 2));
    }
  }

  const unsure = rows.filter((r) => r.unsure);
  const nullTotal = rows.filter((r) => !r.verdict).length;
  const main90 = confusion(rows, threshold);
  const histogram = confidenceHistogram(rows);
  const extraThresholds = [0.85, 0.9, 0.95].filter((t) => t !== threshold);

  const lines = [
    `# News sorter check`,
    ``,
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    `Model: ${SORT_MODEL}`,
    `Threshold: ${threshold}`,
    `Items: ${rows.length} (${unsure.length} unsure, ${nullTotal} null verdicts)`,
    `Total cost: $${totalCost.toFixed(4)}`,
    ``,
    `## Confusion at threshold ${threshold}`,
    ``,
    confusionTable(main90),
    ``,
    `## False passes (auto-publish risk) — target 0`,
    ``,
    main90.falsePass.length > 0
      ? [`| id | source | title | verdict type | confidence |`, `|---|---|---|---|---|`, ...main90.falsePass.map(fmtRow)].join('\n')
      : '_None._',
    ``,
    `## Missed real news`,
    ``,
    main90.missed.length > 0
      ? [`| id | source | title | verdict type | confidence |`, `|---|---|---|---|---|`, ...main90.missed.map(fmtRow)].join('\n')
      : '_None._',
    ``,
    `## Confidence spread (news-typed verdicts, 0.1 buckets)`,
    ``,
    `| bucket | labelled news | labelled not-news | unsure |`,
    `|---|---|---|---|`,
    ...histogram.map((b) => `| ${b.bucket} | ${b.news} | ${b.notNews} | ${b.unsure} |`),
    ``,
    ...(extraThresholds.length > 0 ? [`## Confusion at other thresholds`, ``] : []),
    ...extraThresholds.flatMap((t) => [`### ${t}`, ``, confusionTable(confusion(rows, t)), ``]),
    `## Unsure (excluded from the confusion table above)`,
    ``,
    unsure.length > 0
      ? [`| id | source | title | note | verdict type | confidence |`, `|---|---|---|---|---|---|`,
          ...unsure.map((r) => `| ${r.id} | ${r.source} | ${r.title.replace(/\|/g, '\\|')} | ${r.note ?? ''} | ${r.verdict?.type ?? 'null'} | ${r.verdict ? r.verdict.confidence.toFixed(2) : '—'} |`)].join('\n')
      : '_None._',
    ``,
  ];

  await mkdir('docs/news', { recursive: true });
  await writeFile(REPORT_PATH, lines.join('\n'));

  console.log([
    `Sorter check: ${rows.length} items, threshold ${threshold}, $${totalCost.toFixed(4)} spent.`,
    `True pass ${main90.truePass}, true reject ${main90.trueReject}, missed ${main90.missed.length}, FALSE PASS ${main90.falsePass.length}.`,
    `${unsure.length} unsure excluded, ${nullTotal} null verdicts.`,
    `Report: ${REPORT_PATH}`,
  ].join('\n'));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
