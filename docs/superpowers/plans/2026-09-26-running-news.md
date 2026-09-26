# Running News Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A daily script that turns the 9 running feeds into at most 4 original, fact-checked stories in Stephen's voice and publishes them to filmmyrun.com/news automatically.

**Architecture:** `npm run news:daily` (tsx) in this repo, run by GitHub Actions at 06:00 UK. It reuses `rss-fetcher.ts` (feeds into `articles`), the OpenRouter helper (`llm.ts`), R2 (`r2.ts`), sharp and cheerio. Pure pieces (gates, grouping keys, rank, cap, budget, credit stamp) live in small files under `src/lib/news/` with vitest tests; model calls go through one JSON helper with the cost returned. The page reads `news_stories` only.

**Tech Stack:** Next.js 15, Prisma (Postgres on Railway), OpenRouter via the `openai` SDK, Gemini Flash (sorting and grouping), Opus 5.5 (writing and checking), sharp, cheerio, Resend, vitest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-26-running-news-design.md`

## Global Constraints

- Items: published in the last 14 days. Stories: at most 4 a run. Ceiling: £10 a calendar month.
- Sorter: `google/gemini-3.7-flash`; pass only `type = news` with `confidence >= 0.90`.
- Writer and checker: `anthropic/claude-opus-5.5`.
- Voice: Stephen's style, third person, a reporter in the newsroom; short sentences (mean about 16 words), British spelling, dry, specific numbers, no em dashes, no semicolons, no "journey", "dive in", "game-changer", "It's not just X, it's Y".
- Scope: all running; importance leans hard to trail and ultra; British athletes and UK races boosted.
- A story is 3-6 paragraphs; the only outbound links are the "Sources" credit.
- Images: the source's photo, 1200x675 WebP on R2, credit stamped bottom right; else a branded card. Never hotlinked.
- Every published story passes all gates; a failure is held with its reason, never published half-right.
- Never commit secrets; keys come from environment variables only.
- Before every commit: `npm test` and `npm run typecheck`. A push to `main` deploys.

## Review Focus

1. **A feed item whose page can't be fetched (paywall, 403, timeout)**: it is still sortable from its RSS summary, but must not be written from the summary alone; the bundle needs at least one full text or it is held ("no full text"). Tested in Task 6.
2. **The same event on consecutive days** (preview Monday, result Tuesday): Tuesday's result is a new story, a second preview is not. Tested in Task 5 (grouping prompt contract and the `alreadyCovered` handling).
3. **A model reply that is not valid JSON or misses fields**: that item or story is skipped and logged, the run carries on. Tested in Task 2.
4. **A month that hits the ceiling mid-run**: stories already written stay; the rest are not started. Tested in Task 7.
5. **A title that slugifies to an existing slug** (two "UTMB" stories a week apart): gets `-2`, never overwrites. Tested in Task 7.

---

### Task 1: Database: story columns, processed items, runs

**Files:**
- Modify: `prisma/schema.prisma` (model `news_stories`; add `news_items`, `news_runs`)
- Create: `prisma/migrations/20260926090000_news_pipeline/migration.sql`
- Modify: `docs/superpowers/specs/2026-09-26-running-news-design.md` (Data: mention `news_runs`)

**Interfaces:**
- Produces: Prisma models `news_stories` (new fields `topic String?`, `is_uk Boolean @default(false)`, `importance Int?`, `sources Json?`, `photo_credit String?`, `held_reason String?`; `source_heading String?`, `roundup_date DateTime?`), `news_items`, `news_runs`.

- [ ] **Step 1: Edit the schema**

In `model news_stories`, change `source_heading String` to `source_heading String?` and `roundup_date DateTime` to `roundup_date DateTime?`, and add before `status`:

```prisma
  topic          String?   // trail_ultra | road | track
  is_uk          Boolean   @default(false)
  importance     Int?
  sources        Json?     // [{ site, url }]
  photo_credit   String?
  held_reason    String?
```

Add after `news_stories`:

```prisma
/// Every feed item the news pipeline has looked at, so nothing is sorted twice
/// and a run's log can explain each decision.
model news_items {
  id          Int      @id @default(autoincrement())
  article_id  Int      @unique
  url         String
  source      String
  verdict     Json?    // { type, confidence, isRunning, topic, isUk, importance }
  bundle_key  String?
  story_id    Int?
  created_at  DateTime @default(now())

  @@index([bundle_key])
}

/// One row per pipeline run: what it did and what it cost.
model news_runs {
  id         Int      @id @default(autoincrement())
  started_at DateTime @default(now())
  dry_run    Boolean
  cost_usd   Float    @default(0)
  summary    Json
}
```

- [ ] **Step 2: Write the migration SQL by hand**

`prisma/migrations/20260926090000_news_pipeline/migration.sql`:

```sql
ALTER TABLE "news_stories" ALTER COLUMN "source_heading" DROP NOT NULL;
ALTER TABLE "news_stories" ALTER COLUMN "roundup_date" DROP NOT NULL;
ALTER TABLE "news_stories" ADD COLUMN "topic" TEXT;
ALTER TABLE "news_stories" ADD COLUMN "is_uk" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "news_stories" ADD COLUMN "importance" INTEGER;
ALTER TABLE "news_stories" ADD COLUMN "sources" JSONB;
ALTER TABLE "news_stories" ADD COLUMN "photo_credit" TEXT;
ALTER TABLE "news_stories" ADD COLUMN "held_reason" TEXT;

CREATE TABLE "news_items" (
  "id" SERIAL PRIMARY KEY,
  "article_id" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "verdict" JSONB,
  "bundle_key" TEXT,
  "story_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "news_items_article_id_key" ON "news_items"("article_id");
CREATE INDEX "news_items_bundle_key_idx" ON "news_items"("bundle_key");

CREATE TABLE "news_runs" (
  "id" SERIAL PRIMARY KEY,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dry_run" BOOLEAN NOT NULL,
  "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "summary" JSONB NOT NULL
);
```

- [ ] **Step 3: Regenerate the client and typecheck**

Run: `npx prisma generate && npm run typecheck`
Expected: no errors. (Existing code that reads `story.roundup_date.toISOString()` in `src/app/news/[slug]/page.tsx` may now fail typecheck; change it to `(story.published_at ?? story.created_at).toISOString()` and keep the field name `roundupDate` until Task 10 rewrites that page.)

- [ ] **Step 4: Apply to production** (additive and nullable; no data changes)

Run: `DATABASE_URL="$(railway variables --kv | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)" npx prisma migrate deploy`
Expected: "1 migration applied". If the permission check blocks it, give Stephen this exact command to run with the `!` prefix.

- [ ] **Step 5: Add `news_runs` to the spec's Data section, then commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260926090000_news_pipeline docs/superpowers/specs/2026-09-26-running-news-design.md src/app/news/\[slug\]/page.tsx
git commit -m "News pipeline: story columns, processed items, runs"
```

---

### Task 2: One JSON model call that reports its cost

**Files:**
- Modify: `src/lib/llm.ts` (add `completeJson`)
- Create: `src/lib/news/models.ts`
- Test: `src/lib/news/models.test.ts`

**Interfaces:**
- Produces: `completeJson<T>(opts: { model: string; prompt: string; system?: string; maxTokens: number; temperature?: number; schemaName: string; schema: object }): Promise<{ data: T | null; costUsd: number; raw: string }>`; `SORT_MODEL`, `GROUP_MODEL`, `WRITE_MODEL`, `CHECK_MODEL` constants; `parseJson<T>(raw: string): T | null`.

- [ ] **Step 1: Write the failing test** (`src/lib/news/models.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { parseJson } from '@/lib/llm';

describe('parseJson', () => {
  it('reads plain JSON, fenced JSON, and gives null for rubbish', () => {
    expect(parseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
    expect(parseJson<{ a: number }>('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(parseJson('not json')).toBeNull();
    expect(parseJson('{"a":')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it: FAIL** (`npx vitest run src/lib/news/models.test.ts`, "parseJson is not exported")

- [ ] **Step 3: Implement**

Append to `src/lib/llm.ts`:

```ts
/** JSON from a model reply: plain or in a ```json fence; null when it isn't JSON. */
export function parseJson<T>(raw: string): T | null {
  const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(unfenced) as T;
  } catch {
    return null;
  }
}

/**
 * A structured reply and what it cost. OpenRouter reports the cost of each
 * call when asked (`usage: { include: true }`), so the news pipeline can keep
 * to its monthly ceiling on real figures, not estimates.
 */
export async function completeJson<T>({
  model,
  prompt,
  system,
  maxTokens,
  temperature = 0,
  schemaName,
  schema,
}: {
  model: string;
  prompt: string;
  system?: string;
  maxTokens: number;
  temperature?: number;
  schemaName: string;
  schema: object;
}): Promise<{ data: T | null; costUsd: number; raw: string }> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      { role: 'user' as const, content: prompt },
    ],
    response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema: schema as Record<string, unknown> } },
    // OpenRouter-only field: include the call's cost in `usage.cost`.
    ...({ usage: { include: true } } as Record<string, unknown>),
  });
  const raw = completion.choices[0]?.message?.content?.trim() ?? '';
  const costUsd = Number((completion.usage as { cost?: number } | undefined)?.cost ?? 0);
  return { data: parseJson<T>(raw), costUsd, raw };
}
```

Create `src/lib/news/models.ts`:

```ts
/** Models for the news pipeline (spec 2026-09-26). Sorting and grouping are cheap; writing and checking are the product. */
export const SORT_MODEL = 'google/gemini-3.7-flash';
export const GROUP_MODEL = 'google/gemini-3.7-flash';
export const WRITE_MODEL = 'anthropic/claude-opus-5.5';
export const CHECK_MODEL = 'anthropic/claude-opus-5.5';
```

- [ ] **Step 4: Run it: PASS**, then `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/llm.ts src/lib/news/models.ts src/lib/news/models.test.ts
git commit -m "News pipeline: JSON model calls with their cost"
```

---

### Task 3: Settings and shared types

**Files:**
- Create: `src/lib/news/types.ts`
- Create: `src/lib/news/config.ts`

**Interfaces:**
- Produces:

```ts
// types.ts
export type ItemType = 'news' | 'preview' | 'personal_race_report' | 'review' | 'training' | 'opinion' | 'media' | 'sponsored' | 'other';
export type Topic = 'trail_ultra' | 'road' | 'track';
export interface Candidate {
  articleId: number; url: string; source: string; title: string; pubDate: Date;
  summary: string; text: string | null; imageUrl: string | null; photoCredit: string | null;
}
export interface Verdict { type: ItemType; confidence: number; isRunning: boolean; topic: Topic; isUk: boolean; importance: number }
export interface Bundle { key: string; headline: string; items: Candidate[]; verdicts: Verdict[]; alreadyCovered: boolean }
export interface Draft { title: string; excerpt: string; paragraphs: string[] }
export interface SourceRef { site: string; url: string }
export interface StoryToPublish extends Draft {
  slug: string; topic: Topic; isUk: boolean; importance: number; sources: SourceRef[];
  imageUrl: string | null; photoCredit: string | null; bundleKey: string; articleIds: number[];
}
export interface RunLog {
  dryRun: boolean; itemsSeen: number;
  sortedOut: { url: string; type: ItemType; confidence: number }[];
  borderline: { url: string; confidence: number }[]; // news at 0.50-0.90
  held: { headline: string; reason: string }[];
  published: { slug: string; title: string }[];
  costUsd: number; stoppedByCeiling: boolean;
}
```

```ts
// config.ts
export const NEWS_CONFIG = {
  windowDays: 14,
  maxStoriesPerRun: 4,
  newsThreshold: 0.9,
  borderlineFrom: 0.5,
  monthlyCeilingGbp: 10,
  usdPerGbp: 1.27, // for the ceiling only; update if the rate moves a lot
  imageWidth: 1200,
  imageHeight: 675,
  minSourceImageWidth: 800,
  nearCopyWords: 10,
} as const;
```

- [ ] **Step 1: Create both files exactly as above.** (`personal_race_report` is a runner's own account of a race; race *results* are `news`.)
- [ ] **Step 2: `npm run typecheck`**: no errors.
- [ ] **Step 3: Commit** `git add src/lib/news/types.ts src/lib/news/config.ts && git commit -m "News pipeline: settings and types"`

---

### Task 4: Gather: new items with full text, photo and credit

**Files:**
- Create: `src/lib/news/gather.ts`
- Test: `src/lib/news/gather.test.ts`, fixture `src/lib/news/fixtures/irunfar-article.html` (save a real iRunFar article page with `curl -s <url> > ...`)

**Interfaces:**
- Consumes: `fetchAndStoreArticles()` and `prisma.articles` (existing), `Candidate`, `NEWS_CONFIG`.
- Produces: `extractPage(html: string, pageUrl: string, site: string): { text: string | null; imageUrl: string | null; photoCredit: string | null }` (pure); `gatherCandidates(now: Date): Promise<Candidate[]>`.

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractPage } from './gather';

const html = readFileSync(new URL('./fixtures/irunfar-article.html', import.meta.url), 'utf8');

describe('extractPage', () => {
  it('pulls the article text, the main photo and its credit', () => {
    const p = extractPage(html, 'https://www.irunfar.com/some-article', 'iRunFar');
    expect(p.text && p.text.length).toBeGreaterThan(500);
    expect(p.text).not.toMatch(/Subscribe|Cookie/i);
    expect(p.imageUrl).toMatch(/^https:\/\//);
    expect(p.photoCredit === null || p.photoCredit.length < 80).toBe(true);
  });

  it('a page with no article body gives null text, not the menu', () => {
    const p = extractPage('<html><body><nav>Home Races</nav></body></html>', 'https://x.test/a', 'X');
    expect(p.text).toBeNull();
  });
});
```

- [ ] **Step 2: Run: FAIL** (module missing).

- [ ] **Step 3: Implement `src/lib/news/gather.ts`**

```ts
import * as cheerio from 'cheerio';
import { prisma } from '@/lib/db';
import { fetchAndStoreArticles } from '@/lib/rss-fetcher';
import { NEWS_CONFIG } from './config';
import type { Candidate } from './types';

/** The article's words, main photo and photo credit from its page. */
export function extractPage(html: string, pageUrl: string, site: string) {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, aside, form, .comments, .related, .newsletter, .share, .sidebar').remove();
  const body = $('article').first().length ? $('article').first() : $('main').first();
  const paragraphs = body.find('p').map((_, p) => $(p).text().trim()).get().filter((t) => t.length > 40);
  const text = paragraphs.length >= 3 ? paragraphs.join('\n\n') : null;

  const og = $('meta[property="og:image"]').attr('content') ?? null;
  const first = body.find('img').first().attr('src') ?? null;
  const rawImage = og ?? first;
  const imageUrl = rawImage ? new URL(rawImage, pageUrl).toString() : null;

  // Credits live in a figure caption or a "Photo:" line; keep it short and plain.
  const caption = body.find('figcaption').first().text().trim();
  const match = (caption || body.text()).match(/(?:photo|image)(?:\s*credit)?\s*[:©]\s*([^|.\n]{3,60})/i);
  const photoCredit = match ? match[1].trim() : null;
  void site;
  return { text, imageUrl, photoCredit };
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'FilmMyRun-News/1.0 (+https://filmmyrun.com)' }, signal: AbortSignal.timeout(15000) });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** Refresh the feeds, then every item of the last 14 days not yet looked at, with its page read. */
export async function gatherCandidates(now: Date): Promise<Candidate[]> {
  await fetchAndStoreArticles();
  const since = new Date(now.getTime() - NEWS_CONFIG.windowDays * 86_400_000);
  const seen = new Set((await prisma.news_items.findMany({ select: { article_id: true } })).map((r) => r.article_id));
  const articles = await prisma.articles.findMany({ where: { pub_date: { gte: since } }, orderBy: { pub_date: 'desc' } });
  const out: Candidate[] = [];
  for (const a of articles.filter((a) => !seen.has(a.id))) {
    const html = await fetchHtml(a.link);
    const page = html ? extractPage(html, a.link, a.source) : { text: null, imageUrl: null, photoCredit: null };
    out.push({
      articleId: a.id, url: a.link, source: a.source, title: a.title, pubDate: a.pub_date,
      summary: a.description ?? '', text: page.text, imageUrl: page.imageUrl ?? a.image_url, photoCredit: page.photoCredit,
    });
  }
  return out;
}
```

- [ ] **Step 4: Run: PASS.** If the fixture's structure defeats the `article`/`main` pick, adjust the selectors (not the test) until it passes, and add the reason as a comment.
- [ ] **Step 5: Commit** `git add src/lib/news/gather.ts src/lib/news/gather.test.ts src/lib/news/fixtures && git commit -m "News pipeline: gather items with full text and photo"`

---

### Task 5: Sort and group

**Files:**
- Create: `src/lib/news/sort.ts`, `src/lib/news/group.ts`
- Test: `src/lib/news/sort.test.ts`, `src/lib/news/group.test.ts`

**Interfaces:**
- Consumes: `completeJson`, `SORT_MODEL`, `GROUP_MODEL`, `NEWS_CONFIG`, types.
- Produces: `passesSort(v: Verdict | null): boolean`; `isBorderline(v: Verdict | null): boolean`; `sortItem(c: Candidate, call?: typeof completeJson): Promise<{ verdict: Verdict | null; costUsd: number }>`; `groupItems(items: { c: Candidate; v: Verdict }[], recentHeadlines: string[], call?): Promise<{ bundles: Bundle[]; costUsd: number }>`; `bundleImportance(b: Bundle): number`.

- [ ] **Step 1: Write the failing tests**

`sort.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { passesSort, isBorderline, sortItem } from './sort';
import type { Candidate, Verdict } from './types';

const v = (over: Partial<Verdict>): Verdict => ({ type: 'news', confidence: 0.95, isRunning: true, topic: 'trail_ultra', isUk: false, importance: 7, ...over });
const c: Candidate = { articleId: 1, url: 'https://x.test/a', source: 'iRunFar', title: 'T', pubDate: new Date(), summary: 's', text: 'full', imageUrl: null, photoCredit: null };

describe('sorting', () => {
  it('passes only running news at 0.90 or more', () => {
    expect(passesSort(v({}))).toBe(true);
    expect(passesSort(v({ confidence: 0.89 }))).toBe(false);
    expect(passesSort(v({ type: 'review' }))).toBe(false);
    expect(passesSort(v({ isRunning: false }))).toBe(false);
    expect(passesSort(null)).toBe(false);
  });
  it('marks news at 0.50-0.90 as borderline for the log', () => {
    expect(isBorderline(v({ confidence: 0.7 }))).toBe(true);
    expect(isBorderline(v({ confidence: 0.95 }))).toBe(false);
    expect(isBorderline(v({ type: 'opinion', confidence: 0.7 }))).toBe(false);
  });
  it('a reply that is not a verdict gives null, not a throw', async () => {
    const call = async () => ({ data: null, costUsd: 0.001, raw: 'nope' });
    const r = await sortItem(c, call as never);
    expect(r.verdict).toBeNull();
    expect(r.costUsd).toBe(0.001);
  });
});
```

`group.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bundleImportance, groupItems } from './group';
import type { Candidate, Verdict } from './types';

const cand = (id: number): Candidate => ({ articleId: id, url: `https://x.test/${id}`, source: 'S', title: `T${id}`, pubDate: new Date(), summary: '', text: 't', imageUrl: null, photoCredit: null });
const v = (importance: number, isUk = false): Verdict => ({ type: 'news', confidence: 0.95, isRunning: true, topic: 'trail_ultra', isUk, importance });

describe('grouping', () => {
  it('builds bundles from the model's groups and drops unknown ids', async () => {
    const call = async () => ({ costUsd: 0.002, raw: '', data: { groups: [
      { key: 'utmb-2026-result', headline: 'UTMB result', articleIds: [1, 2, 99], alreadyCovered: false },
      { key: 'london-preview', headline: 'London preview', articleIds: [3], alreadyCovered: true },
    ] } });
    const r = await groupItems([{ c: cand(1), v: v(9) }, { c: cand(2), v: v(8) }, { c: cand(3), v: v(5) }], ['London Marathon preview'], call as never);
    expect(r.bundles).toHaveLength(2);
    expect(r.bundles[0].items.map((i) => i.articleId)).toEqual([1, 2]);
    expect(r.bundles[1].alreadyCovered).toBe(true);
  });
  it('a bundle is as important as its most important item, plus 1 for UK', () => {
    expect(bundleImportance({ key: 'k', headline: 'h', items: [], verdicts: [v(6), v(8)], alreadyCovered: false })).toBe(8);
    expect(bundleImportance({ key: 'k', headline: 'h', items: [], verdicts: [v(6, true)], alreadyCovered: false })).toBe(7);
  });
});
```

- [ ] **Step 2: Run: FAIL** (modules missing).

- [ ] **Step 3: Implement**

`sort.ts`:

```ts
import { completeJson } from '@/lib/llm';
import { NEWS_CONFIG } from './config';
import { SORT_MODEL } from './models';
import type { Candidate, Verdict } from './types';

export function passesSort(v: Verdict | null): boolean {
  return !!v && v.type === 'news' && v.isRunning && v.confidence >= NEWS_CONFIG.newsThreshold;
}

export function isBorderline(v: Verdict | null): boolean {
  return !!v && v.type === 'news' && v.isRunning && v.confidence >= NEWS_CONFIG.borderlineFrom && v.confidence < NEWS_CONFIG.newsThreshold;
}

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['type', 'confidence', 'isRunning', 'topic', 'isUk', 'importance'],
  properties: {
    type: { type: 'string', enum: ['news', 'preview', 'personal_race_report', 'review', 'training', 'opinion', 'media', 'sponsored', 'other'] },
    confidence: { type: 'number' }, isRunning: { type: 'boolean' },
    topic: { type: 'string', enum: ['trail_ultra', 'road', 'track'] }, isUk: { type: 'boolean' },
    importance: { type: 'integer' },
  },
};

export async function sortItem(c: Candidate, call: typeof completeJson = completeJson) {
  const prompt = `Classify this running article for a news desk. It must be NEWS to publish: something that has happened (race results, records, wins, DNFs, selections, announcements, course or rule changes, injuries, retirements, doping cases). NOT news: race previews or "who to watch", a runner's own race report, gear or shoe reviews, training advice, opinion or columns, podcasts or videos, sponsored posts.

Give "confidence" as the probability (0-1) that your "type" is right.
"importance" 1-10 for a trail and ultra running site: trail and ultra first (a UTMB or Western States win is 9-10), big road and track moments next (a marathon or track world record is 7-8), everyday results lower. Add 1 when British athletes or UK races are central, capped at 10.
"isUk": British athletes or UK races are central.

Source: ${c.source}
Title: ${c.title}
Published: ${c.pubDate.toISOString().slice(0, 10)}
Summary: ${c.summary.slice(0, 1200)}
Opening: ${(c.text ?? '').slice(0, 1500)}`;
  const r = await call<Verdict>({ model: SORT_MODEL, prompt, maxTokens: 300, schemaName: 'verdict', schema: SCHEMA });
  const d = r.data;
  const valid = d && typeof d.confidence === 'number' && typeof d.importance === 'number';
  return { verdict: valid ? { ...d, importance: Math.max(1, Math.min(10, Math.round(d.importance))) } : null, costUsd: r.costUsd };
}
```

`group.ts`:

```ts
import { completeJson } from '@/lib/llm';
import { GROUP_MODEL } from './models';
import type { Bundle, Candidate, Verdict } from './types';

export function bundleImportance(b: Bundle): number {
  const top = Math.max(0, ...b.verdicts.map((v) => v.importance));
  const uk = b.verdicts.some((v) => v.isUk) ? 1 : 0;
  return Math.min(10, top + uk);
}

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['groups'],
  properties: { groups: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['key', 'headline', 'articleIds', 'alreadyCovered'],
    properties: { key: { type: 'string' }, headline: { type: 'string' }, articleIds: { type: 'array', items: { type: 'integer' } }, alreadyCovered: { type: 'boolean' } },
  } } },
};

export async function groupItems(items: { c: Candidate; v: Verdict }[], recentHeadlines: string[], call: typeof completeJson = completeJson) {
  if (items.length === 0) return { bundles: [], costUsd: 0 };
  const list = items.map(({ c }) => `${c.articleId} | ${c.source} | ${c.pubDate.toISOString().slice(0, 10)} | ${c.title}`).join('\n');
  const prompt = `Group these running news items by the single event they report (the same race result, record or announcement). One group per event; an item in exactly one group.
"key": a short stable slug for the event, e.g. "utmb-2026-womens-result".
"alreadyCovered": true only when one of the stories we have already published (below) reports this same development. A result after we published a preview is NOT already covered.

Items (id | source | date | title):
${list}

Already published in the last 14 days:
${recentHeadlines.map((h) => `- ${h}`).join('\n') || '- none'}`;
  const r = await call<{ groups: { key: string; headline: string; articleIds: number[]; alreadyCovered: boolean }[] }>({ model: GROUP_MODEL, prompt, maxTokens: 4000, schemaName: 'groups', schema: SCHEMA });
  const byId = new Map(items.map((i) => [i.c.articleId, i]));
  const bundles: Bundle[] = (r.data?.groups ?? []).flatMap((g) => {
    const members = g.articleIds.map((id) => byId.get(id)).filter((m): m is { c: Candidate; v: Verdict } => !!m);
    return members.length ? [{ key: g.key, headline: g.headline, items: members.map((m) => m.c), verdicts: members.map((m) => m.v), alreadyCovered: g.alreadyCovered }] : [];
  });
  return { bundles, costUsd: r.costUsd };
}
```

- [ ] **Step 4: Run both: PASS**; `npm run typecheck`.
- [ ] **Step 5: Commit** `git add src/lib/news/sort.ts src/lib/news/group.ts src/lib/news/sort.test.ts src/lib/news/group.test.ts && git commit -m "News pipeline: sort and group"`

---

### Task 6: Write, check and the code-rule gate

**Files:**
- Create: `src/lib/news/write.ts`, `src/lib/news/rules.ts`
- Test: `src/lib/news/rules.test.ts`, `src/lib/news/write.test.ts`

**Interfaces:**
- Consumes: `completeJson`, `WRITE_MODEL`, `CHECK_MODEL`, `NEWS_CONFIG`, types.
- Produces: `ruleProblems(d: Draft, sourceTexts: string[]): string[]` (empty = pass); `writeStory(b: Bundle, now: Date, call?): Promise<{ draft: Draft | null; refusal: string | null; costUsd: number }>`; `checkFacts(d: Draft, b: Bundle, call?): Promise<{ ok: boolean; unsupported: string[]; costUsd: number }>`.

- [ ] **Step 1: Write the failing tests**

`rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ruleProblems } from './rules';

const good = { title: 'Evans wins UTMB', excerpt: 'Tom Evans took the title in 19:37.', paragraphs: ['a b c', 'd e f', 'g h i'] };

describe('code-rule gate', () => {
  it('passes a clean draft', () => expect(ruleProblems(good, ['unrelated source words'])).toEqual([]));
  it('needs a title, an excerpt and 3-6 paragraphs', () => {
    expect(ruleProblems({ ...good, title: '' }, [])).toContain('no title');
    expect(ruleProblems({ ...good, paragraphs: ['one', 'two'] }, [])).toContain('2 paragraphs (3-6)');
    expect(ruleProblems({ ...good, paragraphs: Array(7).fill('x') }, [])).toContain('7 paragraphs (3-6)');
  });
  it('no em dashes or semicolons', () => {
    expect(ruleProblems({ ...good, paragraphs: ['He won — easily.', 'b', 'c'] }, [])).toContain('em dash');
    expect(ruleProblems({ ...good, paragraphs: ['He won; easily.', 'b', 'c'] }, [])).toContain('semicolon');
  });
  it('fails a near-copy: ten words in a row lifted from a source', () => {
    const lifted = 'the leaders reached the col de balme just after dawn with fresh legs';
    const draft = { ...good, paragraphs: [`Early on, ${lifted}.`, 'b', 'c'] };
    expect(ruleProblems(draft, [`Report: ${lifted} and pushed on.`])).toContain('near-copy of a source');
  });
});
```

`write.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkFacts, writeStory } from './write';
import type { Bundle } from './types';

const bundle: Bundle = { key: 'k', headline: 'h', alreadyCovered: false, verdicts: [],
  items: [{ articleId: 1, url: 'https://x.test/1', source: 'iRunFar', title: 'T', pubDate: new Date(), summary: 's', text: null, imageUrl: null, photoCredit: null }] };

describe('writing', () => {
  it('a bundle with no full text is refused before any model call', async () => {
    let called = false;
    const r = await writeStory(bundle, new Date(), (async () => { called = true; return { data: null, costUsd: 0, raw: '' }; }) as never);
    expect(called).toBe(false);
    expect(r.refusal).toBe('no full text');
  });
  it('the checker's unsupported list fails the story', async () => {
    const call = async () => ({ costUsd: 0.02, raw: '', data: { unsupported: ['19:37 finish time'] } });
    const r = await checkFacts({ title: 't', excerpt: 'e', paragraphs: ['a', 'b', 'c'] }, { ...bundle, items: [{ ...bundle.items[0], text: 'full' }] }, call as never);
    expect(r.ok).toBe(false);
    expect(r.unsupported).toEqual(['19:37 finish time']);
  });
});
```

- [ ] **Step 2: Run: FAIL.**

- [ ] **Step 3: Implement**

`rules.ts`:

```ts
import { NEWS_CONFIG } from './config';
import type { Draft } from './types';

const words = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, ' ').match(/[a-z0-9']+/g) ?? [];

function shingles(text: string, n: number): Set<string> {
  const w = words(text);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
}

/** Everything code can check before a story goes live. Empty means it passes. */
export function ruleProblems(d: Draft, sourceTexts: string[]): string[] {
  const problems: string[] = [];
  if (!d.title.trim()) problems.push('no title');
  if (!d.excerpt.trim()) problems.push('no excerpt');
  if (d.paragraphs.length < 3 || d.paragraphs.length > 6) problems.push(`${d.paragraphs.length} paragraphs (3-6)`);
  const all = [d.title, d.excerpt, ...d.paragraphs].join('\n');
  if (/—/.test(all)) problems.push('em dash');
  if (/;/.test(all)) problems.push('semicolon');
  const mine = shingles(all, NEWS_CONFIG.nearCopyWords);
  if (sourceTexts.some((t) => [...shingles(t, NEWS_CONFIG.nearCopyWords)].some((s) => mine.has(s)))) problems.push('near-copy of a source');
  return problems;
}
```

`write.ts`:

```ts
import { completeJson } from '@/lib/llm';
import { CHECK_MODEL, WRITE_MODEL } from './models';
import type { Bundle, Draft } from './types';

const VOICE = `You are a reporter on the Film My Run news desk (filmmyrun.com), a British trail and ultra running site. Write in Stephen Cousins's style, third person, from the newsroom (never "I", never as if you were there):
- Short declarative sentences, about 16 words on average; the occasional longer one carries the detail.
- British English and British mild vocabulary. Dry, understated, never hyped.
- Specific numbers: finish times to the second where given, distances, climb in metres, positions, dates.
- Name people with their times and results. At least one concrete detail about the place or the course.
- No em dashes. No semicolons. None of: "journey", "dive in", "game-changer", "unpack", "leverage", "It's not just X, it's Y", stacked lists of three adjectives.
- Original wording throughout: report the facts in your own sentences, never a sentence lifted or lightly reworded from a source.`;

const DRAFT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['isNews', 'reason', 'title', 'excerpt', 'paragraphs'],
  properties: {
    isNews: { type: 'boolean' }, reason: { type: 'string' },
    title: { type: 'string' }, excerpt: { type: 'string' },
    paragraphs: { type: 'array', items: { type: 'string' } },
  },
};

function sourcesBlock(b: Bundle): string {
  return b.items.filter((i) => i.text).map((i, n) => `SOURCE ${n + 1} (${i.source}, ${i.pubDate.toISOString().slice(0, 10)}, ${i.url}):\n${i.text!.slice(0, 12000)}`).join('\n\n');
}

export async function writeStory(b: Bundle, now: Date, call: typeof completeJson = completeJson) {
  if (!b.items.some((i) => i.text)) return { draft: null, refusal: 'no full text', costUsd: 0 };
  const prompt = `${VOICE}

Today is ${now.toISOString().slice(0, 10)}. First decide: is this genuinely running NEWS from the last 14 days (something that happened, not a preview, review, training piece or opinion)? If not, set isNews false, give the reason, and leave the other fields empty.

If it is: write one story combining every source below.
- title: specific, not clickbait, no colon-subtitle.
- excerpt: one sentence, at most 160 characters.
- paragraphs: 3 to 6 plain-text paragraphs. Lead with what happened. Only facts that appear in the sources.

${sourcesBlock(b)}`;
  const r = await call<{ isNews: boolean; reason: string; title: string; excerpt: string; paragraphs: string[] }>({ model: WRITE_MODEL, prompt, maxTokens: 3000, temperature: 0.6, schemaName: 'story', schema: DRAFT_SCHEMA });
  if (!r.data) return { draft: null, refusal: 'unreadable reply', costUsd: r.costUsd };
  if (!r.data.isNews) return { draft: null, refusal: `not news: ${r.data.reason}`, costUsd: r.costUsd };
  const { title, excerpt, paragraphs } = r.data;
  return { draft: { title, excerpt, paragraphs } as Draft, refusal: null, costUsd: r.costUsd };
}

const CHECK_SCHEMA = { type: 'object', additionalProperties: false, required: ['unsupported'], properties: { unsupported: { type: 'array', items: { type: 'string' } } } };

export async function checkFacts(d: Draft, b: Bundle, call: typeof completeJson = completeJson) {
  const prompt = `Fact-check this news story against its sources. List every name, time, placing, record, distance, date or number in the STORY that does not appear in (or follow directly from) the SOURCES. Return an empty list when everything is supported. Be strict: a wrong second or a misspelt name counts.

STORY:
${d.title}
${d.excerpt}
${d.paragraphs.join('\n\n')}

${sourcesBlock(b)}`;
  const r = await call<{ unsupported: string[] }>({ model: CHECK_MODEL, prompt, maxTokens: 1500, schemaName: 'check', schema: CHECK_SCHEMA });
  const unsupported = r.data?.unsupported ?? ['checker reply unreadable'];
  return { ok: unsupported.length === 0, unsupported, costUsd: r.costUsd };
}
```

- [ ] **Step 4: Run both: PASS**; typecheck.
- [ ] **Step 5: Commit** `git add src/lib/news/write.ts src/lib/news/rules.ts src/lib/news/write.test.ts src/lib/news/rules.test.ts && git commit -m "News pipeline: write, fact-check, code-rule gate"`

---

### Task 7: Rank, cap, budget, slug

**Files:**
- Create: `src/lib/news/plan.ts`
- Test: `src/lib/news/plan.test.ts`

**Interfaces:**
- Consumes: `bundleImportance`, `NEWS_CONFIG`, `Bundle`.
- Produces: `pickBundles(bundles: Bundle[], cap: number): Bundle[]`; `withinCeiling(monthSpentUsd: number, nextEstimateUsd: number): boolean`; `uniqueSlug(title: string, taken: Set<string>): string`; `STORY_ESTIMATE_USD = 0.12`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { pickBundles, uniqueSlug, withinCeiling } from './plan';
import type { Bundle, Verdict } from './types';

const v = (i: number): Verdict => ({ type: 'news', confidence: 0.95, isRunning: true, topic: 'trail_ultra', isUk: false, importance: i });
const b = (key: string, i: number, alreadyCovered = false): Bundle => ({ key, headline: key, items: [], verdicts: [v(i)], alreadyCovered });

describe('choosing what to write', () => {
  it('drops already-covered events, ranks by importance, caps at 4', () => {
    const picked = pickBundles([b('a', 3), b('b', 9), b('c', 7, true), b('d', 8), b('e', 5), b('f', 6)], 4);
    expect(picked.map((x) => x.key)).toEqual(['b', 'd', 'f', 'e']);
  });
  it('stops before the month passes £10', () => {
    expect(withinCeiling(12.0, 0.12)).toBe(true);    // $12.12 < £10 x 1.27 = $12.70
    expect(withinCeiling(12.65, 0.12)).toBe(false);
  });
  it('never reuses a slug', () => {
    const taken = new Set(['evans-wins-utmb']);
    expect(uniqueSlug('Evans wins UTMB!', taken)).toBe('evans-wins-utmb-2');
    expect(uniqueSlug('Évans — wins, UTMB', new Set())).toBe('evans-wins-utmb');
  });
});
```

- [ ] **Step 2: Run: FAIL.**

- [ ] **Step 3: Implement `plan.ts`**

```ts
import { NEWS_CONFIG } from './config';
import { bundleImportance } from './group';
import type { Bundle } from './types';

/** A generous per-story estimate (writer + checker), used only to stop before the ceiling. */
export const STORY_ESTIMATE_USD = 0.12;

export function pickBundles(bundles: Bundle[], cap: number): Bundle[] {
  return bundles.filter((b) => !b.alreadyCovered).sort((a, b) => bundleImportance(b) - bundleImportance(a)).slice(0, cap);
}

export function withinCeiling(monthSpentUsd: number, nextEstimateUsd: number): boolean {
  return monthSpentUsd + nextEstimateUsd <= NEWS_CONFIG.monthlyCeilingGbp * NEWS_CONFIG.usdPerGbp;
}

export function uniqueSlug(title: string, taken: Set<string>): string {
  const base = title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70).replace(/-$/, '');
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
```

- [ ] **Step 4: Run: PASS**; typecheck.
- [ ] **Step 5: Commit** `git add src/lib/news/plan.ts src/lib/news/plan.test.ts && git commit -m "News pipeline: rank, cap, ceiling, slug"`

---

### Task 8: Image with a stamped credit, or a branded card

**Files:**
- Create: `src/lib/news/image.ts`
- Test: `src/lib/news/image.test.ts`, fixture `src/lib/news/fixtures/photo.jpg` (any 1600x1000 JPEG from `public/images/`)

**Interfaces:**
- Consumes: `sharp`, `uploadToR2(key, body, contentType)`, `NEWS_CONFIG`, `Bundle`.
- Produces: `creditLine(photoCredit: string | null, site: string): string`; `stampImage(src: Buffer, credit: string): Promise<Buffer>`; `brandedCard(headline: string): Promise<Buffer>`; `storyImage(b: Bundle, slug: string): Promise<{ url: string; credit: string | null }>`.

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { brandedCard, creditLine, stampImage } from './image';

const photo = readFileSync(new URL('./fixtures/photo.jpg', import.meta.url));

describe('story images', () => {
  it('credits the photographer and site, or the site alone', () => {
    expect(creditLine('Jane Smith', 'iRunFar')).toBe('Photo: Jane Smith / iRunFar');
    expect(creditLine(null, 'iRunFar')).toBe('Photo: iRunFar');
    expect(creditLine('iRunFar/Jane Smith', 'iRunFar')).toBe('Photo: iRunFar/Jane Smith');
  });
  it('crops to 1200x675 WebP with the credit stamped in', async () => {
    const out = await stampImage(photo, 'Photo: Jane Smith / iRunFar');
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1200, 675, 'webp']);
    // The bottom-right corner is darker than the plain crop: the strip is there.
    const plain = await sharp(photo).resize(1200, 675, { fit: 'cover' }).extract({ left: 900, top: 640, width: 300, height: 35 }).stats();
    const stamped = await sharp(out).extract({ left: 900, top: 640, width: 300, height: 35 }).stats();
    expect(stamped.channels[0].mean).toBeLessThan(plain.channels[0].mean + 1);
  });
  it('a branded card is 1200x675 WebP', async () => {
    const meta = await sharp(await brandedCard('UTMB 2026')).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1200, 675, 'webp']);
  });
});
```

- [ ] **Step 2: Run: FAIL.**

- [ ] **Step 3: Implement `image.ts`**

```ts
import sharp from 'sharp';
import { uploadToR2 } from '@/lib/r2';
import { NEWS_CONFIG } from './config';
import type { Bundle } from './types';

const W = NEWS_CONFIG.imageWidth;
const H = NEWS_CONFIG.imageHeight;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function creditLine(photoCredit: string | null, site: string): string {
  if (!photoCredit) return `Photo: ${site}`;
  return photoCredit.toLowerCase().includes(site.toLowerCase()) ? `Photo: ${photoCredit}` : `Photo: ${photoCredit} / ${site}`;
}

export async function stampImage(src: Buffer, credit: string): Promise<Buffer> {
  const text = esc(credit);
  const stripW = Math.min(W, 16 + text.length * 9);
  const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${W - stripW}" y="${H - 34}" width="${stripW}" height="34" fill="black" fill-opacity="0.6"/>
    <text x="${W - 8}" y="${H - 11}" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="white" text-anchor="end">${text}</text>
  </svg>`);
  return sharp(src).rotate().resize(W, H, { fit: 'cover', position: 'attention' }).composite([{ input: svg }]).webp({ quality: 82 }).toBuffer();
}

/** The fallback: the headline over a dark Film My Run panel. */
export async function brandedCard(headline: string): Promise<Buffer> {
  const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#18181b"/>
    <rect x="0" y="${H - 8}" width="${W}" height="8" fill="#f88c00"/>
    <text x="60" y="${H / 2}" font-family="Helvetica, Arial, sans-serif" font-size="56" font-weight="bold" fill="#fafafa">${esc(headline.slice(0, 40))}</text>
    <text x="60" y="${H / 2 + 60}" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#f88c00">Film My Run news</text>
  </svg>`);
  return sharp(svg).webp({ quality: 85 }).toBuffer();
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    return (meta.width ?? 0) >= NEWS_CONFIG.minSourceImageWidth ? buf : null;
  } catch {
    return null;
  }
}

/** The lead source's photo, else another source's, else a branded card; stored on R2. */
export async function storyImage(b: Bundle, slug: string): Promise<{ url: string; credit: string | null }> {
  for (const item of b.items) {
    if (!item.imageUrl) continue;
    const buf = await download(item.imageUrl);
    if (!buf) continue;
    const credit = creditLine(item.photoCredit, item.source);
    const url = await uploadToR2(`news/${slug}.webp`, await stampImage(buf, credit), 'image/webp');
    return { url, credit };
  }
  const url = await uploadToR2(`news/${slug}.webp`, await brandedCard(b.headline), 'image/webp');
  return { url, credit: null };
}
```

- [ ] **Step 4: Run: PASS.** Open one stamped output by eye (`sharp(out).toFile('/tmp/stamp.webp')` in a scratch run) and confirm the credit reads; adjust font size only.
- [ ] **Step 5: Commit** `git add src/lib/news/image.ts src/lib/news/image.test.ts src/lib/news/fixtures/photo.jpg && git commit -m "News pipeline: stamped photo credit or branded card"`

---

### Task 9: The run, the CLI, the email, the workflow

**Files:**
- Create: `src/lib/news/run.ts`, `scripts/news-daily.ts`, `scripts/news-publish.ts`, `scripts/news-unimage.ts`, `.github/workflows/news-daily.yml`
- Modify: `package.json` (scripts)
- Test: `src/lib/news/run.test.ts`

**Interfaces:**
- Consumes: everything above; `prisma`; `Resend`.
- Produces: `runNews(opts: { now: Date; dryRun: boolean; outDir?: string; deps?: Partial<RunDeps> }): Promise<RunLog>`; `RunDeps` (injectable `gather`, `sort`, `group`, `write`, `check`, `image`, `publish`, `monthSpentUsd`, `recentHeadlines`, `takenSlugs`, `markSeen`).

- [ ] **Step 1: Write the failing test** (whole flow with fakes; no network, no database)

```ts
import { describe, expect, it } from 'vitest';
import { runNews } from './run';
import type { Candidate, Verdict } from './types';

const cand = (id: number): Candidate => ({ articleId: id, url: `https://x.test/${id}`, source: 'iRunFar', title: `T${id}`, pubDate: new Date(), summary: 's', text: `full text ${id}`, imageUrl: null, photoCredit: null });
const news = (importance: number): Verdict => ({ type: 'news', confidence: 0.95, isRunning: true, topic: 'trail_ultra', isUk: false, importance });

function deps(over: Record<string, unknown> = {}) {
  const published: string[] = [];
  const held: string[] = [];
  const d = {
    gather: async () => [cand(1), cand(2), cand(3), cand(4), cand(5), cand(6)],
    sort: async (c: Candidate) => ({ verdict: c.articleId === 6 ? { ...news(9), type: 'review' as const } : news(c.articleId), costUsd: 0.001 }),
    group: async (items: { c: Candidate; v: Verdict }[]) => ({ costUsd: 0.002, bundles: items.map(({ c, v }) => ({ key: `e${c.articleId}`, headline: `E${c.articleId}`, items: [c], verdicts: [v], alreadyCovered: false })) }),
    write: async () => ({ draft: { title: 'A title', excerpt: 'An excerpt.', paragraphs: ['One.', 'Two.', 'Three.'] }, refusal: null, costUsd: 0.06 }),
    check: async () => ({ ok: true, unsupported: [], costUsd: 0.03 }),
    image: async () => ({ url: 'https://r2.test/x.webp', credit: 'Photo: iRunFar' }),
    publish: async (s: { slug: string }) => { published.push(s.slug); },
    hold: async (s: { slug: string }) => { held.push(s.slug); },
    monthSpentUsd: async () => 0,
    recentHeadlines: async () => [],
    takenSlugs: async () => new Set<string>(),
    markSeen: async () => {},
    ...over,
  };
  return { d, published, held };
}

describe('a news run', () => {
  it('writes at most 4, the most important first, and skips non-news', async () => {
    const { d, published } = deps();
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(log.published).toHaveLength(4);
    expect(published).toHaveLength(4);
    expect(log.sortedOut.map((s) => s.type)).toContain('review');
    expect(log.costUsd).toBeCloseTo(6 * 0.001 + 0.002 + 4 * 0.09, 5);
  });
  it('holds (saves, unpublished) a story that fails the fact check', async () => {
    const { d, published, held } = deps({ check: async () => ({ ok: false, unsupported: ['19:37'], costUsd: 0.03 }) });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published).toHaveLength(0);
    expect(held).toHaveLength(4);
    expect(log.held[0].reason).toMatch(/unsupported: 19:37/);
  });
  it('stops writing at the ceiling but keeps what it wrote', async () => {
    let spent = 12.5;
    const { d, published } = deps({ monthSpentUsd: async () => spent, publish: async (s: { slug: string }) => { published.push(s.slug); spent += 0.09; } });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published.length).toBeLessThan(4);
    expect(log.stoppedByCeiling).toBe(true);
  });
  it('a dry run publishes nothing', async () => {
    const { d, published } = deps();
    const log = await runNews({ now: new Date(), dryRun: true, deps: d as never });
    expect(published).toHaveLength(0);
    expect(log.published).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run: FAIL.**

- [ ] **Step 3: Implement `run.ts`**

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { prisma } from '@/lib/db';
import { NEWS_CONFIG } from './config';
import { gatherCandidates } from './gather';
import { bundleImportance, groupItems } from './group';
import { storyImage } from './image';
import { pickBundles, STORY_ESTIMATE_USD, uniqueSlug, withinCeiling } from './plan';
import { ruleProblems } from './rules';
import { isBorderline, passesSort, sortItem } from './sort';
import type { Bundle, Candidate, RunLog, StoryToPublish, Verdict } from './types';
import { checkFacts, writeStory } from './write';

export interface RunDeps {
  gather: (now: Date) => Promise<Candidate[]>;
  sort: typeof sortItem;
  group: (items: { c: Candidate; v: Verdict }[], recent: string[]) => ReturnType<typeof groupItems>;
  write: (b: Bundle, now: Date) => ReturnType<typeof writeStory>;
  check: typeof checkFacts;
  image: typeof storyImage;
  publish: (s: StoryToPublish) => Promise<void>;
  hold: (s: StoryToPublish, reason: string) => Promise<void>;
  monthSpentUsd: (now: Date) => Promise<number>;
  recentHeadlines: (now: Date) => Promise<string[]>;
  takenSlugs: () => Promise<Set<string>>;
  markSeen: (items: { c: Candidate; v: Verdict | null; bundleKey?: string }[]) => Promise<void>;
}

const liveDeps: RunDeps = {
  gather: gatherCandidates,
  sort: sortItem,
  group: (items, recent) => groupItems(items, recent),
  write: (b, now) => writeStory(b, now),
  check: checkFacts,
  image: storyImage,
  publish: async (s) => {
    const story = await prisma.news_stories.create({ data: {
      slug: s.slug, title: s.title, excerpt: s.excerpt,
      content: s.paragraphs.map((p) => `<p>${p.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!)}</p>`).join('\n'),
      image_url: s.imageUrl, photo_credit: s.photoCredit, source_url: s.sources[0]?.url ?? '', sources: s.sources,
      topic: s.topic, is_uk: s.isUk, importance: s.importance, priority: 100 - s.importance * 10,
      status: 'published', published_at: new Date(),
    } });
    await prisma.news_items.updateMany({ where: { article_id: { in: s.articleIds } }, data: { story_id: story.id } });
  },
  hold: async (s, reason) => {
    await prisma.news_stories.create({ data: {
      slug: s.slug, title: s.title, excerpt: s.excerpt,
      content: s.paragraphs.map((p) => `<p>${p.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!)}</p>`).join('\n'),
      source_url: s.sources[0]?.url ?? '', sources: s.sources, topic: s.topic, is_uk: s.isUk, importance: s.importance,
      status: 'held', held_reason: reason,
    } });
  },
  monthSpentUsd: async (now) => {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const r = await prisma.news_runs.aggregate({ _sum: { cost_usd: true }, where: { started_at: { gte: from } } });
    return r._sum.cost_usd ?? 0;
  },
  recentHeadlines: async (now) => (await prisma.news_stories.findMany({ where: { published_at: { gte: new Date(now.getTime() - NEWS_CONFIG.windowDays * 86_400_000) } }, select: { title: true } })).map((s) => s.title),
  takenSlugs: async () => new Set((await prisma.news_stories.findMany({ select: { slug: true } })).map((s) => s.slug)),
  markSeen: async (items) => {
    for (const { c, v, bundleKey } of items) {
      await prisma.news_items.upsert({ where: { article_id: c.articleId }, update: { verdict: v ?? undefined, bundle_key: bundleKey }, create: { article_id: c.articleId, url: c.url, source: c.source, verdict: v ?? undefined, bundle_key: bundleKey } });
    }
  },
};

export async function runNews({ now, dryRun, outDir, deps = {} }: { now: Date; dryRun: boolean; outDir?: string; deps?: Partial<RunDeps> }): Promise<RunLog> {
  const d: RunDeps = { ...liveDeps, ...deps };
  const log: RunLog = { dryRun, itemsSeen: 0, sortedOut: [], borderline: [], held: [], published: [], costUsd: 0, stoppedByCeiling: false };

  const candidates = await d.gather(now);
  log.itemsSeen = candidates.length;
  const sorted: { c: Candidate; v: Verdict | null }[] = [];
  for (const c of candidates) {
    const { verdict, costUsd } = await d.sort(c);
    log.costUsd += costUsd;
    sorted.push({ c, v: verdict });
    if (isBorderline(verdict)) log.borderline.push({ url: c.url, confidence: verdict!.confidence });
    else if (!passesSort(verdict)) log.sortedOut.push({ url: c.url, type: verdict?.type ?? 'other', confidence: verdict?.confidence ?? 0 });
  }
  const passed = sorted.filter((s): s is { c: Candidate; v: Verdict } => passesSort(s.v));
  const grouped = await d.group(passed, await d.recentHeadlines(now));
  log.costUsd += grouped.costUsd;
  if (!dryRun) {
    const keyOf = new Map(grouped.bundles.flatMap((b) => b.items.map((i) => [i.articleId, b.key] as const)));
    await d.markSeen(sorted.map((s) => ({ ...s, bundleKey: keyOf.get(s.c.articleId) })));
  }

  const taken = await d.takenSlugs();
  const monthBefore = await d.monthSpentUsd(now);
  for (const b of pickBundles(grouped.bundles, NEWS_CONFIG.maxStoriesPerRun)) {
    if (!withinCeiling(monthBefore + log.costUsd, STORY_ESTIMATE_USD)) { log.stoppedByCeiling = true; break; }
    const w = await d.write(b, now);
    log.costUsd += w.costUsd;
    if (!w.draft) { log.held.push({ headline: b.headline, reason: w.refusal ?? 'no draft' }); continue; }
    const slug = uniqueSlug(w.draft.title, taken);
    taken.add(slug);
    const lead = b.verdicts.reduce((a, v) => (v.importance > a.importance ? v : a), b.verdicts[0]);
    const story: StoryToPublish = {
      ...w.draft, slug, topic: lead.topic, isUk: b.verdicts.some((v) => v.isUk), importance: bundleImportance(b),
      sources: b.items.map((i) => ({ site: i.source, url: i.url })), imageUrl: null, photoCredit: null,
      bundleKey: b.key, articleIds: b.items.map((i) => i.articleId),
    };
    const problems = ruleProblems(w.draft, b.items.map((i) => i.text ?? ''));
    let reason = problems.length ? problems.join(', ') : null;
    if (!reason) {
      const c = await d.check(w.draft, b);
      log.costUsd += c.costUsd;
      if (!c.ok) reason = `unsupported: ${c.unsupported.join('; ')}`;
    }
    if (reason) {
      log.held.push({ headline: b.headline, reason });
      if (!dryRun) await d.hold(story, reason);
      continue;
    }
    const img = dryRun ? { url: '', credit: null } : await d.image(b, slug);
    story.imageUrl = img.url || null;
    story.photoCredit = img.credit;
    if (!dryRun) await d.publish(story);
    if (outDir) { await mkdir(outDir, { recursive: true }); await writeFile(`${outDir}/${slug}.json`, JSON.stringify(story, null, 2)); }
    log.published.push({ slug, title: story.title });
  }
  if (outDir) await writeFile(`${outDir}/log.json`, JSON.stringify(log, null, 2));
  return log;
}
```

- [ ] **Step 4: Run: PASS**; typecheck.

- [ ] **Step 5: The CLI, hand tools and email**

`scripts/news-daily.ts`:

```ts
import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { runNews } from '@/lib/news/run';

const dryRun = process.argv.includes('--dry-run');
const outDir = dryRun ? `news-dry-run/${new Date().toISOString().slice(0, 10)}` : undefined;

(async () => {
  const log = await runNews({ now: new Date(), dryRun, outDir });
  await prisma.news_runs.create({ data: { dry_run: dryRun, cost_usd: log.costUsd, summary: log as never } });
  const text = [
    `${dryRun ? 'DRY RUN. ' : ''}${log.published.length} published, ${log.held.length} held, ${log.itemsSeen} items seen, $${log.costUsd.toFixed(3)}.`,
    log.stoppedByCeiling ? 'Stopped at the £10 monthly ceiling.' : '',
    ...log.published.map((p) => `Published: ${p.title} https://filmmyrun.com/news/${p.slug}`),
    ...log.held.map((h) => `Held: ${h.headline} (${h.reason}); publish by hand with npm run news:publish <id>`),
    ...log.borderline.map((b) => `Borderline (${b.confidence.toFixed(2)}): ${b.url}`),
  ].filter(Boolean).join('\n');
  console.log(text);
  if (process.env.RESEND_API_KEY && process.env.NEWS_REPORT_TO) {
    await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.FROM_EMAIL ?? 'news@filmmyrun.com', to: process.env.NEWS_REPORT_TO, subject: `Film My Run news: ${log.published.length} published`, text });
  }
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
```

`scripts/news-publish.ts` (publish a held story by hand, with the branded card as its image):

```ts
import { prisma } from '@/lib/db';
import { uploadToR2 } from '@/lib/r2';
import { brandedCard } from '@/lib/news/image';

(async () => {
  const id = Number(process.argv[2]);
  const s = await prisma.news_stories.findUniqueOrThrow({ where: { id } });
  if (s.status !== 'held') throw new Error(`Story ${id} is ${s.status}, not held`);
  const url = await uploadToR2(`news/${s.slug}.webp`, await brandedCard(s.title), 'image/webp');
  await prisma.news_stories.update({ where: { id }, data: { status: 'published', published_at: new Date(), image_url: url, held_reason: null } });
  console.log(`Published story ${id}: https://filmmyrun.com/news/${s.slug}`);
  await prisma.$disconnect();
})();
```

`scripts/news-unimage.ts`:

```ts
import { prisma } from '@/lib/db';
import { uploadToR2 } from '@/lib/r2';
import { brandedCard } from '@/lib/news/image';

(async () => {
  const id = Number(process.argv[2]);
  const s = await prisma.news_stories.findUniqueOrThrow({ where: { id } });
  const url = await uploadToR2(`news/${s.slug}-card.webp`, await brandedCard(s.title), 'image/webp');
  await prisma.news_stories.update({ where: { id }, data: { image_url: url, photo_credit: null } });
  console.log(`Story ${id} now uses the branded card: ${url}`);
  await prisma.$disconnect();
})();
```

`package.json` scripts: `"news:daily": "tsx --tsconfig tsconfig.json scripts/news-daily.ts"`, `"news:publish": "tsx --tsconfig tsconfig.json scripts/news-publish.ts"`, `"news:unimage": "tsx --tsconfig tsconfig.json scripts/news-unimage.ts"`. Add `news-dry-run/` to `.gitignore`.

- [ ] **Step 6: The workflow** `.github/workflows/news-daily.yml`

```yaml
name: News daily
on:
  schedule:
    - cron: '0 5 * * *'   # 06:00 UK summer time, 05:00 winter
  workflow_dispatch:
    inputs:
      dry_run: { description: 'Dry run (publish nothing)', type: boolean, default: true }
jobs:
  news:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci && npx prisma generate
      - run: npm run news:daily -- ${{ (github.event_name == 'workflow_dispatch' && inputs.dry_run) && '--dry-run' || '' }}
        env:
          DATABASE_URL: ${{ secrets.DATABASE_PUBLIC_URL }}
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
          R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
          R2_BUCKET_NAME: ${{ secrets.R2_BUCKET_NAME }}
          R2_PUBLIC_URL: ${{ secrets.R2_PUBLIC_URL }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          FROM_EMAIL: ${{ secrets.FROM_EMAIL }}
          NEWS_REPORT_TO: stephen@filmmyrun.com
      - if: ${{ github.event_name == 'workflow_dispatch' && inputs.dry_run }}
        uses: actions/upload-artifact@v4
        with: { name: news-dry-run, path: news-dry-run/ }
```

The scheduled run is **disabled until go-live** (Task 12): comment out the `schedule:` block in this task.

- [ ] **Step 7: Repository secrets.** Copy each from Railway without printing it, e.g. `railway variables --kv | grep '^OPENROUTER_API_KEY=' | cut -d= -f2- | gh secret set OPENROUTER_API_KEY`, for: `OPENROUTER_API_KEY`, `R2_*` (5), `RESEND_API_KEY`, `FROM_EMAIL`, and `DATABASE_PUBLIC_URL` (from the Postgres service: `railway variables -s Postgres --kv`). If the permission check blocks secret writes, give Stephen the exact commands to run with `!`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/news/run.ts src/lib/news/run.test.ts scripts/news-daily.ts scripts/news-publish.ts scripts/news-unimage.ts .github/workflows/news-daily.yml package.json .gitignore
git commit -m "News pipeline: the daily run, dry-run folder, report email, workflow (schedule off)"
```

---

### Task 10: The news page and story page

**Files:**
- Modify: `src/app/news/page.tsx` (only our stories; tags), `src/components/news/NewsContent.tsx` (topic chips from `tags`), `src/app/news/[slug]/page.tsx` (credit, sources, NewsArticle JSON-LD)
- Create: `src/lib/news/present.ts`
- Test: `src/lib/news/present.test.ts`

**Interfaces:**
- Produces: `NEWS_PAGE_OURS_ONLY` (boolean constant, `false` until Task 12); `storyTags(topic: string | null, isUk: boolean): string[]`; `TOPIC_LABELS`.

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest';
import { storyTags } from './present';

describe('story tags', () => {
  it('a topic label, plus UK when British', () => {
    expect(storyTags('trail_ultra', true)).toEqual(['Trail & Ultra', 'UK']);
    expect(storyTags('road', false)).toEqual(['Road']);
    expect(storyTags(null, false)).toEqual(['Trail & Ultra']);
  });
});
```

- [ ] **Step 2: Run: FAIL.** **Step 3: Implement `present.ts`:**

```ts
/** Flip to true at go-live (Task 12): /news then shows only our stories. */
export const NEWS_PAGE_OURS_ONLY = false;

export const TOPIC_LABELS: Record<string, string> = { trail_ultra: 'Trail & Ultra', road: 'Road', track: 'Track' };

export function storyTags(topic: string | null, isUk: boolean): string[] {
  return [TOPIC_LABELS[topic ?? 'trail_ultra'] ?? 'Trail & Ultra', ...(isUk ? ['UK'] : [])];
}
```

- [ ] **Step 4: `src/app/news/page.tsx`.** In `getOriginalStories`, order by `published_at desc` (not priority), and add `tags: storyTags(story.topic, story.is_uk)` and `source: 'Film My Run'`. In `getArticles`, when `NEWS_PAGE_OURS_ONLY` is true return only `getOriginalStories()`; otherwise keep today's merge. Add `tags?: string[]` to the `Article` interface (both files).

- [ ] **Step 5: `NewsContent.tsx`.** Where the chips are built from `article.source`, build them from `article.tags ?? [article.source]` instead, in the fixed order `['Trail & Ultra', 'Road', 'Track', 'UK']` when every article has tags; filtering keeps an article when its tags include the selected chip. Counts come from the same tags. Leave the source-chip behaviour for untagged (feed) articles so the page is unchanged until go-live.

- [ ] **Step 6: `src/app/news/[slug]/page.tsx`.**
  - Under the hero image: `{story.photoCredit && <p className="text-xs text-muted mt-2">{story.photoCredit}</p>}` (select `photo_credit`).
  - Replace the "iRunFar" source block and "Read the full iRunFar roundup" link with a small "Sources" line built from `story.sources` (`[{ site, url }]`): `Reported from <a href={url} rel="nofollow noopener" target="_blank">{site}</a>, …`. For old stories without `sources`, fall back to `source_url` labelled "iRunFar".
  - Add NewsArticle JSON-LD: `{ '@context': 'https://schema.org', '@type': 'NewsArticle', headline, datePublished: published_at, image: [image_url], author: { '@type': 'Organization', name: 'Film My Run' }, publisher: { '@type': 'Organization', name: 'Film My Run' } }`.
  - Keep "More news" (three related stories); order related by `published_at desc`.

- [ ] **Step 7: Check** `npm test`, `npm run typecheck`, then `rm -rf .next && npm run build`. Expected: build passes, `/news` and `/news/[slug]` are `ƒ` (dynamic).

- [ ] **Step 8: Commit** `git add src/lib/news/present.ts src/lib/news/present.test.ts src/app/news src/components/news && git commit -m "News page: our stories with topic chips, sources and credit (switch off until go-live)"`

---

### Task 11: Retire the round-up pipeline; check the newsletter

**Files:**
- Delete: `src/lib/ai-news-synthesizer.ts`, `src/lib/ai-news-synthesizer.test.ts` (untracked), `src/app/api/news/generate/route.ts`, `.github/workflows/generate-news-stories.yml`, `scripts/tmp-compare/` (untracked)
- Modify: `src/lib/llm.ts` (drop the uncommitted `NEWS_MODEL` export; the pipeline uses `src/lib/news/models.ts`)
- Read: `src/lib/newsletter-auto-populate.ts`

- [ ] **Step 1:** `git rm src/lib/ai-news-synthesizer.ts src/app/api/news/generate/route.ts .github/workflows/generate-news-stories.yml`; delete the two untracked paths by moving them to the scratchpad (never `rm -rf`); `git checkout src/lib/llm.ts` only if it still holds just the uncommitted `NEWS_MODEL` block (check with `git diff src/lib/llm.ts` first; Task 2 committed `completeJson`).
- [ ] **Step 2:** `grep -rn "ai-news-synthesizer\|news/generate" src .github` must print nothing.
- [ ] **Step 3:** Read `newsletter-auto-populate.ts`. If it lists feed `articles` as news for readers, switch that query to published `news_stories` (title, `/news/<slug>`, excerpt); otherwise leave it and note why in the commit message.
- [ ] **Step 4:** `npm test && npm run typecheck && rm -rf .next && npm run build`.
- [ ] **Step 5: Commit** `git commit -m "Retire the iRunFar round-up pipeline (never produced a story)"`

---

### Task 12: Sorter check, dry runs, go-live

**Files:**
- Create: `scripts/news-sorter-check.ts`, `docs/news/sorter-labels.json`, `docs/news/sorter-check.md`
- Modify: `src/lib/news/present.ts` (`NEWS_PAGE_OURS_ONLY = true`), `.github/workflows/news-daily.yml` (schedule on)

- [ ] **Step 1: Labels.** Export the last 14 days of `articles` (id, source, title, description, link) to JSON; label each item by hand as `{ id, isNews: boolean, note }` into `docs/news/sorter-labels.json` (news = something that happened; not previews, personal race reports, reviews, training, opinion, media, sponsored). Mark doubtful ones `"unsure": true` and list them for Stephen.
- [ ] **Step 2: `scripts/news-sorter-check.ts`**: for each labelled item build a `Candidate` from the stored summary (plus page text via `extractPage` where fetchable), run `sortItem`, and report: items the sorter would pass at 0.90 that are labelled not-news (the auto-publish risk, target 0), real news it misses, and the confidence spread. Write the report to `docs/news/sorter-check.md`. Commit labels, script and report.
- [ ] **Step 3:** If any not-news passes at 0.90, raise `newsThreshold` or tighten the sort prompt, re-run, record both in the report. Commit.
- [ ] **Step 4: Three days of dry runs:** `gh workflow run "News daily" -f dry_run=true` each morning; download the `news-dry-run` artifact; send Stephen the stories (about 12) and the log. Tune the voice lines in `write.ts` and importance wording in `sort.ts` from his notes; commit each change.
- [ ] **Step 5: Go-live, with Stephen's yes:** set `NEWS_PAGE_OURS_ONLY = true`; uncomment the workflow `schedule`; `npm test && npm run typecheck && rm -rf .next && npm run build`; commit and push; run `gh workflow run "News daily" -f dry_run=false` once; open filmmyrun.com/news and one story page and confirm the credit, sources and chips are served (read the RSC payload with `curl -H "RSC: 1"` if the HTML looks empty).
