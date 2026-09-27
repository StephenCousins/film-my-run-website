# Runner Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A page per notable runner on filmmyrun.com (bio, two photos, best finishes, live UTMB index, their news stories). Runner names in news stories link to those pages. The news writer reads each runner's file as a source. New names from the news get a page automatically.

**Architecture:** A new `runners` table and a `src/lib/runners/` module:
- `names.ts`: the name matcher and linker, shared by the story page, "In the news" and the writer.
- `utmb.ts` and `wikipedia.ts`: source readers.
- `gather.ts`: builds the work file.
- `checks.ts`: the save rules.
- `save.ts`: publishes.
- `auto.ts`: automatic pages from the news.

Session work runs through two CLI scripts, `runners:gather` and `runners:save`. The weekly UTMB refresh runs inside the Monday news run and reports in its email.

**Tech Stack:** Next.js 15 App Router, Prisma/Postgres (Railway), vitest, sharp, cheerio, OpenRouter (`completeJson`), Cloudflare R2 (`uploadToR2`).

**Spec:** `docs/superpowers/specs/2026-09-27-runner-profiles-design.md`

## Global Constraints

- Prisma models and fields are snake_case. Returned objects to the frontend are camelCase.
- Any DB-backed page has `export const dynamic = 'force-dynamic'`. The database is unreachable at build time.
- All LLM calls go through OpenRouter via `completeJson` from `src/lib/llm.ts`. Never call the Anthropic API.
- Bios follow the news rules:
  - the news desk voice (`VOICE` in `src/lib/news/write.ts`)
  - no em dashes or spaced en dashes, no semicolons (`tidyPunctuation`, `ruleProblems`)
  - near-copy of a source (10 words) is rejected
  - facts only from sources
  - unconfirmed facts are cut or kept with `*` plus `UNVERIFIED_NOTE`
- A bio is 3 to 5 paragraphs.
- Living people: no health, family or private life beyond what they made public. Doping only when an official body ruled. Deaths only from a reliable report.
- Photos:
  - at most two per runner, `portrait` and `action`, credited, with `source_url`
  - never agency photos: a credit naming Getty, AFP, Reuters, AP, PA, Shutterstock or Alamy is rejected
  - stored on R2 under `runners/`, never hotlinked
- Automatic pages: at most 3 a day, inside the news run's £10 monthly ceiling (`NEWS_CONFIG.monthlyCeilingGbp`), `written_by = 'auto'`, no photos (card), and only when the runner has at least one result from UTMB or a Wikipedia article.
- Links: first mention only, exact name or alias (two words or more), whole words, never inside `<a>`, `<h1>`–`<h6>` or `<figcaption>`. A name two published runners share links neither.
- Tests: run only the tests for what changed (`npx vitest run src/lib/runners`), plus `npx tsc --noEmit`. The full suite runs once, in the last task.
- Commit straight to `main`. A push deploys (Railway runs `prisma migrate deploy` first). Stash `BLOG-WRITING-INSTRUCTIONS.md` around `git pull --rebase`, and never stage it.
- Never print or commit keys. `OPENROUTER_API_KEY` comes from Railway: `OPENROUTER_API_KEY="$(railway variables --kv | grep '^OPENROUTER_API_KEY=' | cut -d= -f2-)"`.
- Copy in Stephen's voice (page headings, blurbs): no em dashes.

## Rulings (plan vs spec)

- **Local datasets dropped from the sources.** The spec lists the local DUV, rankinglists, Centurion and `po10_athletes` data as sources. Inspection found them UK-only and amateur-heavy:
  - `finishers_2010_2026.json` holds 16,617 finishes of UK ultras
  - elites mostly race abroad

  The UTMB runner page carries a runner's full trail race history (race, date, distance, climb, time, rank). With Wikipedia, that covers the first batch. Cost if wrong: a UK-club runner's page lacks results that Power of 10 has, and can be added in a session by hand.
- **The UTMB refresh runs inside the Monday news run, not a separate workflow.** The spec wants failures "loud in the Monday email". Running it in the same script puts the refresh summary, or its error, in that email with no new workflow or secrets. Cost if wrong: one Monday run takes about a minute longer.

## Review Focus

1. **UTMB's upper-case surnames.** "Kilian JORNET BURGADA" must become "Kilian Jornet Burgada", and "Jean-Philippe O'NEILL" must become "Jean-Philippe O'Neill". Otherwise pages are titled in capitals and names never match news text. Tested in Task 3.
2. **Possessives and curly apostrophes in news text.** "Jim Walmsley's win" and "Ruth O’Neill" (curly) must link "Jim Walmsley" and "Ruth O'Neill". Tested in Task 2.
3. **A Wikipedia disambiguation page, or no article at all** (common trail names like "David Roche"). Gather must return no Wikipedia source, not the disambiguation text. Tested in Task 4.
4. **A runner with no UTMB index** (retired, historic, or `index: null`). The page shows no index line and the refresh leaves the field null without failing. Tested in Tasks 3 and 9.
5. **The same runner named twice in one story, or once in a heading and again in the text.** Only the first body-text mention links; heading text never does. Tested in Task 2.

---

## File Structure

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` (+ migration `20260927090000_runners`) | `runners` model |
| `src/lib/runners/types.ts` | `BestFinish`, `RunnerPhoto`, `RunnerSource`, `RunnerFile` |
| `src/lib/runners/names.ts` | `nameIndex`, `linkRunners`, `mentionedSlugs`, `loadNameIndex` |
| `src/lib/runners/utmb.ts` | UTMB ranked list, runner page, name search, `displayName` |
| `src/lib/runners/wikipedia.ts` | Article text, summary, Commons lead image + licence |
| `src/lib/runners/gather.ts` | Builds a `RunnerFile` (sources + facts) for one runner |
| `src/lib/runners/checks.ts` | `profileProblems` (the save rules) |
| `src/lib/runners/save.ts` | Photo upload + upsert |
| `src/lib/runners/write.ts` | `writeProfile`, `checkProfile`, `editProfile` (OpenRouter, for auto pages) |
| `src/lib/runners/auto.ts` | Auto pages for new names after a news run |
| `src/lib/runners/refresh.ts` | Weekly UTMB index refresh |
| `src/lib/runners/runner-file.ts` | A runner as a news-writer source (`Candidate`) |
| `scripts/runners-gather.ts`, `scripts/runners-save.ts`, `scripts/runners-photo.ts` | Session CLIs |
| `src/app/runners/page.tsx`, `src/app/runners/RunnersList.tsx`, `src/app/runners/[slug]/page.tsx` | Pages |
| `src/app/news/[slug]/page.tsx` | Linking |
| `src/lib/news/*` | `people` from the writer, runner file as a source, auto pages, refresh |

---

### Task 1: The `runners` table and types

**Files:**
- Modify: `prisma/schema.prisma` (append after `model news_runs`)
- Create: `prisma/migrations/20260927090000_runners/migration.sql`
- Create: `src/lib/runners/types.ts`

**Interfaces:**
- Produces: the Prisma model `runners`, plus the types `BestFinish`, `RunnerPhoto`, `RunnerSource`, `RunnerFile`, `Discipline`, and `AGENCY_CREDITS`.

- [ ] **Step 1: Add the model**

Append to `prisma/schema.prisma`:

```prisma
model runners {
  id             Int       @id @default(autoincrement())
  slug           String    @unique
  name           String
  aliases        String[]  @default([])
  nationality    String?   // ISO 3166 alpha-2
  sex            String?   // M | F
  birth_year     Int?
  disciplines    String[]  @default([]) // trail_ultra | road | track
  era            String    @default("current") // current | historic
  bio            String    @default("") // HTML <p> paragraphs
  best_finishes  Json      @default("[]") // BestFinish[]
  sources        Json      @default("[]") // RunnerSource[]
  photos         Json      @default("[]") // RunnerPhoto[]
  utmb_id        Int?      @unique
  utmb_uri       String?
  utmb_index     Int?
  utmb_index_at  DateTime?
  status         String    @default("draft") // draft | published
  written_by     String    @default("session") // session | auto
  bio_checked_at DateTime?
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt

  @@index([status])
}
```

- [ ] **Step 2: Write the migration**

`prisma/migrations/20260927090000_runners/migration.sql`:

```sql
CREATE TABLE "runners" (
  "id" SERIAL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "nationality" TEXT,
  "sex" TEXT,
  "birth_year" INTEGER,
  "disciplines" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "era" TEXT NOT NULL DEFAULT 'current',
  "bio" TEXT NOT NULL DEFAULT '',
  "best_finishes" JSONB NOT NULL DEFAULT '[]',
  "sources" JSONB NOT NULL DEFAULT '[]',
  "photos" JSONB NOT NULL DEFAULT '[]',
  "utmb_id" INTEGER,
  "utmb_uri" TEXT,
  "utmb_index" INTEGER,
  "utmb_index_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'draft',
  "written_by" TEXT NOT NULL DEFAULT 'session',
  "bio_checked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "runners_slug_key" ON "runners"("slug");
CREATE UNIQUE INDEX "runners_utmb_id_key" ON "runners"("utmb_id");
CREATE INDEX "runners_status_idx" ON "runners"("status");
```

- [ ] **Step 3: Write the types**

`src/lib/runners/types.ts`:

```ts
/** Runner profiles (spec 2026-09-27-runner-profiles-design.md). */
export type Discipline = 'trail_ultra' | 'road' | 'track';

export interface BestFinish {
  race: string;
  year: number;
  distance: string | null; // "171 km", "Marathon"
  time: string | null; // "19:49:30"
  position: string | null; // "1st", "3rd woman"
  source: string; // the RunnerSource name it came from
}

export interface RunnerPhoto {
  kind: 'portrait' | 'action';
  url: string; // R2 URL once saved; the original URL in a work file before
  credit: string; // "Photo: Jane Smith / iRunFar"
  licence: string | null; // "CC BY-SA 4.0" when known
  source_url: string; // the page the photo was found on
}

export interface RunnerSource {
  name: string; // "UTMB", "Wikipedia", "iRunFar"
  url: string;
}

/** A photographer or agency whose images are never used (spec: automated invoices). */
export const AGENCY_CREDITS = /\b(getty|afp|reuters|associated press|ap photo|\bap\b|pa images|pa wire|press association|shutterstock|alamy)\b/i;

/** Everything gathered on one runner: the work file a session (or auto.ts) writes a bio from. */
export interface RunnerFile {
  slug: string;
  name: string;
  aliases: string[];
  nationality: string | null;
  sex: 'M' | 'F' | null;
  birthYear: number | null;
  disciplines: Discipline[];
  era: 'current' | 'historic';
  utmb: { id: number; uri: string; index: number | null; website: string | null } | null;
  /** Source texts the bio may use: each is one RunnerSource plus its text. */
  texts: { source: RunnerSource; text: string }[];
  /** Results that can go straight into best_finishes. */
  results: BestFinish[];
  /** Photo candidates found while gathering (Commons lead image); the session picks. */
  photoCandidates: RunnerPhoto[];
  /** Filled by the writer (session or auto) before save. */
  bio?: string[]; // paragraphs, plain text
  bestFinishes?: BestFinish[];
  photos?: RunnerPhoto[];
  sources?: RunnerSource[];
}
```

- [ ] **Step 4: Generate and type-check**

Run: `cd ~/Developer/film-my-run-website && npx prisma validate && npx prisma generate && npx tsc --noEmit`
Expected: "The schema at prisma/schema.prisma is valid", then no type errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260927090000_runners src/lib/runners/types.ts
git commit -m "Runners: table and types"
```

Do not push yet. The migration ships with Task 7, the first task that reads the table on the live site.

---

### Task 2: Name matching and linking

**Files:**
- Create: `src/lib/runners/names.ts`
- Test: `src/lib/runners/names.test.ts`

**Interfaces:**
- Consumes: the `runners` model (Task 1), only in `loadNameIndex`.
- Produces:
  - `interface RunnerName { slug: string; name: string; aliases: string[] }`
  - `nameIndex(runners: RunnerName[]): Map<string, string>`, from name to slug
  - `linkRunners(html: string, index: Map<string, string>, onLink?: (slug: string) => void): string`
  - `mentionedSlugs(html: string, index: Map<string, string>): Set<string>`
  - `loadNameIndex(): Promise<Map<string, string>>`, which reads published runners

- [ ] **Step 1: Write the failing tests**

`src/lib/runners/names.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { linkRunners, mentionedSlugs, nameIndex } from './names';

const idx = nameIndex([
  { slug: 'jim-walmsley', name: 'Jim Walmsley', aliases: ['James Walmsley'] },
  { slug: 'kilian-jornet', name: 'Kilian Jornet', aliases: ['Kilian Jornet Burgada', 'Kilian'] },
  { slug: 'ruth-oneill', name: "Ruth O'Neill", aliases: [] },
  { slug: 'david-roche-a', name: 'David Roche', aliases: [] },
  { slug: 'david-roche-b', name: 'David Roche', aliases: [] },
]);
const link = (slug: string, text: string) => `<a href="/runners/${slug}" class="runner-link">${text}</a>`;

describe('the name index', () => {
  it('drops single words and names two runners share', () => {
    expect(idx.has('Kilian')).toBe(false);
    expect(idx.has('David Roche')).toBe(false);
    expect(idx.get('James Walmsley')).toBe('jim-walmsley');
  });
});

describe('linking a story', () => {
  it('links only the first mention of each runner', () => {
    const out = linkRunners('<p>Jim Walmsley won. Jim Walmsley said so.</p>', idx);
    expect(out).toBe(`<p>${link('jim-walmsley', 'Jim Walmsley')} won. Jim Walmsley said so.</p>`);
  });
  it('links a possessive and a curly apostrophe', () => {
    expect(linkRunners("<p>Jim Walmsley's win</p>", idx)).toBe(`<p>${link('jim-walmsley', 'Jim Walmsley')}'s win</p>`);
    expect(linkRunners('<p>Ruth O’Neill led</p>', idx)).toBe(`<p>${link('ruth-oneill', 'Ruth O’Neill')} led</p>`);
  });
  it('prefers the longest alias and counts it as the runner', () => {
    const out = linkRunners('<p>Kilian Jornet Burgada ran. Kilian Jornet again.</p>', idx);
    expect(out).toBe(`<p>${link('kilian-jornet', 'Kilian Jornet Burgada')} ran. Kilian Jornet again.</p>`);
  });
  it('never links inside a link, a heading or a caption, and moves on to the body', () => {
    const html = '<h2>Jim Walmsley</h2><p><a href="/x">Jim Walmsley</a></p><figcaption>Jim Walmsley</figcaption><p>Then Jim Walmsley.</p>';
    expect(linkRunners(html, idx)).toBe(`<h2>Jim Walmsley</h2><p><a href="/x">Jim Walmsley</a></p><figcaption>Jim Walmsley</figcaption><p>Then ${link('jim-walmsley', 'Jim Walmsley')}.</p>`);
  });
  it('needs whole words and leaves tag attributes alone', () => {
    expect(linkRunners('<p>Jim Walmsleyson</p>', idx)).toBe('<p>Jim Walmsleyson</p>');
    expect(linkRunners('<p><img alt="Jim Walmsley"></p>', idx)).toBe('<p><img alt="Jim Walmsley"></p>');
  });
  it('does not link a shared name', () => {
    expect(linkRunners('<p>David Roche won</p>', idx)).toBe('<p>David Roche won</p>');
  });
});

describe('mentioned runners', () => {
  it('are exactly the ones the story would link', () => {
    expect([...mentionedSlugs('<p>Jim Walmsley beat Kilian Jornet and David Roche.</p>', idx)].sort()).toEqual(['jim-walmsley', 'kilian-jornet']);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/lib/runners/names.test.ts`
Expected: FAIL, "Cannot find module './names'".

- [ ] **Step 3: Implement**

`src/lib/runners/names.ts`:

```ts
import { prisma } from '@/lib/db';

export interface RunnerName { slug: string; name: string; aliases: string[] }

/** Straight and curly apostrophes are the same letter for matching. */
const norm = (s: string) => s.trim().replace(/[’‘]/g, "'");

/**
 * Every name and alias to the slug it belongs to. A single word ("Kilian") is too
 * loose to link, and a name two runners share links neither: never the wrong person.
 */
export function nameIndex(runners: RunnerName[]): Map<string, string> {
  const owners = new Map<string, Set<string>>();
  for (const r of runners) {
    for (const raw of [r.name, ...r.aliases]) {
      const n = norm(raw);
      if (n.split(/\s+/).length < 2) continue;
      if (!owners.has(n)) owners.set(n, new Set());
      owners.get(n)!.add(r.slug);
    }
  }
  const out = new Map<string, string>();
  for (const [n, slugs] of owners) if (slugs.size === 1) out.set(n, [...slugs][0]);
  return out;
}

function nameRegex(names: string[]): RegExp {
  const alts = [...names]
    .sort((a, b) => b.length - a.length) // longest first: "Kilian Jornet Burgada" before "Kilian Jornet"
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’‘]"));
  return new RegExp(`(?<![\\p{L}\\p{N}])(${alts.join('|')})(?![\\p{L}\\p{N}])`, 'gu');
}

const SKIP_TAG = /^<(\/?)(a|h[1-6]|figcaption)\b/i;

/**
 * Links the first mention of each runner in a story's HTML. Done when the page is
 * shown, never saved, so older stories pick up runners added later. `onLink` hears
 * every runner linked (mentionedSlugs uses it, so "In the news" always agrees).
 */
export function linkRunners(html: string, index: Map<string, string>, onLink?: (slug: string) => void): string {
  if (index.size === 0) return html;
  const re = nameRegex([...index.keys()]);
  const linked = new Set<string>();
  let skip = 0;
  return html
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith('<')) {
        const m = part.match(SKIP_TAG);
        if (m) skip = Math.max(0, skip + (m[1] ? -1 : 1));
        return part;
      }
      if (skip > 0) return part;
      return part.replace(re, (text: string) => {
        const slug = index.get(norm(text));
        if (!slug || linked.has(slug)) return text;
        linked.add(slug);
        onLink?.(slug);
        return `<a href="/runners/${slug}" class="runner-link">${text}</a>`;
      });
    })
    .join('');
}

export function mentionedSlugs(html: string, index: Map<string, string>): Set<string> {
  const out = new Set<string>();
  linkRunners(html, index, (s) => out.add(s));
  return out;
}

/** The index over every published runner (about 150 rows; one query per page view). */
export async function loadNameIndex(): Promise<Map<string, string>> {
  const rows = await prisma.runners.findMany({ where: { status: 'published' }, select: { slug: true, name: true, aliases: true } });
  return nameIndex(rows);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/runners/names.test.ts && npx tsc --noEmit`
Expected: PASS (8 tests), no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/runners/names.ts src/lib/runners/names.test.ts
git commit -m "Runners: name index and first-mention linker"
```

---

### Task 3: The UTMB reader

**Files:**
- Create: `src/lib/runners/utmb.ts`
- Create: `src/lib/runners/fixtures/utmb-runner.json` (trimmed real page data)
- Create: `src/lib/runners/fixtures/utmb-ranked.json`
- Test: `src/lib/runners/utmb.test.ts`

**Interfaces:**
- Consumes: `BestFinish` (Task 1).
- Produces:
  - `displayName(full: string): string`
  - `interface UtmbRanked { utmbId: number; uri: string; name: string; index: number | null; nationality: string | null; sex: 'M' | 'F' }`
  - `interface UtmbRunner extends UtmbRanked { website: string | null; team: string | null; results: BestFinish[]; finishes: number }`
  - `parseRanked(json: unknown): UtmbRanked[]`
  - `parseRunnerPage(html: string, uri: string): UtmbRunner | null`
  - `topRunners(sex: 'M' | 'F', n: number, get?: Getter): Promise<UtmbRanked[]>`
  - `utmbRunner(uri: string, get?: Getter): Promise<UtmbRunner | null>`
  - `findUtmb(name: string, get?: Getter): Promise<UtmbRanked | null>`
  - `type Getter = (url: string) => Promise<string | null>`

- [ ] **Step 1: Save trimmed fixtures from the live site**

```bash
cd ~/Developer/film-my-run-website && mkdir -p src/lib/runners/fixtures
curl -s -A "Mozilla/5.0" "https://utmb.world/en/runner/2704.kilian.jornetburgada" | python3 -c "
import re,json,sys
d=json.loads(re.search(r'<script id=\"__NEXT_DATA__\"[^>]*>(.*?)</script>',sys.stdin.read(),re.S).group(1))
p=d['props']['pageProps']
keep={k:p.get(k) for k in ['fullname','team','sponsor','website','nationality','nationalityCode','gender','performanceIndexes']}
rs=p['results']['results']
keep['results']={'results':[r for r in rs if not r['isDnf'] and r['time']][:6]+[r for r in rs if r['isDnf']][:1]}
print(json.dumps({'props':{'pageProps':keep}},ensure_ascii=False,indent=1))" > src/lib/runners/fixtures/utmb-runner.json
curl -s -A "Mozilla/5.0" "https://api.utmb.world/search/runners?category=general&sex=F&limit=3&offset=0&lang=en" > src/lib/runners/fixtures/utmb-ranked.json
python3 -c "import json;d=json.load(open('src/lib/runners/fixtures/utmb-runner.json'));print(d['props']['pageProps']['fullname'],len(d['props']['pageProps']['results']['results']))"
```

Expected: `Kilian JORNET BURGADA 7`

- [ ] **Step 2: Write the failing tests**

`src/lib/runners/utmb.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { displayName, findUtmb, parseRanked, parseRunnerPage } from './utmb';

const pageData = readFileSync(new URL('./fixtures/utmb-runner.json', import.meta.url), 'utf8');
const page = `<html><script id="__NEXT_DATA__" type="application/json">${pageData}</script></html>`;
const ranked = JSON.parse(readFileSync(new URL('./fixtures/utmb-ranked.json', import.meta.url), 'utf8'));

describe('UTMB names', () => {
  it('turn capital surnames into ordinary ones', () => {
    expect(displayName('Kilian JORNET BURGADA')).toBe('Kilian Jornet Burgada');
    expect(displayName("Jean-Philippe O'NEILL")).toBe("Jean-Philippe O'Neill");
    expect(displayName('Courtney DAUWALTER')).toBe('Courtney Dauwalter');
    expect(displayName('Ida NILSSON')).toBe('Ida Nilsson');
  });
});

describe('the ranked list', () => {
  it('gives id, uri, index, nationality and sex', () => {
    const r = parseRanked(ranked);
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ sex: 'F' });
    expect(typeof r[0].utmbId).toBe('number');
    expect(r[0].uri).toMatch(/^\d+\./);
    expect(r[0].name).not.toMatch(/[A-Z]{3,}/);
  });
  it('an empty or broken reply is an empty list', () => {
    expect(parseRanked(null)).toEqual([]);
    expect(parseRanked({ runners: 'x' })).toEqual([]);
  });
});

describe('a runner page', () => {
  it('reads the general index, website and finished results (no DNFs)', () => {
    const r = parseRunnerPage(page, '2704.kilian.jornetburgada')!;
    expect(r).toMatchObject({ utmbId: 2704, name: 'Kilian Jornet Burgada', index: 947, nationality: 'ES', sex: 'M', website: 'https://www.kilianjornetfoundation.org' });
    expect(r.results).toHaveLength(6);
    expect(r.results[0]).toMatchObject({ source: 'UTMB' });
    expect(r.results[0].race).toBeTruthy();
    expect(r.results[0].time).toMatch(/^\d\d:\d\d:\d\d$/);
    expect(r.results.every((x) => x.year >= 2000)).toBe(true);
  });
  it('a page without data, or without a general index, still parses safely', () => {
    expect(parseRunnerPage('<html></html>', '1.x')).toBeNull();
    const noIndex = page.replace('"index": 947', '"index": null');
    expect(parseRunnerPage(noIndex, '2704.kilian.jornetburgada')!.index).toBeNull();
  });
});

describe('finding a runner by name', () => {
  it('takes only an exact name match, accents and case aside', async () => {
    const reply = JSON.stringify({ runners: [
      { id: 1, fullname: 'Kilian JORNET', uri: '1.kilian.jornet', ip: 900, nationality: 'ES', sex: 'H' },
      { id: 2704, fullname: 'Kilian JORNET BURGADA', uri: '2704.kilian.jornetburgada', ip: 947, nationality: 'ES', sex: 'H' },
    ] });
    const get = async () => reply;
    expect((await findUtmb('Kilian Jornet Burgada', get))?.utmbId).toBe(2704);
    expect((await findUtmb('Kílian Jornet Burgada', get))?.utmbId).toBe(2704);
    expect(await findUtmb('Kilian Burgada', get)).toBeNull();
  });
});
```

- [ ] **Step 3: Run to see them fail**

Run: `npx vitest run src/lib/runners/utmb.test.ts`
Expected: FAIL, "Cannot find module './utmb'".

- [ ] **Step 4: Implement**

`src/lib/runners/utmb.ts`:

```ts
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
    .map((w) => (w === w.toUpperCase() && /\p{L}{2}/u.test(w) ? w.toLowerCase().replace(/(^|[-'’])(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase()) : w))
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
  return body ? parseRanked(JSON.parse(body)) : [];
}

export async function utmbRunner(uri: string, get: Getter = httpGet): Promise<UtmbRunner | null> {
  const html = await get(`https://utmb.world/en/runner/${uri}`);
  return html ? parseRunnerPage(html, uri) : null;
}

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** The UTMB entry whose name is exactly this one (accents and case aside); null otherwise. */
export async function findUtmb(name: string, get: Getter = httpGet): Promise<UtmbRanked | null> {
  const body = await get(`${API}?search=${encodeURIComponent(name)}&limit=10&lang=en`);
  if (!body) return null;
  const hits = parseRanked(JSON.parse(body)).filter((r) => plain(r.name) === plain(name));
  return hits.length === 1 ? hits[0] : null;
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/lib/runners/utmb.test.ts && npx tsc --noEmit`
Expected: PASS (6 tests). Race names read event then race ("Zegama-Aizkorri Mendi Maratoia"); a race named after its event keeps its own name ("Western States 100-Mile Endurance Run").

- [ ] **Step 6: Commit**

```bash
git add src/lib/runners/utmb.ts src/lib/runners/utmb.test.ts src/lib/runners/fixtures/utmb-*.json
git commit -m "Runners: UTMB ranked list, runner page and name search"
```

---

### Task 4: The Wikipedia reader

**Files:**
- Create: `src/lib/runners/wikipedia.ts`
- Test: `src/lib/runners/wikipedia.test.ts`

**Interfaces:**
- Consumes: `RunnerPhoto`, `Getter` (Tasks 1 and 3).
- Produces:
  - `wikipediaArticle(name: string, get?: Getter): Promise<{ title: string; url: string; text: string; image: RunnerPhoto | null } | null>`
  - `commonsLicence(fileTitle: string, get?: Getter): Promise<{ credit: string; licence: string | null } | null>`

- [ ] **Step 1: Write the failing tests**

`src/lib/runners/wikipedia.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { wikipediaArticle } from './wikipedia';

const summary = (type: string, extra: object = {}) => JSON.stringify({ type, title: 'Ann Trason', content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Ann_Trason' } }, ...extra });
const extract = JSON.stringify({ query: { pages: { '1': { extract: 'Ann Trason is an American ultramarathon runner. She won Western States 14 times.' } } } });
const licence = JSON.stringify({ query: { pages: { '-1': { imageinfo: [{ extmetadata: { Artist: { value: '<a href="//x">Jane Smith</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } } }] } } } });

function getter(map: Record<string, string>) {
  return async (url: string) => Object.entries(map).find(([k]) => url.includes(k))?.[1] ?? null;
}

describe('a Wikipedia article', () => {
  it('gives the plain text, page link and the lead photo with its licence', async () => {
    const get = getter({
      '/page/summary/': summary('standard', { originalimage: { source: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Ann_Trason_1994.jpg', width: 1200, height: 900 } }),
      'prop=extracts': extract,
      'prop=imageinfo': licence,
    });
    const a = (await wikipediaArticle('Ann Trason', get))!;
    expect(a.url).toBe('https://en.wikipedia.org/wiki/Ann_Trason');
    expect(a.text).toContain('Western States 14 times');
    expect(a.image).toMatchObject({ kind: 'portrait', credit: 'Photo: Jane Smith / Wikimedia Commons', licence: 'CC BY-SA 4.0', source_url: 'https://commons.wikimedia.org/wiki/File:Ann_Trason_1994.jpg' });
  });
  it('a disambiguation page or a missing article is no article', async () => {
    expect(await wikipediaArticle('David Roche', getter({ '/page/summary/': summary('disambiguation') }))).toBeNull();
    expect(await wikipediaArticle('Nobody Atall', getter({}))).toBeNull();
  });
  it('an article with no photo, or an unreadable licence, has no photo', async () => {
    const a = await wikipediaArticle('Ann Trason', getter({ '/page/summary/': summary('standard'), 'prop=extracts': extract }));
    expect(a!.image).toBeNull();
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/lib/runners/wikipedia.test.ts`
Expected: FAIL, "Cannot find module './wikipedia'".

- [ ] **Step 3: Implement**

`src/lib/runners/wikipedia.ts`:

```ts
import type { RunnerPhoto } from './types';
import { httpGet, type Getter } from './utmb';

const WIKI = 'https://en.wikipedia.org';
const COMMONS = 'https://commons.wikimedia.org';

const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** A Commons file's author and licence, or null when either can't be read. */
export async function commonsLicence(fileTitle: string, get: Getter = httpGet): Promise<{ credit: string; licence: string | null } | null> {
  const body = await get(`${COMMONS}/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=extmetadata&format=json`);
  if (!body) return null;
  const pages = JSON.parse(body)?.query?.pages ?? {};
  const meta = (Object.values(pages)[0] as { imageinfo?: { extmetadata?: Record<string, { value: string }> }[] })?.imageinfo?.[0]?.extmetadata;
  const artist = meta?.Artist?.value ? stripTags(meta.Artist.value) : '';
  if (!artist) return null;
  return { credit: `Photo: ${artist} / Wikimedia Commons`, licence: meta?.LicenseShortName?.value ?? null };
}

/**
 * The English Wikipedia article on a runner: plain text (to rewrite, never copy:
 * CC BY-SA), its link, and its lead photo when Commons says who took it.
 * A disambiguation page or no article at all is null.
 */
export async function wikipediaArticle(name: string, get: Getter = httpGet) {
  const title = encodeURIComponent(name.replace(/ /g, '_'));
  const sumBody = await get(`${WIKI}/api/rest_v1/page/summary/${title}?redirect=true`);
  if (!sumBody) return null;
  const sum = JSON.parse(sumBody);
  if (sum?.type !== 'standard') return null;
  const textBody = await get(`${WIKI}/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=${title}`);
  const text = textBody ? ((Object.values(JSON.parse(textBody)?.query?.pages ?? {})[0] as { extract?: string })?.extract ?? '') : '';
  if (!text) return null;
  let image: RunnerPhoto | null = null;
  const src: string | undefined = sum.originalimage?.source;
  if (src) {
    const file = `File:${decodeURIComponent(src.split('/').pop()!)}`;
    const lic = await commonsLicence(file, get);
    if (lic) image = { kind: 'portrait', url: src, credit: lic.credit, licence: lic.licence, source_url: `${COMMONS}/wiki/${file.replace(/ /g, '_')}` };
  }
  return { title: sum.title as string, url: sum.content_urls?.desktop?.page as string, text, image };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/runners/wikipedia.test.ts && npx tsc --noEmit`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/runners/wikipedia.ts src/lib/runners/wikipedia.test.ts
git commit -m "Runners: Wikipedia article text and Commons lead photo"
```

---

### Task 5: Gather and the save checks

**Files:**
- Create: `src/lib/runners/gather.ts`
- Create: `src/lib/runners/checks.ts`
- Test: `src/lib/runners/gather.test.ts`, `src/lib/runners/checks.test.ts`
- Create: `scripts/runners-gather.ts`
- Modify: `package.json` (scripts), `.gitignore` (add `runners-work/`)

**Interfaces:**
- Consumes:
  - `findUtmb`, `utmbRunner`, `Getter` (Task 3)
  - `wikipediaArticle` (Task 4)
  - `RunnerFile`, `AGENCY_CREDITS` (Task 1)
  - `ruleProblems`, `nearCopyPhrases` from `src/lib/news/rules.ts`
  - `slugBase` from `src/lib/news/plan.ts`
- Produces:
  - `gatherRunner(input: { name?: string; utmbUri?: string; era?: 'current' | 'historic' }, deps?: GatherDeps): Promise<RunnerFile | null>`
  - `interface GatherDeps { get: Getter; ourStories: (name: string) => Promise<{ title: string; url: string; text: string }[]> }`
  - `profileProblems(f: RunnerFile): string[]`, where empty means it can be saved

- [ ] **Step 1: Check the slug helper exists**

Run: `grep -n "export function slugBase" src/lib/news/plan.ts`
Expected: one line, `export function slugBase(title: string): string`. If its signature differs, use it as it is and note that in the report.

- [ ] **Step 2: Write the failing tests**

`src/lib/runners/checks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { profileProblems } from './checks';
import type { RunnerFile } from './types';

const base = (over: Partial<RunnerFile> = {}): RunnerFile => ({
  slug: 'ann-trason', name: 'Ann Trason', aliases: [], nationality: 'US', sex: 'F', birthYear: 1960,
  disciplines: ['trail_ultra'], era: 'historic', utmb: null,
  texts: [{ source: { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Ann_Trason' }, text: 'Ann Trason won the Western States Endurance Run fourteen times between 1989 and 2003.' }],
  results: [], photoCandidates: [],
  bio: ['Ann Trason is the most successful woman in the history of Western States.', 'She won it fourteen times.', 'Her record stood for years.'],
  bestFinishes: [{ race: 'Western States 100', year: 1994, distance: '161 km', time: '17:37:51', position: '1st woman', source: 'Wikipedia' }],
  photos: [], sources: [{ name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Ann_Trason' }],
  ...over,
});

describe('the save checks', () => {
  it('a sound profile passes', () => {
    expect(profileProblems(base())).toEqual([]);
  });
  it('3 to 5 paragraphs, no em dash, no semicolon', () => {
    expect(profileProblems(base({ bio: ['One.', 'Two.'] }))).toContain('2 paragraphs (3-5)');
    expect(profileProblems(base({ bio: ['a', 'b', 'c', 'd', 'e', 'f'] }))).toContain('6 paragraphs (3-5)');
    expect(profileProblems(base({ bio: ['A — b.', 'Two.', 'Three.'] }))).toContain('em dash');
  });
  it('a near-copy of a source is refused', () => {
    expect(profileProblems(base({ bio: ['Ann Trason won the Western States Endurance Run fourteen times between 1989 and 2003.', 'Two.', 'Three.'] }))).toContain('near-copy of a source');
  });
  it('every best finish names a source the profile lists', () => {
    const f = base({ bestFinishes: [{ race: 'Comrades', year: 1996, distance: null, time: null, position: '1st woman', source: 'Runner’s World' }] });
    expect(profileProblems(f)).toContain('best finish "Comrades 1996" cites Runner’s World, not a listed source');
  });
  it('photos: at most one of each kind, credited, sourced, and never an agency', () => {
    const p = (over: object = {}) => ({ kind: 'portrait' as const, url: 'https://x/y.jpg', credit: 'Photo: Jane Smith / iRunFar', licence: null, source_url: 'https://irunfar.com/a', ...over });
    expect(profileProblems(base({ photos: [p()] }))).toEqual([]);
    expect(profileProblems(base({ photos: [p(), p()] }))).toContain('two portrait photos');
    expect(profileProblems(base({ photos: [p({ credit: 'Photo: Getty Images' })] }))).toContain('agency photo (portrait): Photo: Getty Images');
    expect(profileProblems(base({ photos: [p({ credit: 'Photo: PA Wire / PA Images' })] }))).toContain('agency photo (portrait): Photo: PA Wire / PA Images');
    expect(profileProblems(base({ photos: [p({ credit: '' })] }))).toContain('portrait photo has no credit');
    expect(profileProblems(base({ photos: [p({ source_url: '' })] }))).toContain('portrait photo has no source page');
  });
  it('a profile needs a name, a slug and at least one source', () => {
    expect(profileProblems(base({ sources: [] }))).toContain('no sources');
  });
});
```

`src/lib/runners/gather.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { gatherRunner } from './gather';

const utmbSearch = JSON.stringify({ runners: [{ id: 99, fullname: 'Ruth CROFT', uri: '99.ruth.croft', ip: 920, nationality: 'NZ', sex: 'F' }] });
const utmbPage = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { fullname: 'Ruth CROFT', nationalityCode: 'NZ', gender: 'F', website: '', team: 'Adidas', performanceIndexes: [{ piCategory: 'general', index: 920 }], results: { results: [{ dateIso: '2025-08-29', race: 'CCC 2025', eventName: 'UTMB Mont-Blanc', raceName: 'CCC', distance: '100.3', elevationGain: 6100, time: '11:10:00', isDnf: false, rank: 20, rankGender: 1 }] } } } })}</script>`;

const get = (map: Record<string, string | null>) => async (url: string) => Object.entries(map).find(([k]) => url.includes(k))?.[1] ?? null;
const none = async () => [];

describe('gathering a runner', () => {
  it('a current trail runner: UTMB entry, results and our stories as sources', async () => {
    const f = (await gatherRunner({ name: 'Ruth Croft' }, {
      get: get({ 'search=': utmbSearch, '/en/runner/99.ruth.croft': utmbPage }),
      ourStories: async () => [{ title: 'Croft wins CCC', url: 'https://filmmyrun.com/news/croft-wins-ccc', text: 'Ruth Croft won the CCC.' }],
    }))!;
    expect(f).toMatchObject({ slug: 'ruth-croft', name: 'Ruth Croft', nationality: 'NZ', sex: 'F', era: 'current', utmb: { id: 99, index: 920 } });
    expect(f.disciplines).toEqual(['trail_ultra']);
    expect(f.results[0]).toMatchObject({ race: 'UTMB Mont-Blanc CCC', year: 2025, position: '1st woman', source: 'UTMB' });
    expect(f.texts.map((t) => t.source.name)).toEqual(['UTMB', 'Film My Run']);
  });
  it('nobody found anywhere is null (no page is made)', async () => {
    expect(await gatherRunner({ name: 'Nobody Atall' }, { get: get({}), ourStories: none })).toBeNull();
  });
});
```

- [ ] **Step 3: Run to see them fail**

Run: `npx vitest run src/lib/runners/checks.test.ts src/lib/runners/gather.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement the checks**

`src/lib/runners/checks.ts`:

```ts
import { ruleProblems } from '@/lib/news/rules';
import { AGENCY_CREDITS, type RunnerFile } from './types';

/** Everything code checks before a profile is saved. Empty means it can be published. */
export function profileProblems(f: RunnerFile): string[] {
  const problems: string[] = [];
  if (!f.name.trim() || !f.slug.trim()) problems.push('no name or slug');
  const bio = (f.bio ?? []).map((p) => p.trim()).filter(Boolean);
  const paragraphs = bio.filter((p) => !p.startsWith('* '));
  if (paragraphs.length < 3 || paragraphs.length > 5) problems.push(`${paragraphs.length} paragraphs (3-5)`);
  // The news rules on the bio as a draft: punctuation and near-copy. Its own 3-6 count is replaced by 3-5 above.
  const texts = f.texts.map((t) => t.text);
  for (const p of ruleProblems({ title: f.name, excerpt: f.name, paragraphs: bio }, texts)) if (!/paragraphs \(3-6\)|no body/.test(p)) problems.push(p);
  const sources = f.sources ?? [];
  if (sources.length === 0) problems.push('no sources');
  const names = new Set(sources.map((s) => s.name));
  for (const b of f.bestFinishes ?? []) {
    if (!names.has(b.source)) problems.push(`best finish "${b.race} ${b.year}" cites ${b.source}, not a listed source`);
  }
  const photos = f.photos ?? [];
  for (const kind of ['portrait', 'action'] as const) {
    const of = photos.filter((p) => p.kind === kind);
    if (of.length > 1) problems.push(`two ${kind} photos`);
    for (const p of of) {
      if (!p.credit.trim()) problems.push(`${kind} photo has no credit`);
      if (!p.source_url.trim()) problems.push(`${kind} photo has no source page`);
      if (AGENCY_CREDITS.test(p.credit)) problems.push(`agency photo (${kind}): ${p.credit}`);
    }
  }
  return problems;
}
```

- [ ] **Step 5: Implement gather**

`src/lib/runners/gather.ts`:

```ts
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
```

- [ ] **Step 6: The CLI**

`scripts/runners-gather.ts`:

```ts
// Collects everything on a runner into runners-work/<slug>.json for a session to write from.
//
// Run:   npm run runners:gather -- "Ann Trason" [--historic]
//        npm run runners:gather -- --utmb 2704.kilian.jornetburgada
//        npm run runners:gather -- --top 50        (the top 50 women and 50 men by UTMB index, one file each)
import { mkdir, writeFile } from 'node:fs/promises';
import { prisma } from '@/lib/db';
import { gatherRunner } from '@/lib/runners/gather';
import { topRunners } from '@/lib/runners/utmb';

const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

async function one(input: { name?: string; utmbUri?: string; era?: 'current' | 'historic' }) {
  const f = await gatherRunner(input);
  if (!f) { console.log(`NOT FOUND: ${input.name ?? input.utmbUri} (no UTMB entry, no Wikipedia article)`); return; }
  await writeFile(`runners-work/${f.slug}.json`, JSON.stringify(f, null, 2));
  console.log(`${f.slug}: ${f.texts.map((t) => t.source.name).join(', ')}; ${f.results.length} results; ${f.photoCandidates.length} photo candidates`);
}

(async () => {
  await mkdir('runners-work', { recursive: true });
  const top = flag('--top');
  if (top) {
    for (const sex of ['F', 'M'] as const) for (const r of await topRunners(sex, Number(top))) await one({ utmbUri: r.uri });
  } else if (flag('--utmb')) {
    await one({ utmbUri: flag('--utmb') });
  } else {
    const name = args.find((a) => !a.startsWith('--'));
    if (!name) throw new Error('Usage: npm run runners:gather -- "Name" [--historic] | --utmb <uri> | --top N');
    await one({ name, era: args.includes('--historic') ? 'historic' : 'current' });
  }
  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => { console.error(e); await prisma.$disconnect().catch(() => {}); process.exit(1); });
```

In `package.json` scripts, after `"news:story"`, add:

```json
"runners:gather": "tsx --tsconfig tsconfig.json scripts/runners-gather.ts",
"runners:save": "tsx --tsconfig tsconfig.json scripts/runners-save.ts",
"runners:photo": "tsx --tsconfig tsconfig.json scripts/runners-photo.ts"
```

(Add a trailing comma to the `news:story` line.) Append `runners-work/` to `.gitignore`.

- [ ] **Step 7: Run the tests and a live gather**

Run: `npx vitest run src/lib/runners && npx tsc --noEmit`
Expected: PASS for all runner tests. (`runners-save.ts` and `runners-photo.ts` don't exist yet. `tsx` only fails when those scripts are run, and tsc doesn't check package.json.)

Run: `npx tsx --env-file=.env --tsconfig tsconfig.json scripts/runners-gather.ts "Ann Trason" --historic`
Expected: `ann-trason: Wikipedia; 0 results; 1 photo candidates` (or 0 candidates if the article has no Commons lead image), and `runners-work/ann-trason.json` exists.

- [ ] **Step 8: Commit**

```bash
git add src/lib/runners/gather.ts src/lib/runners/gather.test.ts src/lib/runners/checks.ts src/lib/runners/checks.test.ts scripts/runners-gather.ts package.json .gitignore
git commit -m "Runners: gather a runner's sources, and the save checks"
```

---

### Task 6: Save and photo commands

**Files:**
- Create: `src/lib/runners/save.ts`
- Test: `src/lib/runners/save.test.ts`
- Create: `scripts/runners-save.ts`, `scripts/runners-photo.ts`

**Interfaces:**
- Consumes: `profileProblems` (Task 5), `RunnerFile` and `RunnerPhoto` (Task 1), `uploadToR2` from `@/lib/r2`, `sharp`.
- Produces:
  - `storePhoto(p: RunnerPhoto, slug: string, deps?: PhotoDeps): Promise<RunnerPhoto>`, which returns the photo with its R2 `url`
  - `saveRunner(f: RunnerFile, writtenBy: 'session' | 'auto', deps?: SaveDeps): Promise<{ slug: string }>`, which throws when `profileProblems` is non-empty
  - `bioHtml(paragraphs: string[]): string`

- [ ] **Step 1: Write the failing tests**

`src/lib/runners/save.test.ts`:

```ts
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { bioHtml, storePhoto } from './save';

describe('the bio HTML', () => {
  it('escapes and wraps each paragraph', () => {
    expect(bioHtml(['A & B <c>', 'Two.'])).toBe('<p>A &amp; B &lt;c&gt;</p>\n<p>Two.</p>');
  });
});

describe('storing a photo', () => {
  it('downloads, resizes to webp and uploads under runners/<slug>-<kind>.webp', async () => {
    const jpg = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#888' } }).jpeg().toBuffer();
    const upload = vi.fn(async (key: string) => `https://r2/${key}`);
    const fetchFn = vi.fn(async () => new Response(jpg, { headers: { 'content-type': 'image/jpeg' } }));
    const out = await storePhoto({ kind: 'action', url: 'https://x/y.jpg', credit: 'Photo: A', licence: null, source_url: 'https://x' }, 'ruth-croft', { fetch: fetchFn as unknown as typeof fetch, upload });
    expect(out.url).toBe('https://r2/runners/ruth-croft-action.webp');
    const [, body, type] = upload.mock.calls[0] as unknown as [string, Buffer, string];
    expect(type).toBe('image/webp');
    expect((await sharp(body).metadata()).width).toBe(1600);
  });
  it('a photo already on R2 is left as it is', async () => {
    const upload = vi.fn();
    const p = { kind: 'portrait' as const, url: `${process.env.R2_PUBLIC_URL ?? 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev'}/runners/x-portrait.webp`, credit: 'Photo: A', licence: null, source_url: 'https://x' };
    expect(await storePhoto(p, 'x', { upload })).toEqual(p);
    expect(upload).not.toHaveBeenCalled();
  });
  it('a download that is not an image throws, naming the URL', async () => {
    const fetchFn = async () => new Response('<html>', { headers: { 'content-type': 'text/html' } });
    await expect(storePhoto({ kind: 'action', url: 'https://x/page', credit: 'Photo: A', licence: null, source_url: 'https://x' }, 's', { fetch: fetchFn as unknown as typeof fetch, upload: vi.fn() })).rejects.toThrow('https://x/page');
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/lib/runners/save.test.ts`
Expected: FAIL, "Cannot find module './save'".

- [ ] **Step 3: Implement**

`src/lib/runners/save.ts`:

```ts
import sharp from 'sharp';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { uploadToR2 } from '@/lib/r2';
import { profileProblems } from './checks';
import type { RunnerFile, RunnerPhoto } from './types';

const R2_PUBLIC = process.env.R2_PUBLIC_URL ?? 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev';
const esc = (p: string) => p.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);

export const bioHtml = (paragraphs: string[]) => paragraphs.map((p) => `<p>${esc(p.trim())}</p>`).join('\n');

export interface PhotoDeps { fetch?: typeof fetch; upload?: (key: string, body: Buffer, type: string) => Promise<string> }

/** Copies a photo to R2 (never hotlinked): at most 1600 px wide, webp. */
export async function storePhoto(p: RunnerPhoto, slug: string, deps: PhotoDeps = {}): Promise<RunnerPhoto> {
  if (p.url.startsWith(`${R2_PUBLIC}/runners/`)) return p;
  const res = await (deps.fetch ?? fetch)(p.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FilmMyRunBot/1.0; +https://filmmyrun.com)' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) throw new Error(`Not an image: ${p.url}`);
  const body = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const url = await (deps.upload ?? uploadToR2)(`runners/${slug}-${p.kind}.webp`, body, 'image/webp');
  return { ...p, url };
}

/** Checks, stores the photos and publishes (insert or update by slug). */
export async function saveRunner(f: RunnerFile, writtenBy: 'session' | 'auto', deps: PhotoDeps = {}): Promise<{ slug: string }> {
  const problems = profileProblems(f);
  if (problems.length) throw new Error(`Not saved, ${f.slug}: ${problems.join('; ')}`);
  const photos: RunnerPhoto[] = [];
  for (const p of f.photos ?? []) photos.push(await storePhoto(p, f.slug, deps));
  const data = {
    name: f.name, aliases: f.aliases, nationality: f.nationality, sex: f.sex, birth_year: f.birthYear,
    disciplines: f.disciplines, era: f.era, bio: bioHtml(f.bio ?? []),
    best_finishes: (f.bestFinishes ?? []) as unknown as Prisma.InputJsonValue,
    sources: (f.sources ?? []) as unknown as Prisma.InputJsonValue,
    photos: photos as unknown as Prisma.InputJsonValue,
    utmb_id: f.utmb?.id ?? null, utmb_uri: f.utmb?.uri ?? null, utmb_index: f.utmb?.index ?? null,
    utmb_index_at: f.utmb ? new Date() : null,
    status: 'published', written_by: writtenBy, bio_checked_at: new Date(),
  };
  await prisma.runners.upsert({ where: { slug: f.slug }, create: { slug: f.slug, ...data }, update: data });
  return { slug: f.slug };
}
```

- [ ] **Step 4: The CLIs**

`scripts/runners-save.ts`:

```ts
// Publishes a runner from a work file a session has filled in (bio, bestFinishes, photos, sources).
//
// Run:   npm run runners:save -- runners-work/ann-trason.json
import { readFile } from 'node:fs/promises';
import { prisma } from '@/lib/db';
import { saveRunner } from '@/lib/runners/save';
import type { RunnerFile } from '@/lib/runners/types';

(async () => {
  const path = process.argv[2];
  if (!path) throw new Error('Usage: npm run runners:save -- runners-work/<slug>.json');
  const f = JSON.parse(await readFile(path, 'utf8')) as RunnerFile;
  const { slug } = await saveRunner(f, 'session');
  console.log(`PUBLISHED: https://filmmyrun.com/runners/${slug}`);
  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect().catch(() => {}); process.exit(1); });
```

`scripts/runners-photo.ts`:

```ts
// Takes a photo off a runner's page (a takedown or an invoice): the branded card shows instead.
//
// Run:   npm run runners:photo -- <slug> --remove portrait|action
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { RunnerPhoto } from '@/lib/runners/types';

(async () => {
  const [slug, flag, kind] = process.argv.slice(2);
  if (!slug || flag !== '--remove' || !['portrait', 'action'].includes(kind)) throw new Error('Usage: npm run runners:photo -- <slug> --remove portrait|action');
  const r = await prisma.runners.findUnique({ where: { slug } });
  if (!r) throw new Error(`No runner ${slug}`);
  const photos = (r.photos as unknown as RunnerPhoto[]).filter((p) => p.kind !== kind);
  await prisma.runners.update({ where: { slug }, data: { photos: photos as unknown as Prisma.InputJsonValue } });
  console.log(`Removed the ${kind} photo from ${slug}. The R2 file stays (nothing links it).`);
  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect().catch(() => {}); process.exit(1); });
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/lib/runners && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/runners/save.ts src/lib/runners/save.test.ts scripts/runners-save.ts scripts/runners-photo.ts
git commit -m "Runners: save (checks, photos to R2, publish) and photo removal"
```

---

### Task 7: The pages, sitemap and footer

**Files:**
- Create: `src/app/runners/page.tsx`, `src/app/runners/RunnersList.tsx`, `src/app/runners/[slug]/page.tsx`
- Create: `src/lib/runners/flag.ts` (no server imports: the client list uses it), `src/lib/runners/present.ts`, `src/lib/runners/present.test.ts`
- Modify: `src/app/sitemap.ts`, `src/components/layout/Footer.tsx`, `src/app/news/page.tsx`

**Interfaces:**
- Consumes: the `runners` model, `loadNameIndex` and `mentionedSlugs` (Task 2), `sanitizeContent` from `@/lib/sanitize`, the `BestFinish`/`RunnerPhoto`/`RunnerSource` types.
- Produces:
  - `flagEmoji(iso2: string | null): string` (in `flag.ts`)
  - `personJsonLd(r: { name: string; slug: string; nationality: string | null; photos: RunnerPhoto[]; bioText: string; sameAs: string[] }): object`
  - `storiesAbout(slug: string): Promise<{ slug: string; title: string; imageUrl: string | null; publishedAt: string }[]>`, used by the runner page and by Task 8

- [ ] **Step 1: Write the failing tests**

`src/lib/runners/present.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { flagEmoji } from './flag';
import { personJsonLd } from './present';

describe('page helpers', () => {
  it('a flag from an ISO code, nothing without one', () => {
    expect(flagEmoji('GB')).toBe('🇬🇧');
    expect(flagEmoji('es')).toBe('🇪🇸');
    expect(flagEmoji(null)).toBe('');
    expect(flagEmoji('XYZ')).toBe('');
  });
  it('Person JSON-LD with nationality, photo and source links', () => {
    const ld = personJsonLd({ name: 'Ruth Croft', slug: 'ruth-croft', nationality: 'NZ', photos: [{ kind: 'portrait', url: 'https://r2/p.webp', credit: 'Photo: A', licence: null, source_url: 'https://x' }], bioText: 'Ruth Croft is a New Zealand trail runner.', sameAs: ['https://utmb.world/en/runner/99.ruth.croft'] }) as Record<string, unknown>;
    expect(ld).toMatchObject({ '@type': 'Person', name: 'Ruth Croft', url: 'https://filmmyrun.com/runners/ruth-croft', nationality: 'NZ', image: 'https://r2/p.webp', sameAs: ['https://utmb.world/en/runner/99.ruth.croft'] });
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/lib/runners/present.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the helpers**

`src/lib/runners/flag.ts` (kept apart: `RunnersList` is a client component and must not import Prisma):

```ts
export function flagEmoji(iso2: string | null): string {
  if (!iso2 || !/^[a-z]{2}$/i.test(iso2)) return '';
  return String.fromCodePoint(...[...iso2.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
```

`src/lib/runners/present.ts`:

```ts
import { prisma } from '@/lib/db';
import { loadNameIndex, mentionedSlugs } from './names';
import type { RunnerPhoto } from './types';

export function personJsonLd(r: { name: string; slug: string; nationality: string | null; photos: RunnerPhoto[]; bioText: string; sameAs: string[] }) {
  const photo = r.photos.find((p) => p.kind === 'portrait') ?? r.photos[0];
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: r.name,
    url: `https://filmmyrun.com/runners/${r.slug}`,
    description: r.bioText.slice(0, 300),
    ...(r.nationality ? { nationality: r.nationality } : {}),
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
export async function storiesAbout(slug: string) {
  const index = await loadNameIndex();
  const names = [...index.entries()].filter(([, s]) => s === slug).map(([n]) => n);
  if (!names.length) return [];
  const rows = await prisma.news_stories.findMany({
    where: { status: 'published', OR: names.map((n) => ({ content: { contains: n.split(' ').pop()! } })) },
    select: { slug: true, title: true, image_url: true, content: true, published_at: true, created_at: true },
    orderBy: { published_at: 'desc' },
  });
  return rows
    .filter((r) => mentionedSlugs(r.content, index).has(slug))
    .map((r) => ({ slug: r.slug, title: r.title, imageUrl: r.image_url, publishedAt: (r.published_at ?? r.created_at).toISOString() }));
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/runners/present.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: The runner page**

`src/app/runners/[slug]/page.tsx`. Follow the structure of `src/app/news/[slug]/page.tsx`: Header, Footer, breadcrumb JSON-LD, the `container` class, and the `text-foreground`/`text-secondary`/`border-border` tokens.

```tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { prisma } from '@/lib/db';
import { sanitizeContent } from '@/lib/sanitize';
import { flagEmoji } from '@/lib/runners/flag';
import { personJsonLd, storiesAbout } from '@/lib/runners/present';
import type { BestFinish, RunnerPhoto, RunnerSource } from '@/lib/runners/types';

export const dynamic = 'force-dynamic';

const DISCIPLINE: Record<string, string> = { trail_ultra: 'Trail & Ultra', road: 'Road', track: 'Track' };

async function getRunner(slug: string) {
  const r = await prisma.runners.findUnique({ where: { slug } });
  if (!r || r.status !== 'published') return null;
  return {
    slug: r.slug, name: r.name, nationality: r.nationality, disciplines: r.disciplines, era: r.era,
    bio: r.bio, bestFinishes: r.best_finishes as unknown as BestFinish[], sources: r.sources as unknown as RunnerSource[],
    photos: r.photos as unknown as RunnerPhoto[], utmbIndex: r.utmb_index, utmbIndexAt: r.utmb_index_at?.toISOString() ?? null,
    utmbUri: r.utmb_uri,
  };
}

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const r = await getRunner((await params).slug);
  if (!r) return { title: 'Runner not found' };
  const description = r.bio.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155);
  const image = (r.photos.find((p) => p.kind === 'portrait') ?? r.photos[0])?.url;
  return {
    title: `${r.name}: runner profile and results`,
    description,
    alternates: { canonical: `https://filmmyrun.com/runners/${r.slug}` },
    openGraph: { title: r.name, description, type: 'profile', images: image ? [image] : [] },
  };
}

function Card({ name, flag, index }: { name: string; flag: string; index: number | null }) {
  return (
    <div className="aspect-[4/5] w-full rounded-2xl bg-zinc-900 text-white flex flex-col justify-end p-6 border-b-8 border-[#f88c00]">
      <span className="text-4xl">{flag}</span>
      <span className="font-display text-3xl font-bold mt-2">{name}</span>
      {index !== null && <span className="text-[#f88c00] mt-1 tabular-nums">UTMB Index {index}</span>}
      <span className="text-xs text-zinc-400 mt-4">Film My Run</span>
    </div>
  );
}

export default async function RunnerPage({ params }: PageProps) {
  const { slug } = await params;
  const r = await getRunner(slug);
  if (!r) notFound();
  const stories = await storiesAbout(slug);
  const portrait = r.photos.find((p) => p.kind === 'portrait');
  const action = r.photos.find((p) => p.kind === 'action');
  const flag = flagEmoji(r.nationality);
  const url = `https://filmmyrun.com/runners/${r.slug}`;
  const person = personJsonLd({ name: r.name, slug: r.slug, nationality: r.nationality, photos: r.photos, bioText: r.bio.replace(/<[^>]+>/g, ' '), sameAs: r.sources.map((s) => s.url).filter((u) => !u.includes('filmmyrun.com')) });
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://filmmyrun.com' },
    { '@type': 'ListItem', position: 2, name: 'Runners', item: 'https://filmmyrun.com/runners' },
    { '@type': 'ListItem', position: 3, name: r.name, item: url },
  ] };

  return (
    <>
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, '\\u003c') }} />
      <main className="pt-24 lg:pt-32 pb-16 bg-background">
        <div className="container max-w-5xl">
          <nav className="text-sm text-secondary mb-6"><Link href="/runners" className="hover:text-[#f88c00]">Runners</Link> / {r.name}</nav>
          <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
            <div>
              {portrait ? (
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={portrait.url} alt={r.name} className="w-full aspect-[4/5] object-cover rounded-2xl" />
                  <figcaption className="text-xs text-secondary mt-2">{portrait.credit}</figcaption>
                </figure>
              ) : <Card name={r.name} flag={flag} index={r.utmbIndex} />}
            </div>
            <div>
              <h1 className="font-display text-4xl lg:text-5xl font-bold text-foreground text-balance">{flag} {r.name}</h1>
              <p className="text-secondary mt-2">{r.disciplines.map((d) => DISCIPLINE[d] ?? d).join(' · ')}{r.era === 'historic' ? ' · Legend' : ''}</p>
              {r.utmbIndex !== null && r.utmbIndexAt && (
                <p className="mt-4 text-lg tabular-nums"><span className="font-bold text-[#f88c00]">UTMB Index {r.utmbIndex}</span> <span className="text-sm text-secondary">as of {new Date(r.utmbIndexAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
              )}
              <div className="prose dark:prose-invert mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeContent(r.bio) }} />
            </div>
          </div>

          {action && (
            <figure className="mt-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={action.url} alt={`${r.name} racing`} className="w-full max-h-[560px] object-cover rounded-2xl" />
              <figcaption className="text-xs text-secondary mt-2">{action.credit}</figcaption>
            </figure>
          )}

          {r.bestFinishes.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">Best finishes</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead><tr className="text-left text-secondary border-b border-border"><th className="py-2 pr-4">Year</th><th className="py-2 pr-4">Race</th><th className="py-2 pr-4">Distance</th><th className="py-2 pr-4">Time</th><th className="py-2">Place</th></tr></thead>
                  <tbody>
                    {r.bestFinishes.map((b, i) => (
                      <tr key={i} className="border-b border-border/50"><td className="py-2 pr-4">{b.year}</td><td className="py-2 pr-4">{b.race}</td><td className="py-2 pr-4">{b.distance ?? ''}</td><td className="py-2 pr-4">{b.time ?? ''}</td><td className="py-2">{b.position ?? ''}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {stories.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">In the news</h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {stories.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/news/${s.slug}`} className="flex gap-4 items-center group">
                      {s.imageUrl && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={s.imageUrl} alt="" className="w-28 aspect-video object-cover rounded-lg shrink-0" />)}
                      <span>
                        <span className="block text-xs text-secondary">{new Date(s.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="font-semibold text-foreground group-hover:text-[#f88c00]">{s.title}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-12 text-sm text-secondary">
            <p>Sources: {r.sources.map((s, i) => (<span key={s.url}>{i ? ', ' : ''}<a href={s.url} rel="nofollow noopener" target="_blank" className="underline hover:text-[#f88c00]">{s.name}</a></span>))}</p>
            {r.photos.length > 0 && <p className="mt-2">Photographer? Ask us to remove or change a photo: news@filmmyrun.com</p>}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 6: The index page**

`src/app/runners/page.tsx`:

```tsx
import { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { prisma } from '@/lib/db';
import RunnersList from './RunnersList';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Runners: profiles, results and UTMB Index',
  description: 'Profiles of the best trail, ultra, road and track runners: short biographies, best finishes and the current UTMB Index.',
  alternates: { canonical: 'https://filmmyrun.com/runners' },
};

export default async function RunnersPage() {
  const rows = await prisma.runners.findMany({
    where: { status: 'published' },
    select: { slug: true, name: true, nationality: true, disciplines: true, era: true, utmb_index: true, photos: true },
    orderBy: [{ utmb_index: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
  });
  const runners = rows.map((r) => ({
    slug: r.slug, name: r.name, nationality: r.nationality, disciplines: r.disciplines, era: r.era, utmbIndex: r.utmb_index,
    photo: ((r.photos as unknown as { kind: string; url: string }[]).find((p) => p.kind === 'portrait') ?? null)?.url ?? null,
  }));
  return (
    <>
      <Header />
      <main className="pt-24 lg:pt-32 pb-16 bg-background">
        <div className="container">
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-foreground">Runners</h1>
          <p className="text-secondary mt-3 max-w-2xl">The runners we write about. Short biographies, their best finishes and, for trail runners, the current UTMB Index.</p>
          <RunnersList runners={runners} />
        </div>
      </main>
      <Footer />
    </>
  );
}
```

`src/app/runners/RunnersList.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { flagEmoji } from '@/lib/runners/flag';

interface Row { slug: string; name: string; nationality: string | null; disciplines: string[]; era: string; utmbIndex: number | null; photo: string | null }
const FILTERS: [string, string][] = [['all', 'All'], ['trail_ultra', 'Trail & Ultra'], ['road', 'Road'], ['track', 'Track']];

export default function RunnersList({ runners }: { runners: Row[] }) {
  const [q, setQ] = useState('');
  const [d, setD] = useState('all');
  const match = (r: Row) => (d === 'all' || r.disciplines.includes(d)) && r.name.toLowerCase().includes(q.trim().toLowerCase());
  const current = runners.filter((r) => r.era === 'current' && match(r));
  const legends = runners.filter((r) => r.era === 'historic' && match(r));
  const grid = (rows: Row[]) => (
    <ul className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mt-6">
      {rows.map((r) => (
        <li key={r.slug}>
          <Link href={`/runners/${r.slug}`} className="block group">
            {r.photo
              ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={r.photo} alt="" className="w-full aspect-[4/5] object-cover rounded-xl" />)
              : <div className="w-full aspect-[4/5] rounded-xl bg-zinc-900 border-b-4 border-[#f88c00] flex items-end p-3 text-white font-display font-bold">{r.name}</div>}
            <span className="block mt-2 font-semibold text-foreground group-hover:text-[#f88c00]">{flagEmoji(r.nationality)} {r.name}</span>
            {r.utmbIndex !== null && <span className="block text-sm text-secondary tabular-nums">UTMB Index {r.utmbIndex}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3 items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search runners" aria-label="Search runners" className="px-4 py-2 rounded-lg border border-border bg-background text-foreground w-full sm:w-64" />
        {FILTERS.map(([k, label]) => (
          <button key={k} onClick={() => setD(k)} className={`px-3 py-1.5 rounded-full text-sm border ${d === k ? 'bg-[#f88c00] border-[#f88c00] text-white' : 'border-border text-foreground'}`}>{label}</button>
        ))}
      </div>
      {current.length > 0 && grid(current)}
      {legends.length > 0 && (<><h2 className="font-display text-2xl font-bold text-foreground mt-12">Legends</h2>{grid(legends)}</>)}
      {current.length + legends.length === 0 && <p className="mt-8 text-secondary">No runners match.</p>}
    </>
  );
}
```

- [ ] **Step 7: Sitemap, footer, news page link**

In `src/app/sitemap.ts`:
- Add `{ route: '/runners', changeFrequency: 'weekly', priority: 0.7 },` to `staticPages`.
- After the news stories block, add the block below, and include `...runnerRoutes` in the returned array next to the news routes.

```ts
  let runnerRoutes: MetadataRoute.Sitemap = [];
  try {
    const runners = await prisma.runners.findMany({ where: { status: 'published' }, select: { slug: true, updated_at: true } });
    runnerRoutes = runners.map((r) => ({ url: `${baseUrl}/runners/${r.slug}`, lastModified: r.updated_at, changeFrequency: 'weekly' as const, priority: 0.6 }));
  } catch (error) {
    console.error('sitemap: failed to load runners', error);
  }
```

In `src/components/layout/Footer.tsx`, find the list the "News" link sits in (`grep -n "News" src/components/layout/Footer.tsx`) and add a sibling entry `{ name: 'Runners', href: '/runners' }` (or the equivalent JSX in that list's own style) directly after News.

In `src/app/news/page.tsx`, under the page intro paragraph in the hero, add:

```tsx
<p className="mt-3 text-sm"><a href="/runners" className="underline hover:text-[#f88c00]">Runner profiles: bios, best finishes and UTMB Index</a></p>
```

- [ ] **Step 8: Type-check, test, build**

Run: `npx vitest run src/lib/runners && npx tsc --noEmit && npm run build 2>&1 | grep -E "runners|error" | head`
Expected: tests PASS. The build lists `ƒ /runners` and `ƒ /runners/[slug]` (dynamic, not `○`), and there are no errors.

- [ ] **Step 9: Commit, push, verify the migration ran**

```bash
git add src/app/runners src/lib/runners/flag.ts src/lib/runners/present.ts src/lib/runners/present.test.ts src/app/sitemap.ts src/components/layout/Footer.tsx src/app/news/page.tsx
git commit -m "Runners: /runners and /runners/[slug] pages, sitemap, footer and news links"
git stash push -q BLOG-WRITING-INSTRUCTIONS.md; git pull -q --rebase origin main; git stash pop -q; git push -q origin main
```

Wait for the deploy using Monitor with an until-loop: `until curl -s -o /dev/null -w "%{http_code}" https://filmmyrun.com/runners | grep -q 200; do sleep 30; done`
Expected: `/runners` returns 200 and shows "Runners" (empty list). That also proves the migration ran, since the page queries the table.

---

### Task 8: Links in news stories

**Files:**
- Modify: `src/app/news/[slug]/page.tsx` (the `dangerouslySetInnerHTML` on the story body, around line 215)
- Modify: `src/app/globals.css` (or the site's global stylesheet; check with `grep -rn "prose" src/app/globals.css | head -3`)

**Interfaces:**
- Consumes: `loadNameIndex` and `linkRunners` (Task 2).

- [ ] **Step 1: Link at render time**

In `src/app/news/[slug]/page.tsx`, add the import `import { linkRunners, loadNameIndex } from '@/lib/runners/names';`. In `NewsStoryPage`, after `const relatedStories = ...`, add:

```ts
  // Runner names link to their profiles when the page is shown; the stored story never changes.
  const runnerIndex = await loadNameIndex().catch(() => new Map<string, string>());
```

Change the body to:

```tsx
dangerouslySetInnerHTML={{ __html: linkRunners(sanitizeContent(story.content), runnerIndex) }}
```

- [ ] **Step 2: Style the link**

Append to the global stylesheet:

```css
.runner-link { text-decoration: underline; text-decoration-color: #f88c00; text-underline-offset: 3px; }
.runner-link:hover { color: #f88c00; }
```

- [ ] **Step 3: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no errors. (The linker's behaviour is covered by Task 2's tests. This step only wires it in.)

```bash
git add src/app/news/[slug]/page.tsx src/app/globals.css
git commit -m "News: runner names link to their profiles"
```

---

### Task 9: The news writer names its people and reads runner files; weekly UTMB refresh

**Files:**
- Create: `src/lib/runners/runner-file.ts`, `src/lib/runners/refresh.ts`
- Test: `src/lib/runners/runner-file.test.ts`, `src/lib/runners/refresh.test.ts`
- Modify:
  - `src/lib/news/write.ts`: `DRAFT_SCHEMA` gets `people`, `Draft` passes it through, `VOICE` is exported
  - `src/lib/news/types.ts`: `Draft.people?`, `StoryToPublish.people?`, `RunLog.profiles`
  - `src/lib/news/run.ts`: runner files as sources, and sources shown without them
  - `scripts/news-daily.ts`: Monday refresh plus its line in the weekly email
  - `src/lib/news/run.test.ts`: fixtures gain `profiles: []` where a `RunLog` is built by hand

**Interfaces:**
- Consumes: `loadNameIndex` and `mentionedSlugs` (Task 2), `utmbRunner` (Task 3), `Candidate` and `Bundle` from `src/lib/news/types.ts`.
- Produces:
  - `RUNNER_FILE_SOURCE = 'Film My Run runner file'`
  - `runnerCandidates(b: Bundle): Promise<Candidate[]>`
  - `profileText(r: { name; nationality; utmb_index; bio; best_finishes }): string`
  - `refreshUtmbIndexes(deps?): Promise<{ updated: number; missing: string[] }>`
  - `Draft.people?: string[]`
  - `RunLog.profiles: { name: string; slug?: string; reason?: string }[]`
  - `RunDeps.runnerFiles: (b: Bundle) => Promise<Candidate[]>`

- [ ] **Step 1: Write the failing tests**

`src/lib/runners/runner-file.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { profileText, RUNNER_FILE_SOURCE, toCandidate } from './runner-file';

const row = { slug: 'ruth-croft', name: 'Ruth Croft', nationality: 'NZ', utmb_index: 920, bio: '<p>Ruth Croft is a New Zealand trail runner.</p>', best_finishes: [{ race: 'UTMB Mont-Blanc CCC', year: 2025, distance: '100 km', time: '11:10:00', position: '1st woman', source: 'UTMB' }] };

describe('a runner file as a news source', () => {
  it('reads as plain text with the index and best finishes', () => {
    const t = profileText(row);
    expect(t).toContain('Ruth Croft is a New Zealand trail runner.');
    expect(t).toContain('UTMB Index 920');
    expect(t).toContain('2025: UTMB Mont-Blanc CCC, 100 km, 11:10:00, 1st woman');
    expect(t).not.toContain('<p>');
  });
  it('is a Candidate from our own site, never a feed item', () => {
    const c = toCandidate(row, new Date('2026-09-27T00:00:00Z'));
    expect(c).toMatchObject({ articleId: 0, source: RUNNER_FILE_SOURCE, url: 'https://filmmyrun.com/runners/ruth-croft', imageUrl: null });
  });
});
```

`src/lib/runners/refresh.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { refreshUtmbIndexes } from './refresh';

describe('the weekly UTMB refresh', () => {
  it('updates the index and its date, keeps a runner UTMB no longer shows, and never nulls a known index on a failed read', async () => {
    const update = vi.fn(async () => {});
    const out = await refreshUtmbIndexes({
      runners: async () => [
        { slug: 'a', utmb_uri: '1.a', utmb_index: 900 },
        { slug: 'b', utmb_uri: '2.b', utmb_index: 800 },
        { slug: 'c', utmb_uri: '3.c', utmb_index: 700 },
      ],
      read: async (uri) => (uri === '1.a' ? { index: 910 } : uri === '2.b' ? { index: null } : null),
      update,
      now: new Date('2026-09-28T00:00:00Z'),
    });
    expect(update).toHaveBeenCalledWith('a', 910, new Date('2026-09-28T00:00:00Z'));
    expect(update).toHaveBeenCalledWith('b', null, new Date('2026-09-28T00:00:00Z'));
    expect(update).toHaveBeenCalledTimes(2);
    expect(out).toEqual({ updated: 2, missing: ['c'] });
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/lib/runners/runner-file.test.ts src/lib/runners/refresh.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the runner file and the refresh**

`src/lib/runners/runner-file.ts`:

```ts
import { prisma } from '@/lib/db';
import type { Bundle, Candidate } from '@/lib/news/types';
import { loadNameIndex, mentionedSlugs } from './names';
import type { BestFinish } from './types';

export const RUNNER_FILE_SOURCE = 'Film My Run runner file';

type Row = { slug: string; name: string; nationality: string | null; utmb_index: number | null; bio: string; best_finishes: unknown };

export function profileText(r: Row): string {
  const finishes = (r.best_finishes as BestFinish[]) ?? [];
  return [
    `${r.name}${r.nationality ? ` (${r.nationality})` : ''}.`,
    r.utmb_index !== null ? `UTMB Index ${r.utmb_index}.` : '',
    r.bio.replace(/<\/p>\s*<p>/g, '\n\n').replace(/<[^>]+>/g, '').trim(),
    finishes.length ? `Best finishes:\n${finishes.map((b) => `${b.year}: ${[b.race, b.distance, b.time, b.position].filter(Boolean).join(', ')}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');
}

export function toCandidate(r: Row, now: Date): Candidate {
  return { articleId: 0, url: `https://filmmyrun.com/runners/${r.slug}`, source: RUNNER_FILE_SOURCE, title: r.name, pubDate: now, summary: '', text: profileText(r), imageUrl: null, photoCredit: null };
}

/** Our file on every runner a bundle's sources name: one more source for the writer and the fact-check. */
export async function runnerCandidates(b: Bundle, now = new Date()): Promise<Candidate[]> {
  const index = await loadNameIndex();
  const slugs = new Set<string>();
  for (const i of b.items) for (const s of mentionedSlugs(`<p>${i.title}\n${i.text ?? i.summary}</p>`, index)) slugs.add(s);
  if (!slugs.size) return [];
  const rows = await prisma.runners.findMany({ where: { slug: { in: [...slugs] }, status: 'published' }, select: { slug: true, name: true, nationality: true, utmb_index: true, bio: true, best_finishes: true } });
  return rows.map((r) => toCandidate(r, now));
}
```

`src/lib/runners/refresh.ts`:

```ts
import { prisma } from '@/lib/db';
import { utmbRunner } from './utmb';

interface RefreshDeps {
  runners: () => Promise<{ slug: string; utmb_uri: string | null; utmb_index: number | null }[]>;
  read: (uri: string) => Promise<{ index: number | null } | null>;
  update: (slug: string, index: number | null, at: Date) => Promise<void>;
  now: Date;
}

const liveDeps = (): RefreshDeps => ({
  runners: () => prisma.runners.findMany({ where: { utmb_uri: { not: null } }, select: { slug: true, utmb_uri: true, utmb_index: true } }),
  read: (uri) => utmbRunner(uri),
  update: async (slug, index, at) => { await prisma.runners.update({ where: { slug }, data: { utmb_index: index, utmb_index_at: at } }); },
  now: new Date(),
});

/**
 * Every runner's UTMB Index, refreshed on Mondays inside the news run (no AI, no
 * cost). A page UTMB no longer serves is listed, never deleted, and a failed read
 * keeps the last index and its date.
 */
export async function refreshUtmbIndexes(deps: RefreshDeps = liveDeps()): Promise<{ updated: number; missing: string[] }> {
  let updated = 0;
  const missing: string[] = [];
  for (const r of await deps.runners()) {
    const page = r.utmb_uri ? await deps.read(r.utmb_uri) : null;
    if (!page) { missing.push(r.slug); continue; }
    await deps.update(r.slug, page.index, deps.now);
    updated++;
  }
  return { updated, missing };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/runners/runner-file.test.ts src/lib/runners/refresh.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: The writer lists people**

In `src/lib/news/types.ts`:
- Add `people?: string[];` to `Draft`. `StoryToPublish` extends `Draft`, so it inherits it.
- Add `profiles: { name: string; slug?: string; reason?: string }[];` to `RunLog` with the doc comment `/** Runner pages made for people new stories named (runners/auto.ts). */`.

In `src/lib/news/write.ts`:
- Change `const VOICE` to `export const VOICE`.
- In `DRAFT_SCHEMA`, add `'people'` to `required`, and `people: { type: 'array', items: { type: 'string' } }` to `properties`.
- In the `writeStory` prompt, add after the `paragraphs:` bullet: `- people: the full names of the runners this story is about (winners, record-breakers, the subject), spelt as in the sources. Not everyone mentioned: leave out also-rans, officials and race directors. Empty when it is about no particular runner.`
- In both `writeStory` and `editStory`, add `people: string[]` to the `call<...>` reply type. Return `people: Array.isArray(r.data.people) ? r.data.people.filter((p) => typeof p === 'string') : []` in the draft. In `editStory`, carry over `d.people` when the edit's reply has none: `people: Array.isArray(x.people) && x.people.length ? x.people : d.people`.

In `src/lib/news/rules.ts`, `tidyPunctuation` must keep `people`. Change its return to `return { ...d, title: fix(d.title), excerpt: fix(d.excerpt), paragraphs: d.paragraphs.map(fix) };`.

- [ ] **Step 6: The run uses runner files**

In `src/lib/news/run.ts`:
- Import `runnerCandidates` and `RUNNER_FILE_SOURCE` from `@/lib/runners/runner-file`.
- Add to `RunDeps`: `/** Our runner files for the runners a bundle names (a source for writer and checker). */ runnerFiles: (b: Bundle) => Promise<Candidate[]>;`
- Add to `liveDeps`: `runnerFiles: (b) => runnerCandidates(b),`
- In `runNews`, add `profiles: []` to the initial `log` object.
- In `run`, inside the per-bundle `try`, directly after `await markSeen(bundleSeen(b));`, add:

```ts
      // Our own runner files first: facts the writer can use without a web search.
      b.items.push(...(await d.runnerFiles(b).catch(() => [])));
```

- In the `more` check just below, count only outside sources, so a runner file doesn't stand in for a second report of the event. Change `if (b.items.filter((i) => i.text).length < 2)` to `if (b.items.filter((i) => i.text && i.source !== RUNNER_FILE_SOURCE).length < 2)`. Apply the same change to the `searched` initialiser.
- Where `sources` is built, in both the `story = {...}` literal and the `Object.assign(story, draft, { sources: ... })` line, filter the runner file out: `b.items.filter((i) => i.source !== RUNNER_FILE_SOURCE).map((i) => ({ site: i.source, url: i.url }))`. The story page lists "Originally reported in" sources, and our own file isn't one.

In `src/lib/news/run.test.ts`, add two lines to the shared `deps()` factory's `d` object, beside `more:`. Without them the run falls back to the live deps and reaches the database:

```ts
    runnerFiles: async () => [],
    autoProfiles: async () => ({ log: [], costUsd: 0 }),
```

(`autoProfiles` is used from Task 10. Adding it now is harmless: the spread just carries an unused key.)

Add this test inside `describe('a news run', ...)`:

```ts
  it('a runner file joins the sources the writer sees, but not the published sources, and does not stand in for a second report', async () => {
    const file: Candidate = { articleId: 0, url: 'https://filmmyrun.com/runners/ruth-croft', source: 'Film My Run runner file', title: 'Ruth Croft', pubDate: new Date(), summary: '', text: 'Ruth Croft (NZ). UTMB Index 920.', imageUrl: null, photoCredit: null };
    let writerSaw: string[] = [];
    let searched = false;
    const { d, published } = deps({
      gather: async () => [cand(1)],
      runnerFiles: async () => [file],
      more: async () => { searched = true; return { items: [], costUsd: 0 }; },
      write: async (b: Bundle) => { writerSaw = b.items.map((i) => i.source); return { draft: { title: 'A title', excerpt: 'An excerpt.', paragraphs: ['One.', 'Two.', 'Three.'] }, refusal: null, costUsd: 0.06 }; },
    });
    await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(writerSaw).toContain('Film My Run runner file');
    expect(searched).toBe(true); // one feed report plus our own file is still a single outside source
    expect((published[0] as unknown as { sources: { site: string }[] }).sources.map((x) => x.site)).toEqual(['iRunFar']);
  });
```

- [ ] **Step 7: Monday refresh in the news run**

In `scripts/news-daily.ts`:
- Import `refreshUtmbIndexes` from `@/lib/runners/refresh`.
- Change the Monday branch to:

```ts
  else if (new Date().getUTCDay() === 1) {
    const utmb = await refreshUtmbIndexes().then(
      (r) => `UTMB Index refreshed for ${r.updated} runners${r.missing.length ? `; not found on UTMB: ${r.missing.join(', ')}` : ''}.`,
      (e) => `UTMB Index refresh FAILED: ${errorText(e)}`,
    );
    console.log(utmb);
    await weeklyReport(utmb);
  }
```

- Change `weeklyReport` to `async function weeklyReport(extra = '')` and put `extra` as the second line of its `text` (after the summary line), filtered out when empty. The `--weekly-report` branch keeps calling `weeklyReport()`.
- In `runLines`, add this line after the `notPublished` line in **both** lists (the brief weekly one and the full one): `...((log as { profiles?: { name: string; slug?: string; reason?: string }[] }).profiles ?? []).map((p) => p.slug ? `Runner page: ${p.name} https://filmmyrun.com/runners/${p.slug}` : `No runner page for ${p.name} (${p.reason})`),`

- [ ] **Step 8: Run the news and runner tests**

Run: `npx vitest run src/lib/news src/lib/runners && npx tsc --noEmit`
Expected: all PASS. Fix any `run.test.ts` fixture missing `runnerFiles` or `profiles` by adding them. Do not change a test's assertions.

- [ ] **Step 9: Commit**

```bash
git add src/lib/runners/runner-file.ts src/lib/runners/runner-file.test.ts src/lib/runners/refresh.ts src/lib/runners/refresh.test.ts src/lib/news scripts/news-daily.ts
git commit -m "News: writer names its people, reads our runner files; Monday UTMB refresh"
```

---

### Task 10: Automatic pages for new names

**Files:**
- Create: `src/lib/runners/write.ts`, `src/lib/runners/auto.ts`
- Test: `src/lib/runners/auto.test.ts`
- Modify: `src/lib/news/run.ts` (call after publishing), `src/lib/news/run.test.ts` (dep stub)

**Interfaces:**
- Consumes:
  - `gatherRunner` (Task 5), `saveRunner` (Task 6), `profileProblems` (Task 5)
  - `loadNameIndex` (Task 2)
  - `VOICE`, `UNVERIFIED_NOTE` (news `write.ts`)
  - `tidyPunctuation`, `nearCopyPhrases` (news `rules.ts`)
  - `completeJson`, `WRITE_MODEL`, `CHECK_MODEL`
  - `NEWS_CONFIG.fixRounds`
- Produces:
  - `writeProfile(f: RunnerFile, call?): Promise<{ bio: string[] | null; costUsd: number }>`
  - `checkProfile(f: RunnerFile, bio: string[], call?): Promise<{ unsupported: string[]; costUsd: number }>`
  - `editProfile(f: RunnerFile, bio: string[], fix: { unsupported?: string[]; phrases?: string[]; problems?: string[]; mark?: string[] }, call?): Promise<{ bio: string[] | null; costUsd: number }>`
  - `autoProfiles(names: string[], deps?: AutoDeps): Promise<{ log: RunLog['profiles']; costUsd: number }>`
  - `RunDeps.autoProfiles: (names: string[], budgetUsd: number) => Promise<{ log: RunLog['profiles']; costUsd: number }>`
  - `AUTO_PROFILES_PER_DAY = 3`
  - `PROFILE_ESTIMATE_USD = 0.15`

- [ ] **Step 1: Write the failing tests**

`src/lib/runners/auto.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { autoProfiles } from './auto';
import type { RunnerFile } from './types';

const file = (name: string): RunnerFile => ({
  slug: name.toLowerCase().replace(/ /g, '-'), name, aliases: [], nationality: 'GB', sex: 'F', birthYear: null, disciplines: ['trail_ultra'], era: 'current',
  utmb: { id: 1, uri: '1.x', index: 800, website: null },
  texts: [{ source: { name: 'UTMB', url: 'https://utmb.world/en/runner/1.x' }, text: `${name}. General UTMB Index: 800. 2025: Lakeland 100, 1st woman.` }],
  results: [{ race: 'Lakeland 100', year: 2025, distance: '169 km', time: '28:10:00', position: '1st woman', source: 'UTMB' }], photoCandidates: [],
});
const bio = ['She is a British trail runner.', 'She won the Lakeland 100 in 2025.', 'Her UTMB Index is 800.'];

function deps(over: object = {}) {
  return {
    known: async () => new Set(['Existing Runner']),
    gather: vi.fn(async (name: string) => (name === 'Nobody Found' ? null : file(name))),
    write: vi.fn(async () => ({ bio, costUsd: 0.05 })),
    check: vi.fn(async () => ({ unsupported: [] as string[], costUsd: 0.03 })),
    edit: vi.fn(async (_f: RunnerFile, b: string[]) => ({ bio: b, costUsd: 0.02 })),
    save: vi.fn(async (f: RunnerFile) => ({ slug: f.slug })),
    ...over,
  };
}

describe('automatic runner pages', () => {
  it('writes, checks and publishes a page for each new name, skipping known ones', async () => {
    const d = deps();
    const out = await autoProfiles(['Existing Runner', 'Jasmin Paris'], 10, d);
    expect(out.log).toEqual([{ name: 'Jasmin Paris', slug: 'jasmin-paris' }]);
    expect(d.save).toHaveBeenCalledTimes(1);
    const saved = d.save.mock.calls[0][0] as RunnerFile;
    expect(saved.bio).toEqual(bio);
    expect(saved.bestFinishes).toEqual(saved.results);
    expect(saved.photos).toEqual([]); // auto pages start with the card
    expect(saved.sources).toEqual([{ name: 'UTMB', url: 'https://utmb.world/en/runner/1.x' }]);
  });
  it('no results anywhere: no page, with the reason', async () => {
    const out = await autoProfiles(['Nobody Found'], 10, deps());
    expect(out.log).toEqual([{ name: 'Nobody Found', reason: 'no UTMB entry or Wikipedia article' }]);
  });
  it('at most 3 a day, and none past the budget', async () => {
    const d = deps();
    const out = await autoProfiles(['A One', 'B Two', 'C Three', 'D Four'], 10, d);
    expect(d.save).toHaveBeenCalledTimes(3);
    expect(out.log[3]).toEqual({ name: 'D Four', reason: 'over the 3-a-day limit' });
    const broke = await autoProfiles(['E Five'], 0.01, deps());
    expect(broke.log).toEqual([{ name: 'E Five', reason: 'monthly ceiling' }]);
  });
  it('an unsupported fact is edited out; still unsupported after every round, it is marked, not published bare', async () => {
    const check = vi.fn().mockResolvedValueOnce({ unsupported: ['Her UTMB Index is 800'], costUsd: 0 }).mockResolvedValue({ unsupported: [], costUsd: 0 });
    const d = deps({ check });
    await autoProfiles(['Jasmin Paris'], 10, d);
    expect(d.edit).toHaveBeenCalledWith(expect.anything(), bio, { unsupported: ['Her UTMB Index is 800'] });
    expect(d.save).toHaveBeenCalledTimes(1);
  });
  it('a writer that returns nothing: no page, with the reason', async () => {
    const out = await autoProfiles(['Jasmin Paris'], 10, deps({ write: async () => ({ bio: null, costUsd: 0.05 }) }));
    expect(out.log).toEqual([{ name: 'Jasmin Paris', reason: 'the writer returned nothing' }]);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/lib/runners/auto.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the writer**

`src/lib/runners/write.ts`:

```ts
import { completeJson } from '@/lib/llm';
import { CHECK_MODEL, WRITE_MODEL } from '@/lib/news/models';
import { VOICE } from '@/lib/news/write';
import type { RunnerFile } from './types';

const BIO_SCHEMA = { type: 'object', additionalProperties: false, required: ['paragraphs'], properties: { paragraphs: { type: 'array', items: { type: 'string' } } } };
const CHECK_SCHEMA = { type: 'object', additionalProperties: false, required: ['unsupported'], properties: { unsupported: { type: 'array', items: { type: 'string' } } } };

const RULES = `A short profile of a runner for the Film My Run runners pages: 3 to 5 plain-text paragraphs.
- Who they are and what they run, then their biggest results with times and places, then what they are doing now (or, for a runner from the past, what they are remembered for).
- Only facts in the sources below. Nothing from your own knowledge, however well known.
- Living people: nothing about health, family or private life beyond what the runner has made public. Doping only where an official body (AIU, USADA, UKAD, WADA, a national federation) has ruled; say who ruled and what. A death only as a source reports it.
- No title, no headings, no lists: paragraphs only.`;

const sources = (f: RunnerFile) => f.texts.map((t, n) => `SOURCE ${n + 1} (${t.source.name}, ${t.source.url}):\n${t.text.slice(0, 12000)}`).join('\n\n');

type Call = typeof completeJson;
const paragraphs = (x: unknown) => (Array.isArray((x as { paragraphs?: unknown })?.paragraphs) && (x as { paragraphs: unknown[] }).paragraphs.every((p) => typeof p === 'string') ? (x as { paragraphs: string[] }).paragraphs : null);

export async function writeProfile(f: RunnerFile, call: Call = completeJson) {
  const r = await call<{ paragraphs: string[] }>({ model: WRITE_MODEL, prompt: `${VOICE}\n\n${RULES}\n\nThe runner: ${f.name}.\n\n${sources(f)}`, maxTokens: 2000, temperature: 0.6, schemaName: 'profile', schema: BIO_SCHEMA });
  return { bio: paragraphs(r.data), costUsd: r.costUsd };
}

export async function checkProfile(f: RunnerFile, bio: string[], call: Call = completeJson) {
  const r = await call<{ unsupported: string[] }>({ model: CHECK_MODEL, prompt: `Fact-check this runner profile against its sources. List every name, time, placing, record, distance, date or number in the PROFILE that does not appear in (or follow directly from) the SOURCES. Return an empty list when everything is supported. Be strict.\n\nPROFILE:\n${bio.join('\n\n')}\n\n${sources(f)}`, maxTokens: 1500, schemaName: 'check', schema: CHECK_SCHEMA });
  const u = r.data?.unsupported;
  return { unsupported: Array.isArray(u) && u.every((x) => typeof x === 'string') ? u : ['checker reply unreadable'], costUsd: r.costUsd };
}

export async function editProfile(f: RunnerFile, bio: string[], fix: { unsupported?: string[]; phrases?: string[]; problems?: string[]; mark?: string[] }, call: Call = completeJson) {
  const asks = [
    ...(fix.problems ?? []).map((p) => `- Fix: ${p} (3 to 5 paragraphs, no em dashes, no semicolons).`),
    ...(fix.phrases ?? []).map((p) => `- Too close to a source's wording; say it in new words: "${p}"`),
    ...(fix.unsupported ?? []).map((u) => `- Not found in any source; remove it, or state it exactly as a source does: ${u}`),
    ...(fix.mark ?? []).map((m) => `- Could not be verified; keep it only if the profile needs it, with an asterisk (*) straight after it: ${m}`),
  ].join('\n');
  const r = await call<{ paragraphs: string[] }>({ model: WRITE_MODEL, prompt: `${VOICE}\n\n${RULES}\n\nYou wrote this profile. Put right every point below and change nothing else.\n${asks}\n\nPROFILE (JSON):\n${JSON.stringify(bio)}\n\n${sources(f)}`, maxTokens: 2000, temperature: 0.3, schemaName: 'profile', schema: BIO_SCHEMA });
  return { bio: paragraphs(r.data), costUsd: r.costUsd };
}
```

- [ ] **Step 4: Implement the automatic pages**

`src/lib/runners/auto.ts`:

```ts
import { NEWS_CONFIG } from '@/lib/news/config';
import { nearCopyPhrases, tidyPunctuation } from '@/lib/news/rules';
import { UNVERIFIED_NOTE } from '@/lib/news/write';
import { profileProblems } from './checks';
import { gatherRunner } from './gather';
import { loadNameIndex } from './names';
import { saveRunner } from './save';
import type { RunnerFile } from './types';
import { checkProfile, editProfile, writeProfile } from './write';

export const AUTO_PROFILES_PER_DAY = 3;
/** Write, check and up to two edits on Opus: about 10p, rounded up for the ceiling check. */
export const PROFILE_ESTIMATE_USD = 0.15;

type Entry = { name: string; slug?: string; reason?: string };

export interface AutoDeps {
  known: () => Promise<Set<string>>;
  gather: (name: string) => Promise<RunnerFile | null>;
  write: typeof writeProfile;
  check: typeof checkProfile;
  edit: typeof editProfile;
  save: (f: RunnerFile) => Promise<{ slug: string }>;
}

const liveDeps: AutoDeps = {
  known: async () => new Set((await loadNameIndex()).keys()),
  gather: (name) => gatherRunner({ name }),
  write: (f) => writeProfile(f),
  check: (f, b) => checkProfile(f, b),
  edit: (f, b, fix) => editProfile(f, b, fix),
  save: (f) => saveRunner(f, 'auto'),
};

const tidy = (bio: string[]) => tidyPunctuation({ title: '', excerpt: '', paragraphs: bio }).paragraphs;

/**
 * A page for each runner a new story is about who has none yet (spec: "a new name
 * in a news story has a page by the next morning"). Same fact rules as a story:
 * edits for what the checker can't find, an asterisk in the last round, never
 * held. Auto pages have no photos (the card) until a session picks them.
 */
export async function autoProfiles(names: string[], budgetUsd: number, deps: AutoDeps = liveDeps): Promise<{ log: Entry[]; costUsd: number }> {
  const known = await deps.known();
  const log: Entry[] = [];
  let costUsd = 0;
  let made = 0;
  for (const name of [...new Set(names.map((n) => n.trim()).filter((n) => n.split(/\s+/).length >= 2))]) {
    if (known.has(name)) continue;
    if (made >= AUTO_PROFILES_PER_DAY) { log.push({ name, reason: `over the ${AUTO_PROFILES_PER_DAY}-a-day limit` }); continue; }
    if (budgetUsd - costUsd < PROFILE_ESTIMATE_USD) { log.push({ name, reason: 'monthly ceiling' }); continue; }
    try {
      const f = await deps.gather(name);
      if (!f) { log.push({ name, reason: 'no UTMB entry or Wikipedia article' }); continue; }
      const w = await deps.write(f);
      costUsd += w.costUsd;
      if (!w.bio) { log.push({ name, reason: 'the writer returned nothing' }); continue; }
      let bio = tidy(w.bio);
      const texts = f.texts.map((t) => t.text);
      const file = (b: string[]): RunnerFile => ({ ...f, bio: b, bestFinishes: f.results.slice(0, 10), photos: [], sources: f.texts.map((t) => t.source) });
      let reason: string | null = null;
      for (let round = 0; ; round++) {
        const last = round >= NEWS_CONFIG.fixRounds;
        const problems = profileProblems(file(bio));
        if (problems.length) {
          if (last) { reason = problems.join(', '); break; }
          const phrases = problems.includes('near-copy of a source') ? nearCopyPhrases({ title: '', excerpt: '', paragraphs: bio }, texts) : [];
          const e = await deps.edit(f, bio, { problems: problems.filter((p) => p !== 'near-copy of a source'), phrases });
          costUsd += e.costUsd;
          if (e.bio) bio = tidy(e.bio);
          continue;
        }
        const c = await deps.check(f, bio);
        costUsd += c.costUsd;
        if (c.unsupported.length === 0) break;
        if (last) {
          const e = await deps.edit(f, bio, { mark: c.unsupported });
          costUsd += e.costUsd;
          const marked = e.bio ? tidy(e.bio).filter((p) => p.trim() !== UNVERIFIED_NOTE) : null;
          if (marked && marked.some((p) => p.includes('*'))) marked.push(UNVERIFIED_NOTE);
          if (marked && profileProblems(file(marked)).length === 0) { bio = marked; break; }
          reason = `unsupported: ${c.unsupported.join('; ')}`;
          break;
        }
        const e = await deps.edit(f, bio, { unsupported: c.unsupported });
        costUsd += e.costUsd;
        if (e.bio) bio = tidy(e.bio);
      }
      if (reason) { log.push({ name, reason }); continue; }
      const { slug } = await deps.save(file(bio));
      made++;
      log.push({ name, slug });
    } catch (e) {
      log.push({ name, reason: `error: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}` });
    }
  }
  return { log, costUsd };
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/lib/runners/auto.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Call it after the news run publishes**

In `src/lib/news/run.ts`:
- Import `autoProfiles` from `@/lib/runners/auto`.
- Add to `RunDeps`: `/** Runner pages for the people new stories name (runners/auto.ts). */ autoProfiles: (names: string[], budgetUsd: number) => Promise<{ log: RunLog['profiles']; costUsd: number }>;`
- Add to `liveDeps`: `autoProfiles: (names, budget) => autoProfiles(names, budget),`
- In `run`, collect people from published stories. Declare `const people: string[] = [];` before the `for (const b of picked)` loop. Directly after `log.published.push({ slug, title: story.title });`, add `people.push(...(story.people ?? []));`.
- After the loop, before `await save('log.json', log);`, add:

```ts
  // Pages for the runners today's stories are about who have none yet. Never on a dry run.
  if (!dryRun && people.length) {
    const budget = NEWS_CONFIG.monthlyCeilingGbp * NEWS_CONFIG.usdPerGbp - (monthBefore + log.costUsd);
    const p = await d.autoProfiles(people, budget).catch((e) => ({ log: [{ name: people.join(', '), reason: `error: ${errorText(e)}` }], costUsd: 0 }));
    log.profiles.push(...p.log);
    log.costUsd += p.costUsd;
  }
```

In `src/lib/news/run.test.ts`, add `autoProfiles: async () => ({ log: [], costUsd: 0 })` to the shared deps.

- [ ] **Step 7: Run the news and runner tests**

Run: `npx vitest run src/lib/news src/lib/runners && npx tsc --noEmit`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/runners/write.ts src/lib/runners/auto.ts src/lib/runners/auto.test.ts src/lib/news/run.ts src/lib/news/run.test.ts
git commit -m "Runners: automatic pages for runners new stories are about (3 a day, inside the ceiling)"
```

---

### Task 11: Pilot five runners, verify live, document

**Files:**
- Modify: `CLAUDE.md` (a "Runner profiles" section), `~/.claude/skills/news-story/SKILL.md` (one line on the runner file)
- Create: `docs/runners/HOW-TO.md` (the session recipe)

This task is done **in the controller session, not by a subagent**. Writing bios is session work (Stephen's subscription).

- [ ] **Step 1: Full test suite, then push**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS.

```bash
git stash push -q BLOG-WRITING-INSTRUCTIONS.md; git pull -q --rebase origin main; git stash pop -q; git push -q origin main
```

Wait for the deploy: `until curl -s https://filmmyrun.com/runners | grep -q "Runners"; do sleep 30; done` (with Monitor).

- [ ] **Step 2: Gather five pilots**

A mix of kinds:

```bash
for n in "Ann Trason" "Paula Radcliffe"; do npx tsx --env-file=.env --tsconfig tsconfig.json scripts/runners-gather.ts "$n" --historic; done
npx tsx --env-file=.env --tsconfig tsconfig.json scripts/runners-gather.ts --utmb 2704.kilian.jornetburgada
npx tsx --env-file=.env --tsconfig tsconfig.json scripts/runners-gather.ts "Jim Walmsley"
npx tsx --env-file=.env --tsconfig tsconfig.json scripts/runners-gather.ts "Josh Kerr"
```

Expected: five `runners-work/*.json` files. If one prints NOT FOUND, fix it:
- Try `--utmb <uri>` (look the runner up on utmb.world).
- Or try the exact Wikipedia title.

- [ ] **Step 3: Write each profile in the session**

For each work file, read `texts` and write the following into the file:
- `bio`: 3 to 5 paragraphs in the news-desk voice, facts only from `texts`.
- `bestFinishes`: from `results` or `texts`, each citing a source by name.
- `sources`: the `texts` sources actually used.
- `aliases`: other spellings that appear in news, e.g. "Kilian Jornet" for "Kilian Jornet Burgada".
- `disciplines`, and `birthYear` when a source gives it.
- `photos`: a portrait and an action shot, each `{kind, url, credit, licence, source_url}`. The Commons candidate is preferred when good. Otherwise use the best non-agency photo found on a race, brand, iRunFar or photographer page, credited as "Photo: <photographer> / <outlet>".

Then run `npm run runners:save -- runners-work/<slug>.json` for each, with the `.env` and `--env-file` pattern above: `npx tsx --env-file=.env --tsconfig tsconfig.json scripts/runners-save.ts runners-work/<slug>.json`. R2 keys are in `.env`.
Expected: `PUBLISHED: https://filmmyrun.com/runners/<slug>` for each. A "Not saved" error names what to fix. Fix it and save again.

- [ ] **Step 4: Verify what is served**

```bash
for s in ann-trason paula-radcliffe kilian-jornet-burgada jim-walmsley josh-kerr; do curl -s -o /dev/null -w "$s %{http_code}\n" https://filmmyrun.com/runners/$s; done
curl -s -H "RSC: 1" https://filmmyrun.com/news/josh-kerr-wins-ultimate-championship-1500m-in-budapest-in-3-29-35 | grep -c 'runner-link'
curl -s https://filmmyrun.com/sitemap.xml | grep -c "/runners/"
```

Expected:
- Five `200` lines.
- A count of at least 1 on the Kerr story. Find its slug with `curl -s -H "RSC: 1" https://filmmyrun.com/news | grep -o '/news/josh-kerr[^"]*' | head -1` if it differs.
- At least 5 sitemap entries.
- `/runners/josh-kerr` shows an "In the news" list with the Kerr story.

Check one runner page on a phone-width screen in the iOS simulator (Safari, per `project-ios-visual-verification`): photo, index line, table scroll, credits.

- [ ] **Step 5: Document**

`docs/runners/HOW-TO.md` holds the session recipe:
- gather: one name, `--utmb`, `--top 50`
- what to write into the work file (Step 3 above)
- `runners:save`
- `runners:photo --remove`
- the photo rules and the agency list
- how auto pages appear in the Monday email

Add to `CLAUDE.md` a "Runner profiles" section after "LLM calls", covering:
- the table
- the pages
- that linking happens at render time (`linkRunners`)
- the runner file as a news source (`RUNNER_FILE_SOURCE`, excluded from shown sources)
- the Monday UTMB refresh inside `news:daily`
- auto pages (3 a day, `written_by = 'auto'`, card until a session adds photos)
- ITRA out of scope (bot wall)
- a pointer to `docs/runners/HOW-TO.md`

Add "`/runners`" to the Site Structure tree.

In `~/.claude/skills/news-story/SKILL.md`, add one line under Background: runner names in stories link to `/runners/<slug>`, the writer reads our runner files first, and a new runner a story is about gets a page automatically.

- [ ] **Step 6: Commit and push**

```bash
git add CLAUDE.md docs/runners/HOW-TO.md
git commit -m "Runners: session recipe and CLAUDE.md"
git stash push -q BLOG-WRITING-INSTRUCTIONS.md; git pull -q --rebase origin main; git stash pop -q; git push -q origin main
```

The rest of the first batch (about 150 in total) continues in later sessions using `docs/runners/HOW-TO.md`. Stephen approves the list of historic greats before those are written.
