# Shoe Finder Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace search-snippet shoe discovery with feed-based discovery gated on brand-site evidence, store verified product images on R2, and fix the shoe data model in one migration.

**Architecture:** All new code lives in `src/lib/shoes/` as small pure modules with injected `deps` for network and Prisma. `src/lib/shoe-enrichment.ts` is dissolved into them. Routes become thin. One Prisma migration adds enums, `shoe_brands`, `shoe_candidates`, and new `shoes` columns, with SQL data steps for brand canonicalisation and description-marker extraction.

**Tech Stack:** Next.js 14 app router, Prisma (Postgres on Railway), vitest, `rss-parser`, `cheerio`, `sharp`, `@aws-sdk/client-s3` via `src/lib/r2.ts`, `resend`, OpenRouter via `src/lib/llm.ts`, Brave/Serper search.

**Spec:** `docs/superpowers/specs/2026-09-13-shoe-finder-pipeline-design.md`

## Global Constraints

- Branch is `main`. A push to `main` deploys to Railway and runs `npx prisma migrate deploy` first. **Commit after every task; do NOT push until Task 15 says so.**
- Never call Anthropic directly. All LLM calls go through `completeText` / `completeTextWithImage` in `src/lib/llm.ts` (OpenRouter).
- Every function that touches network or Prisma takes a `deps` parameter with a default of the live implementation, so tests inject fakes. No `vi.mock` of module paths.
- Tests: vitest, files named `*.test.ts` next to the code, `npm test` must stay green after every task. `npm run typecheck` must pass before every commit.
- Do not touch `CLAUDE.md` or `BLOG-WRITING-INSTRUCTIONS.md` (another session has uncommitted edits there). Do not `git add -A`; add files by name.
- `image_url` on R2 is `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shoes/{slug}.jpg`. Use `getR2Url(key)` from `src/lib/r2.ts`, never hard-code.
- Rate limits: 1100 ms between Brave calls (existing `sleep(1100)` pattern).
- Prisma client is `import { prisma } from '@/lib/db'`.
- Commit messages: imperative subject, then the two attribution lines:
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01YAURYN4pzpEeAAqHESpCWp
  ```

---

## File map

| Path | Responsibility |
|---|---|
| `prisma/schema.prisma` | enums, `shoe_brands`, `shoe_candidates`, new `shoes` columns |
| `prisma/migrations/20260913120000_add_shoe_pipeline/migration.sql` | DDL + data steps |
| `src/lib/shoes/taxonomy.ts` | label maps for category / source / terrain |
| `src/lib/shoes/versions.ts` | `parseModelVersion`, `getAdjacentVersionStrings`, `findVersionConflict`, `isComparisonArticle`, `isSameLine` |
| `src/lib/shoes/slug.ts` | `shoeToSlug`, `urlMatchesShoe` |
| `src/lib/shoes/brands.ts` | `resolveBrand`, `loadBrands` |
| `src/lib/shoes/scores.ts` | `normaliseScore`, `extractExplicitScore`, `recomputeShoeScore` |
| `src/lib/shoes/search.ts` | `webSearch`, `imageSearch` (moved) |
| `src/lib/shoes/html.ts` | `fetchPage`, `extractJsonLdProducts`, `extractMetaImages`, `decodeHtmlEntities` |
| `src/lib/shoes/reviews.ts` | `fetchReviewsForShoe` (moved, sources from enum) |
| `src/lib/shoes/specs.ts` | `parseShoeSpecs` (was `parseShoeQuery`) |
| `src/lib/shoes/discovery/types.ts` | `Nomination` |
| `src/lib/shoes/discovery/sources/rss.ts` | feeds → nominations |
| `src/lib/shoes/discovery/sources/brandPages.ts` | new-arrivals JSON-LD → nominations |
| `src/lib/shoes/discovery/sources/search.ts` | three queries → nominations |
| `src/lib/shoes/discovery/normalise.ts` | nominations → resolved candidates via LLM + brands + dedupe |
| `src/lib/shoes/discovery/index.ts` | `discover(deps)` → upserts `shoe_candidates` |
| `src/lib/shoes/publish/brandPage.ts` | `findBrandProductPage` |
| `src/lib/shoes/publish/gate.ts` | `evaluate` |
| `src/lib/shoes/publish/publish.ts` | `publishCandidate` |
| `src/lib/shoes/images/candidates.ts` | ordered image candidates |
| `src/lib/shoes/images/verify.ts` | `isLikelyProductImage`, `checkImageSize`, `visionConfirmShoeImage` |
| `src/lib/shoes/images/store.ts` | download → sharp → R2 |
| `src/lib/shoes/images/index.ts` | `findAndStoreImage`, `auditImages` |
| `src/lib/shoes/job/weekly.ts` | `runWeekly(opts, deps)` → `JobReport` |
| `src/lib/shoes/job/digest.ts` | `renderDigest`, `sendDigest` |
| `src/app/api/shoes/route.ts` | catalogue list, no session |
| `src/app/api/shoes/[slug]/route.ts` | one shoe with reviews |
| `src/app/api/shoes/my-ratings/route.ts` | session user's ratings |
| `src/app/api/shoes/rate/route.ts` | calls `recomputeShoeScore` |
| `src/app/api/shoes/add/route.ts` | user suggestion via publish helpers |
| `src/app/api/shoes/weekly-update/route.ts` | thin wrapper around `runWeekly` |
| `src/app/api/shoes/candidates/[id]/publish/route.ts` | signed publish-anyway link |
| `src/components/shoes/*` | labels from meta, ratings hook, lazy reviews |
| `scripts/shoes.ts` | CLI: `enrich`, `image`, `backfill-images`, `run-weekly` |
| `.github/workflows/weekly-shoe-update.yml` | fail on non-200 / two empty runs |

---

### Task 1: Schema and migration

**Files:**
- Modify: `prisma/schema.prisma:442-499`
- Create: `prisma/migrations/20260913120000_add_shoe_pipeline/migration.sql`
- Create: `prisma/seed-data/shoe-brands.json`

**Interfaces:**
- Produces: Prisma models `shoe_brands`, `shoe_candidates`; enums `ShoeTerrain`, `ShoeCategory`, `ReviewSource`, `ShoeOrigin`, `CandidateStatus`; new `shoes` columns listed in the spec.

- [ ] **Step 1: Write the brand seed file**

`prisma/seed-data/shoe-brands.json`:

```json
[
  {"name":"Adidas","aliases":["adidas"],"domain":"adidas.co.uk"},
  {"name":"Altra","aliases":["altra","altra running"],"domain":"altrarunning.com"},
  {"name":"Arc'teryx","aliases":["arcteryx","arc'teryx","arc teryx"],"domain":"arcteryx.com"},
  {"name":"ASICS","aliases":["asics"],"domain":"asics.com"},
  {"name":"Avelo","aliases":["avelo"],"domain":"avelorunning.com"},
  {"name":"Brooks","aliases":["brooks","brooks running"],"domain":"brooksrunning.com"},
  {"name":"Craft","aliases":["craft","craft sportswear"],"domain":"craftsportswear.com"},
  {"name":"Dynafit","aliases":["dynafit"],"domain":"dynafit.com"},
  {"name":"Hoka","aliases":["hoka","hoka one one"],"domain":"hoka.com"},
  {"name":"Inov-8","aliases":["inov-8","inov8","inov 8"],"domain":"inov-8.com"},
  {"name":"Kiprun","aliases":["kiprun","decathlon kiprun"],"domain":"decathlon.co.uk"},
  {"name":"La Sportiva","aliases":["la sportiva","sportiva"],"domain":"lasportiva.com"},
  {"name":"Li-Ning","aliases":["li-ning","li ning","lining"],"domain":"li-ning.com"},
  {"name":"Mammut","aliases":["mammut"],"domain":"mammut.com"},
  {"name":"Merrell","aliases":["merrell"],"domain":"merrell.com"},
  {"name":"Mizuno","aliases":["mizuno"],"domain":"mizuno.com"},
  {"name":"New Balance","aliases":["new balance","newbalance","nb"],"domain":"newbalance.co.uk"},
  {"name":"Nike","aliases":["nike"],"domain":"nike.com"},
  {"name":"Nnormal","aliases":["nnormal","n normal"],"domain":"nnormal.com"},
  {"name":"Norda","aliases":["norda"],"domain":"nordarun.com"},
  {"name":"On","aliases":["on","on running","on-running"],"domain":"on.com"},
  {"name":"Puma","aliases":["puma"],"domain":"puma.com"},
  {"name":"Reebok","aliases":["reebok"],"domain":"reebok.com"},
  {"name":"Salomon","aliases":["salomon"],"domain":"salomon.com"},
  {"name":"Saucony","aliases":["saucony"],"domain":"saucony.com"},
  {"name":"Scott","aliases":["scott","scott sports"],"domain":"scott-sports.com"},
  {"name":"The North Face","aliases":["the north face","north face","tnf"],"domain":"thenorthface.com"},
  {"name":"Topo Athletic","aliases":["topo","topo athletic"],"domain":"topoathletic.com"},
  {"name":"Under Armour","aliases":["under armour","ua"],"domain":"underarmour.co.uk"},
  {"name":"VJ","aliases":["vj","vj shoes","vj sport"],"domain":"vjshoes.com"},
  {"name":"Xero Shoes","aliases":["xero","xero shoes"],"domain":"xeroshoes.com"}
]
```

- [ ] **Step 2: Edit `prisma/schema.prisma`**

Replace the three shoe models with:

```prisma
enum ShoeTerrain {
  road
  trail
  both
}

enum ShoeCategory {
  daily_trainer
  race
  long_run
  speed
  ultra
  stability
  max_cushion
  minimal
}

enum ReviewSource {
  runrepeat
  runners_world
  irunfar
  believe_in_run
  the_run_testers
  running_shoes_guru
  road_trail_run
  doctors_of_running
  other
}

enum ShoeOrigin {
  seed
  user
  discovery
}

enum CandidateStatus {
  pending
  published
  held
  rejected
}

model shoe_brands {
  id               Int      @id @default(autoincrement())
  name             String   @unique
  aliases          String[]
  domain           String
  new_arrivals_url String?
  created_at       DateTime @default(now())
  shoes            shoes[]
  candidates       shoe_candidates[]
}

model shoes {
  id                Int            @id @default(autoincrement())
  brand             String
  brand_id          Int
  model             String
  slug              String         @unique
  terrain           ShoeTerrain
  category          ShoeCategory
  drop_mm           Int?
  weight_g          Int?
  stack_height_mm   Int?
  price_gbp         Int?           // in pence
  release_year      Int?
  release_date      DateTime?
  description       String?
  image_url         String?
  image_source_url  String?
  image_method      String?
  image_verified_at DateTime?
  buy_url           String?
  avg_score         Decimal?       @db.Decimal(4, 2)
  review_count      Int            @default(0)
  user_avg_score    Decimal?       @db.Decimal(3, 1)
  user_rating_count Int            @default(0)
  last_reviewed     DateTime?
  origin            ShoeOrigin     @default(seed)
  added_by_user_id  Int?
  superseded_by_id  Int?
  created_at        DateTime       @default(now())
  brand_ref         shoe_brands    @relation(fields: [brand_id], references: [id])
  superseded_by     shoes?         @relation("ShoeSupersession", fields: [superseded_by_id], references: [id])
  supersedes        shoes[]        @relation("ShoeSupersession")
  shoe_reviews      shoe_reviews[]
  shoe_user_ratings shoe_user_ratings[]
  candidate         shoe_candidates?

  @@index([terrain])
  @@index([brand])
  @@index([brand_id])
  @@index([avg_score])
  @@index([user_avg_score])
  @@index([category])
  @@index([superseded_by_id])
}

model shoe_reviews {
  id           Int          @id @default(autoincrement())
  shoe_id      Int
  source       ReviewSource
  source_url   String?
  expert_score Decimal?     @db.Decimal(4, 2)
  user_score   Decimal?     @db.Decimal(4, 2)
  user_count   Int?
  summary      String?
  fetched_at   DateTime     @default(now())
  shoes        shoes        @relation(fields: [shoe_id], references: [id], onDelete: Cascade)

  @@unique([shoe_id, source])
  @@index([shoe_id])
}

model shoe_user_ratings {
  id         Int      @id @default(autoincrement())
  shoe_id    Int
  user_id    Int
  score      Decimal  @db.Decimal(3, 1)
  created_at DateTime @default(now())
  updated_at DateTime @default(now()) @updatedAt
  shoes      shoes    @relation(fields: [shoe_id], references: [id], onDelete: Cascade)
  users      users    @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([shoe_id, user_id])
  @@index([shoe_id])
  @@index([user_id])
}

model shoe_candidates {
  id            Int             @id @default(autoincrement())
  brand_id      Int?
  brand_text    String
  model_text    String
  slug          String          @unique
  status        CandidateStatus @default(pending)
  hold_reasons  String[]
  evidence      Json            @default("{}")
  shoe_id       Int?            @unique
  first_seen_at DateTime        @default(now())
  last_seen_at  DateTime        @default(now())
  decided_at    DateTime?
  brand_ref     shoe_brands?    @relation(fields: [brand_id], references: [id])
  shoe          shoes?          @relation(fields: [shoe_id], references: [id])

  @@index([status])
}
```

- [ ] **Step 3: Write the migration SQL by hand** (do not use `prisma migrate dev` against prod; the SQL has data steps)

`prisma/migrations/20260913120000_add_shoe_pipeline/migration.sql`:

```sql
-- Enums
CREATE TYPE "ShoeTerrain" AS ENUM ('road','trail','both');
CREATE TYPE "ShoeCategory" AS ENUM ('daily_trainer','race','long_run','speed','ultra','stability','max_cushion','minimal');
CREATE TYPE "ReviewSource" AS ENUM ('runrepeat','runners_world','irunfar','believe_in_run','the_run_testers','running_shoes_guru','road_trail_run','doctors_of_running','other');
CREATE TYPE "ShoeOrigin" AS ENUM ('seed','user','discovery');
CREATE TYPE "CandidateStatus" AS ENUM ('pending','published','held','rejected');

-- Brands
CREATE TABLE "shoe_brands" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "aliases" TEXT[] NOT NULL DEFAULT '{}',
  "domain" TEXT NOT NULL,
  "new_arrivals_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "shoe_brands" ("name","aliases","domain") VALUES
 ('Adidas','{adidas}','adidas.co.uk'),
 ('Altra','{altra,"altra running"}','altrarunning.com'),
 ('Arc''teryx','{arcteryx,"arc''teryx","arc teryx"}','arcteryx.com'),
 ('ASICS','{asics}','asics.com'),
 ('Avelo','{avelo}','avelorunning.com'),
 ('Brooks','{brooks,"brooks running"}','brooksrunning.com'),
 ('Craft','{craft,"craft sportswear"}','craftsportswear.com'),
 ('Dynafit','{dynafit}','dynafit.com'),
 ('Hoka','{hoka,"hoka one one"}','hoka.com'),
 ('Inov-8','{inov-8,inov8,"inov 8"}','inov-8.com'),
 ('Kiprun','{kiprun,"decathlon kiprun"}','decathlon.co.uk'),
 ('La Sportiva','{"la sportiva",sportiva}','lasportiva.com'),
 ('Li-Ning','{li-ning,"li ning",lining}','li-ning.com'),
 ('Mammut','{mammut}','mammut.com'),
 ('Merrell','{merrell}','merrell.com'),
 ('Mizuno','{mizuno}','mizuno.com'),
 ('New Balance','{"new balance",newbalance,nb}','newbalance.co.uk'),
 ('Nike','{nike}','nike.com'),
 ('Nnormal','{nnormal,"n normal"}','nnormal.com'),
 ('Norda','{norda}','nordarun.com'),
 ('On','{on,"on running",on-running}','on.com'),
 ('Puma','{puma}','puma.com'),
 ('Reebok','{reebok}','reebok.com'),
 ('Salomon','{salomon}','salomon.com'),
 ('Saucony','{saucony}','saucony.com'),
 ('Scott','{scott,"scott sports"}','scott-sports.com'),
 ('The North Face','{"the north face","north face",tnf}','thenorthface.com'),
 ('Topo Athletic','{topo,"topo athletic"}','topoathletic.com'),
 ('Under Armour','{"under armour",ua}','underarmour.co.uk'),
 ('VJ','{vj,"vj shoes","vj sport"}','vjshoes.com'),
 ('Xero Shoes','{xero,"xero shoes"}','xeroshoes.com');

-- Phantom row: the Ultra Raptor II is a La Sportiva shoe.
DELETE FROM "shoes" WHERE "slug" = 'asics-ultra-raptor-ii';

-- New shoe columns
ALTER TABLE "shoes"
  ADD COLUMN "brand_id" INTEGER,
  ADD COLUMN "release_date" TIMESTAMP(3),
  ADD COLUMN "image_source_url" TEXT,
  ADD COLUMN "image_method" TEXT,
  ADD COLUMN "image_verified_at" TIMESTAMP(3),
  ADD COLUMN "user_avg_score" DECIMAL(3,1),
  ADD COLUMN "user_rating_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "origin" "ShoeOrigin" NOT NULL DEFAULT 'seed',
  ADD COLUMN "added_by_user_id" INTEGER,
  ADD COLUMN "superseded_by_id" INTEGER;

-- Canonicalise brand text via aliases, then link
UPDATE "shoes" s SET "brand" = b."name"
FROM "shoe_brands" b
WHERE lower(s."brand") = ANY(b."aliases") OR lower(s."brand") = lower(b."name");

UPDATE "shoes" s SET "brand_id" = b."id" FROM "shoe_brands" b WHERE s."brand" = b."name";

-- Any brand still unlinked gets its own row so the NOT NULL holds
INSERT INTO "shoe_brands" ("name","aliases","domain")
SELECT DISTINCT s."brand", ARRAY[lower(s."brand")], lower(regexp_replace(s."brand", '[^A-Za-z0-9]', '', 'g')) || '.com'
FROM "shoes" s WHERE s."brand_id" IS NULL;
UPDATE "shoes" s SET "brand_id" = b."id" FROM "shoe_brands" b WHERE s."brand_id" IS NULL AND s."brand" = b."name";

ALTER TABLE "shoes" ALTER COLUMN "brand_id" SET NOT NULL;

-- Origin + added_by from description markers, then strip the markers
UPDATE "shoes" SET
  "origin" = 'user',
  "added_by_user_id" = (regexp_match("description", '\[added by user (\d+)\]'))[1]::int
WHERE "description" ~ '\[added by user \d+\]';
UPDATE "shoes" SET "origin" = 'discovery' WHERE "description" LIKE '%[auto-discovered]%';
UPDATE "shoes" SET "description" = NULLIF(btrim(regexp_replace("description", '\s*\[(added by user \d+|auto-discovered)\]', '', 'g')), '')
WHERE "description" ~ '\[(added by user \d+|auto-discovered)\]';

-- User rating aggregates
UPDATE "shoes" s SET
  "user_avg_score" = r.avg, "user_rating_count" = r.cnt
FROM (SELECT "shoe_id", round(avg("score"),1) AS avg, count(*) AS cnt FROM "shoe_user_ratings" GROUP BY "shoe_id") r
WHERE r."shoe_id" = s."id";

-- Enum casts
ALTER TABLE "shoes" ALTER COLUMN "terrain" TYPE "ShoeTerrain" USING "terrain"::"ShoeTerrain";
ALTER TABLE "shoes" ALTER COLUMN "category" TYPE "ShoeCategory" USING "category"::"ShoeCategory";
UPDATE "shoe_reviews" SET "source" = 'other'
WHERE "source" NOT IN ('runrepeat','runners_world','irunfar','believe_in_run','the_run_testers','running_shoes_guru','road_trail_run','doctors_of_running','other');
ALTER TABLE "shoe_reviews" ALTER COLUMN "source" TYPE "ReviewSource" USING "source"::"ReviewSource";

-- FKs and indexes
ALTER TABLE "shoes" ADD CONSTRAINT "shoes_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "shoe_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shoes" ADD CONSTRAINT "shoes_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "shoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "shoes_brand_id_idx" ON "shoes"("brand_id");
CREATE INDEX "shoes_user_avg_score_idx" ON "shoes"("user_avg_score");
CREATE INDEX "shoes_superseded_by_id_idx" ON "shoes"("superseded_by_id");

-- Candidates
CREATE TABLE "shoe_candidates" (
  "id" SERIAL PRIMARY KEY,
  "brand_id" INTEGER REFERENCES "shoe_brands"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "brand_text" TEXT NOT NULL,
  "model_text" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "status" "CandidateStatus" NOT NULL DEFAULT 'pending',
  "hold_reasons" TEXT[] NOT NULL DEFAULT '{}',
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "shoe_id" INTEGER UNIQUE REFERENCES "shoes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMP(3)
);
CREATE INDEX "shoe_candidates_status_idx" ON "shoe_candidates"("status");
```

- [ ] **Step 4: Generate the client and typecheck**

Run: `npx prisma generate && npm run typecheck`
Expected: typecheck FAILS in `src/app/api/shoes/*` and `src/lib/shoe-enrichment.ts` because `terrain`/`category`/`source` are now enums. That is expected; later tasks fix each file. Note the failing files in the commit message.

- [ ] **Step 5: Validate the migration against a scratch database**

Run:
```bash
createdb fmr_shoe_mig_test 2>/dev/null || true
pg_dump "$(grep DATABASE_PUBLIC_URL .env | cut -d= -f2- | tr -d '"')" --schema-only -t shoes -t shoe_reviews -t shoe_user_ratings -t users > /tmp/shoes-schema.sql
```
If `.env` has no `DATABASE_PUBLIC_URL`, use `DATABASE_URL`. If neither works from this Mac (Railway private network), skip this step and record that in the commit message; Task 15 dry-runs the migration with `prisma migrate diff` instead.
Then: `psql fmr_shoe_mig_test < /tmp/shoes-schema.sql && psql fmr_shoe_mig_test < prisma/migrations/20260913120000_add_shoe_pipeline/migration.sql`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260913120000_add_shoe_pipeline/migration.sql prisma/seed-data/shoe-brands.json
git commit -m "Shoes: add brands, candidates, enums and pipeline columns (migration)"
```

---

### Task 2: Pure helpers — taxonomy, versions, slug, brands

**Files:**
- Create: `src/lib/shoes/taxonomy.ts`, `src/lib/shoes/versions.ts`, `src/lib/shoes/slug.ts`, `src/lib/shoes/brands.ts`
- Test: `src/lib/shoes/versions.test.ts`, `src/lib/shoes/slug.test.ts`, `src/lib/shoes/brands.test.ts`

**Interfaces:**
- Produces:
  - `CATEGORY_LABELS: Record<ShoeCategory,string>`, `SOURCE_LABELS: Record<ReviewSource,string>`, `TERRAIN_LABELS: Record<ShoeTerrain,string>`, `isShoeCategory(x): x is ShoeCategory`, `isShoeTerrain(x): x is ShoeTerrain`
  - `parseModelVersion(model): VersionInfo`, `getAdjacentVersionStrings(model): string[]`, `findVersionConflict(model, text): string | null`, `isComparisonArticle(model, text): boolean`, `isSameLine(a, b): boolean`
  - `shoeToSlug(brand, model): string`, `urlMatchesShoe(url, brand, model): boolean`
  - `type Brand = { id: number; name: string; domain: string; newArrivalsUrl: string | null }`, `resolveBrand(text, brands: Brand[] ): Brand | null`, `loadBrands(deps?): Promise<Brand[]>`

- [ ] **Step 1: Write failing tests**

`src/lib/shoes/versions.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseModelVersion, findVersionConflict, isSameLine, getAdjacentVersionStrings } from './versions';

describe('parseModelVersion', () => {
  it('parses plain numbers', () => {
    expect(parseModelVersion('Clifton 10')).toMatchObject({ base: 'Clifton', versionNum: 10, pattern: 'number' });
  });
  it('parses v-prefix', () => {
    expect(parseModelVersion('Fresh Foam X 1080 V14')).toMatchObject({ base: 'Fresh Foam X 1080', versionNum: 14, pattern: 'v-prefix' });
  });
  it('parses roman numerals', () => {
    expect(parseModelVersion('Ultra Raptor II')).toMatchObject({ base: 'Ultra Raptor', versionNum: 2, pattern: 'roman' });
  });
  it('parses X-series', () => {
    expect(parseModelVersion('Mafate X2')).toMatchObject({ base: 'Mafate X', versionNum: 2, pattern: 'x-series' });
  });
  it('treats a trailing GTX as no version', () => {
    expect(parseModelVersion('Speedgoat 6 GTX').pattern).toBe('none');
  });
});

describe('findVersionConflict', () => {
  it('flags a neighbouring version when the exact model is absent', () => {
    expect(findVersionConflict('Ghost 16', 'Brooks Ghost 15 review')).toBe('Ghost 15');
  });
  it('does not flag when the exact model is present', () => {
    expect(findVersionConflict('Ghost 16', 'Ghost 16 vs Ghost 15')).toBeNull();
  });
});

describe('isSameLine', () => {
  it('matches the same base with different versions', () => {
    expect(isSameLine('Clifton 9', 'Clifton 10')).toBe(true);
  });
  it('rejects different bases', () => {
    expect(isSameLine('Clifton 10', 'Bondi 9')).toBe(false);
  });
  it('is case-insensitive', () => {
    expect(isSameLine('clifton 9', 'CLIFTON 10')).toBe(true);
  });
});

describe('getAdjacentVersionStrings', () => {
  it('returns neighbours -2..+3 excluding self', () => {
    expect(getAdjacentVersionStrings('Ghost 16')).toEqual(['Ghost 14', 'Ghost 15', 'Ghost 17', 'Ghost 18', 'Ghost 19']);
  });
});
```

`src/lib/shoes/slug.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { shoeToSlug, urlMatchesShoe } from './slug';

describe('shoeToSlug', () => {
  it('lower-cases and hyphenates', () => {
    expect(shoeToSlug('New Balance', 'Fresh Foam X 1080 V14')).toBe('new-balance-fresh-foam-x-1080-v14');
  });
  it('strips apostrophes and leading/trailing hyphens', () => {
    expect(shoeToSlug("Arc'teryx", ' Norvan LD 3 ')).toBe('arc-teryx-norvan-ld-3');
  });
});

describe('urlMatchesShoe', () => {
  it('matches when the slug is in the URL', () => {
    expect(urlMatchesShoe('https://www.hoka.com/en/gb/mens-road/clifton-10/1155141.html', 'Hoka', 'Clifton 10')).toBe(false);
    expect(urlMatchesShoe('https://sportsshoes.com/product/hoka-clifton-10-mens', 'Hoka', 'Clifton 10')).toBe(true);
  });
});
```

`src/lib/shoes/brands.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolveBrand, type Brand } from './brands';

const brands: Brand[] = [
  { id: 1, name: 'ASICS', aliases: ['asics'], domain: 'asics.com', newArrivalsUrl: null },
  { id: 2, name: 'Topo Athletic', aliases: ['topo', 'topo athletic'], domain: 'topoathletic.com', newArrivalsUrl: null },
  { id: 3, name: 'On', aliases: ['on', 'on running'], domain: 'on.com', newArrivalsUrl: null },
];

describe('resolveBrand', () => {
  it('resolves canonical name case-insensitively', () => {
    expect(resolveBrand('Asics', brands)?.name).toBe('ASICS');
  });
  it('resolves an alias', () => {
    expect(resolveBrand('Topo', brands)?.name).toBe('Topo Athletic');
  });
  it('trims and collapses whitespace', () => {
    expect(resolveBrand('  on   running ', brands)?.name).toBe('On');
  });
  it('returns null for unknown', () => {
    expect(resolveBrand('Ascics', brands)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/shoes`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`src/lib/shoes/taxonomy.ts`:
```ts
import { ShoeCategory, ReviewSource, ShoeTerrain } from '@prisma/client';

export const CATEGORY_LABELS: Record<ShoeCategory, string> = {
  daily_trainer: 'Daily Trainer',
  race: 'Race',
  long_run: 'Long Run',
  speed: 'Speed',
  ultra: 'Ultra',
  stability: 'Stability',
  max_cushion: 'Max Cushion',
  minimal: 'Minimal',
};

export const SOURCE_LABELS: Record<ReviewSource, string> = {
  runrepeat: 'RunRepeat',
  runners_world: "Runner's World",
  irunfar: 'iRunFar',
  believe_in_run: 'Believe in the Run',
  the_run_testers: 'The Run Testers',
  running_shoes_guru: 'Running Shoes Guru',
  road_trail_run: 'Road Trail Run',
  doctors_of_running: 'Doctors of Running',
  other: 'Other',
};

export const TERRAIN_LABELS: Record<ShoeTerrain, string> = { road: 'Road', trail: 'Trail', both: 'Road & Trail' };

export function isShoeCategory(x: unknown): x is ShoeCategory {
  return typeof x === 'string' && x in CATEGORY_LABELS;
}
export function isShoeTerrain(x: unknown): x is ShoeTerrain {
  return typeof x === 'string' && x in TERRAIN_LABELS;
}

/** Review-site domains, in the order results are preferred. */
export const REVIEW_SOURCES: { key: ReviewSource; domain: string }[] = [
  { key: 'runrepeat', domain: 'runrepeat.com' },
  { key: 'runners_world', domain: 'runnersworld.com' },
  { key: 'irunfar', domain: 'irunfar.com' },
  { key: 'believe_in_run', domain: 'believeintherun.com' },
  { key: 'the_run_testers', domain: 'theruntesters.com' },
  { key: 'running_shoes_guru', domain: 'runningshoesguru.com' },
  { key: 'road_trail_run', domain: 'roadtrailrun.com' },
  { key: 'doctors_of_running', domain: 'doctorsofrunning.com' },
];

export function identifySource(url: string): ReviewSource {
  for (const s of REVIEW_SOURCES) if (url.includes(s.domain)) return s.key;
  return 'other';
}
```

`src/lib/shoes/versions.ts`: move `parseModelVersion`, `getAdjacentVersionStrings`, `findVersionConflict`, `isComparisonArticle` verbatim from `src/lib/shoe-enrichment.ts:11-84`, exported. Add:
```ts
export function isSameLine(a: string, b: string): boolean {
  return parseModelVersion(a).base.toLowerCase().trim() === parseModelVersion(b).base.toLowerCase().trim();
}
```

`src/lib/shoes/slug.ts`: move `shoeToSlug` and `urlMatchesShoe` (`shoe-enrichment.ts:86-93`), both exported.

`src/lib/shoes/brands.ts`:
```ts
import { prisma } from '@/lib/db';

export interface Brand {
  id: number;
  name: string;
  aliases: string[];
  domain: string;
  newArrivalsUrl: string | null;
}

export interface BrandDeps {
  findAll: () => Promise<Brand[]>;
}

const liveDeps: BrandDeps = {
  findAll: async () =>
    (await prisma.shoe_brands.findMany({ orderBy: { name: 'asc' } })).map(b => ({
      id: b.id, name: b.name, aliases: b.aliases, domain: b.domain, newArrivalsUrl: b.new_arrivals_url,
    })),
};

let cache: Brand[] | null = null;

export async function loadBrands(deps: BrandDeps = liveDeps): Promise<Brand[]> {
  if (!cache) cache = await deps.findAll();
  return cache;
}

/** Test hook and for after inserting a brand. */
export function resetBrandCache() { cache = null; }

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function resolveBrand(text: string, brands: Brand[]): Brand | null {
  const n = norm(text);
  if (!n) return null;
  for (const b of brands) {
    if (norm(b.name) === n) return b;
    if (b.aliases.some(a => norm(a) === n)) return b;
  }
  return null;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/shoes`
Expected: PASS. (Note in `slug.test.ts` the hoka.com URL is expected `false`: it contains `clifton-10` but not `hoka-clifton-10`. That documents why `brandPage.ts` in Task 6 checks the model slug rather than `urlMatchesShoe`.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/shoes/taxonomy.ts src/lib/shoes/versions.ts src/lib/shoes/slug.ts src/lib/shoes/brands.ts src/lib/shoes/versions.test.ts src/lib/shoes/slug.test.ts src/lib/shoes/brands.test.ts
git commit -m "Shoes: pure helpers for taxonomy, versions, slugs and brand resolution"
```

---

### Task 3: Scores — normalisation and the single recompute

**Files:**
- Create: `src/lib/shoes/scores.ts`
- Test: `src/lib/shoes/scores.test.ts`

**Interfaces:**
- Produces: `extractExplicitScore(text): number | null` (moved), `averageTo1dp(nums: number[]): number | null`, `recomputeShoeScore(shoeId, deps?): Promise<{ avgScore: number | null; reviewCount: number; userAvgScore: number | null; userRatingCount: number }>`
- `ScoreDeps = { reviewScores(shoeId): Promise<number[]>; userScores(shoeId): Promise<number[]>; write(shoeId, data): Promise<void> }`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { extractExplicitScore, averageTo1dp, recomputeShoeScore } from './scores';

describe('extractExplicitScore', () => {
  it('reads x/10', () => expect(extractExplicitScore('Score: 9.2/10 overall')).toBe(9.2));
  it('doubles x/5', () => expect(extractExplicitScore('4.5 out of 5')).toBe(9));
  it('divides percentages', () => expect(extractExplicitScore('rated 87%')).toBe(8.7));
  it('doubles stars', () => expect(extractExplicitScore('4 stars')).toBe(8));
  it('returns null with nothing', () => expect(extractExplicitScore('great shoe')).toBeNull());
});

describe('averageTo1dp', () => {
  it('rounds to one decimal', () => expect(averageTo1dp([9, 8.25])).toBe(8.6));
  it('is null for empty', () => expect(averageTo1dp([])).toBeNull());
});

describe('recomputeShoeScore', () => {
  it('writes all four fields from the two score lists', async () => {
    const writes: unknown[] = [];
    const r = await recomputeShoeScore(7, {
      reviewScores: async () => [9, 8],
      userScores: async () => [7, 8, 9],
      write: async (_id, data) => { writes.push(data); },
    });
    expect(r).toEqual({ avgScore: 8.5, reviewCount: 2, userAvgScore: 8, userRatingCount: 3 });
    expect(writes[0]).toMatchObject({ avg_score: 8.5, review_count: 2, user_avg_score: 8, user_rating_count: 3 });
  });
  it('writes nulls when nothing is scored', async () => {
    const r = await recomputeShoeScore(7, {
      reviewScores: async () => [], userScores: async () => [], write: async () => {},
    });
    expect(r).toEqual({ avgScore: null, reviewCount: 0, userAvgScore: null, userRatingCount: 0 });
  });
});
```

- [ ] **Step 2: Run, expect FAIL (module missing)**

- [ ] **Step 3: Implement**

```ts
import { prisma } from '@/lib/db';

export function extractExplicitScore(text: string): number | null { /* moved verbatim from shoe-enrichment.ts:291-308 */ }

export function averageTo1dp(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export interface ScoreDeps {
  reviewScores: (shoeId: number) => Promise<number[]>;
  userScores: (shoeId: number) => Promise<number[]>;
  write: (shoeId: number, data: { avg_score: number | null; review_count: number; user_avg_score: number | null; user_rating_count: number; last_reviewed?: Date }) => Promise<void>;
}

const liveDeps: ScoreDeps = {
  reviewScores: async id => (await prisma.shoe_reviews.findMany({ where: { shoe_id: id, expert_score: { not: null } }, select: { expert_score: true } }))
    .map(r => Number(r.expert_score)),
  userScores: async id => (await prisma.shoe_user_ratings.findMany({ where: { shoe_id: id }, select: { score: true } })).map(r => Number(r.score)),
  write: async (id, data) => { await prisma.shoes.update({ where: { id }, data }); },
};

export async function recomputeShoeScore(shoeId: number, deps: ScoreDeps = liveDeps) {
  const [rs, us] = await Promise.all([deps.reviewScores(shoeId), deps.userScores(shoeId)]);
  const result = { avgScore: averageTo1dp(rs), reviewCount: rs.length, userAvgScore: averageTo1dp(us), userRatingCount: us.length };
  await deps.write(shoeId, { avg_score: result.avgScore, review_count: result.reviewCount, user_avg_score: result.userAvgScore, user_rating_count: result.userRatingCount });
  return result;
}
```

- [ ] **Step 4: Run tests, expect PASS**
- [ ] **Step 5: Commit** `git add src/lib/shoes/scores.ts src/lib/shoes/scores.test.ts && git commit -m "Shoes: single recomputeShoeScore for expert and user averages"`

---

### Task 4: Search, HTML and reviews modules (moves with enum typing)

**Files:**
- Create: `src/lib/shoes/search.ts`, `src/lib/shoes/html.ts`, `src/lib/shoes/reviews.ts`, `src/lib/shoes/specs.ts`
- Test: `src/lib/shoes/html.test.ts`
- Modify: `src/lib/shoe-enrichment.ts` → becomes a re-export shim (deleted in Task 13)

**Interfaces:**
- `search.ts`: `webSearch(query, count=8): Promise<SearchResult[]>`, `imageSearch(...)`, `sleep(ms)`; types `SearchResult {title,url,description}`.
- `html.ts`: `fetchPage(url, deps?): Promise<{ html: string; title: string } | null>`, `extractJsonLdProducts(html): JsonLdProduct[]` where `JsonLdProduct = { name?: string; image: string[]; releaseDate?: string; url?: string; description?: string; brand?: string }`, `extractMetaImages(html, baseUrl): string[]`, `decodeHtmlEntities`.
- `reviews.ts`: `fetchReviewsForShoe(brand, model, onProgress?, deps?): Promise<ReviewResult[]>` with `ReviewResult { source: ReviewSource; source_url: string; expert_score: number; summary: string | null }`; `ReviewDeps = { webSearch, completeText }`.
- `specs.ts`: `parseShoeSpecs(input: { brand: string; model: string; context: string }, deps?): Promise<ParsedSpecs>` with `ParsedSpecs { terrain: ShoeTerrain; category: ShoeCategory; description: string | null; drop_mm: number|null; weight_g: number|null; stack_height_mm: number|null; price_gbp: number|null; release_year: number|null }`. Throws `Error('bad_taxonomy')` if terrain/category are not enum members.

- [ ] **Step 1: Failing test for html.ts**

```ts
import { describe, it, expect } from 'vitest';
import { extractJsonLdProducts, extractMetaImages } from './html';

const page = `<html><head><title>Hoka Clifton 10</title>
<meta property="og:image" content="/img/og.jpg">
<script type="application/ld+json">{"@type":"Product","name":"Clifton 10","image":["https://cdn/a.jpg","https://cdn/b.jpg"],"releaseDate":"2026-02-01"}</script>
<script type="application/ld+json">{"@type":"BreadcrumbList","image":"https://cdn/crumb.jpg"}</script>
<script type="application/ld+json">[{"@type":["Product","Thing"],"image":{"url":"https://cdn/c.jpg"}}]</script>
</head></html>`;

describe('extractJsonLdProducts', () => {
  it('returns only Product entities with images flattened', () => {
    const p = extractJsonLdProducts(page);
    expect(p).toHaveLength(2);
    expect(p[0]).toMatchObject({ name: 'Clifton 10', image: ['https://cdn/a.jpg', 'https://cdn/b.jpg'], releaseDate: '2026-02-01' });
    expect(p[1].image).toEqual(['https://cdn/c.jpg']);
  });
});

describe('extractMetaImages', () => {
  it('resolves relative og:image against the page URL', () => {
    expect(extractMetaImages(page, 'https://www.hoka.com/en/gb/x')).toEqual(['https://www.hoka.com/img/og.jpg']);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

`search.ts`: move lines 110-233 of `shoe-enrichment.ts` (Serper + Brave web/image search, `webSearch`, `imageSearch`, `getBraveKey`, `getSerperKey`) and `sleep`. Export `webSearch`, `imageSearch`, `sleep`, `SearchResult`, `ImageSearchResult`.

`html.ts`: `fetchPage` is `fetchPageData` from lines 457-540 minus the image extraction, returning `{ html, title }` (10 s timeout, Chrome UA, follow redirects, null on non-OK). `extractJsonLdProducts` is the JSON-LD block from that function with the `isProduct` filter, also picking up `name`, `releaseDate`, `url`, `description`, `brand` (`brand.name` if object). `extractMetaImages` is the og/twitter meta block with the `//` and `/` resolution. `decodeHtmlEntities` moved verbatim.

`reviews.ts`: move `inferScoreFromText`, `claudeVerifyResult`, `fetchReviewsForShoe` from lines 310-443. Replace `identifySource` with the import from `taxonomy.ts`; `ReviewResult.source` is typed `ReviewSource`. Wrap the two network calls in `deps`:
```ts
export interface ReviewDeps { webSearch: typeof webSearch; completeText: typeof completeText; }
export async function fetchReviewsForShoe(brand: string, model: string, onProgress?: (m: string) => void, deps: ReviewDeps = { webSearch, completeText }): Promise<ReviewResult[]>
```
`extractExplicitScore` is imported from `scores.ts`.

`specs.ts`:
```ts
import { completeText } from '@/lib/llm';
import { isShoeCategory, isShoeTerrain } from './taxonomy';
import type { ShoeCategory, ShoeTerrain } from '@prisma/client';

export interface ParsedSpecs { terrain: ShoeTerrain; category: ShoeCategory; description: string | null; drop_mm: number | null; weight_g: number | null; stack_height_mm: number | null; price_gbp: number | null; release_year: number | null; }

export async function parseShoeSpecs(input: { brand: string; model: string; context: string }, deps = { completeText }): Promise<ParsedSpecs> {
  const text = await deps.completeText({
    maxTokens: 400,
    prompt: `Extract running shoe details for the ${input.brand} ${input.model} from this page content.

Content:
${input.context.slice(0, 3000)}

Reply with ONLY valid JSON (no markdown):
{
  "terrain": "road" | "trail" | "both",
  "category": "daily_trainer" | "race" | "long_run" | "speed" | "ultra" | "stability" | "max_cushion" | "minimal",
  "description": "One sentence description of the shoe",
  "drop_mm": number or null,
  "weight_g": number or null (men's weight),
  "stack_height_mm": number or null (heel),
  "price_gbp": number or null (price in pence, e.g. 16000 for £160),
  "release_year": number or null
}

Rules: only include specs stated in the content; use null otherwise. terrain and category must be one of the listed values.`,
  });
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('specs_unparseable');
  const j = JSON.parse(m[0]);
  if (!isShoeTerrain(j.terrain) || !isShoeCategory(j.category)) throw new Error('bad_taxonomy');
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
  return { terrain: j.terrain, category: j.category, description: typeof j.description === 'string' ? j.description : null,
    drop_mm: num(j.drop_mm), weight_g: num(j.weight_g), stack_height_mm: num(j.stack_height_mm), price_gbp: num(j.price_gbp), release_year: num(j.release_year) };
}
```

Then reduce `src/lib/shoe-enrichment.ts` to re-exports so the not-yet-migrated routes still compile:
```ts
export { shoeToSlug } from './shoes/slug';
export { webSearch } from './shoes/search';
export { fetchReviewsForShoe } from './shoes/reviews';
export { parseShoeSpecs as parseShoeQuery } from './shoes/specs';
// findImageForShoe is replaced in Task 8
```
(`add/route.ts` and `weekly-update/route.ts` will not typecheck yet because `parseShoeQuery`'s signature changed and `findImageForShoe` is gone. That is fine; they are rewritten in Tasks 10 and 11. Run `npm run typecheck` and confirm the ONLY failing files are those two.)

- [ ] **Step 4: Run `npx vitest run src/lib/shoes` → PASS; `npm run typecheck` → only the two route files fail.**

- [ ] **Step 5: Commit** `git add src/lib/shoes src/lib/shoe-enrichment.ts && git commit -m "Shoes: move search, HTML, reviews and spec parsing into src/lib/shoes"`

---

### Task 5: Discovery sources (RSS, brand pages, search)

**Files:**
- Create: `src/lib/shoes/discovery/types.ts`, `sources/rss.ts`, `sources/brandPages.ts`, `sources/search.ts`
- Test: `src/lib/shoes/discovery/sources/rss.test.ts`, `brandPages.test.ts`
- Create fixtures: `src/lib/shoes/discovery/sources/__fixtures__/runningshoesguru.xml`, `theruntesters.xml`

**Interfaces:**
- `types.ts`:
```ts
export interface Nomination { brandText?: string; modelText: string; title: string; url: string; publishedAt: Date | null; source: string; /* feed key, brand name, or 'search' */ }
export interface SourceResult { source: string; nominations: Nomination[]; empty: boolean; error?: string }
```
- `rss.ts`: `FEEDS: { key: string; url: string }[]`, `readFeed(feed, deps?): Promise<SourceResult>`, `readAllFeeds(deps?): Promise<SourceResult[]>`; `RssDeps = { fetchText(url): Promise<string> }`.
- `brandPages.ts`: `readBrandNewArrivals(brand: Brand, deps?): Promise<SourceResult>`.
- `search.ts`: `searchNominations(deps?): Promise<SourceResult>`.

- [ ] **Step 1: Fetch two real feeds as fixtures** (these are test data, commit them)

```bash
mkdir -p src/lib/shoes/discovery/sources/__fixtures__
curl -sL -A "Mozilla/5.0" https://www.runningshoesguru.com/feed/ > src/lib/shoes/discovery/sources/__fixtures__/runningshoesguru.xml
curl -sL -A "Mozilla/5.0" https://theruntesters.com/feed/ > src/lib/shoes/discovery/sources/__fixtures__/theruntesters.xml
```

- [ ] **Step 2: Failing tests**

`rss.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { readFeed, titleLooksLikeShoe } from './rss';

const fx = (n: string) => readFileSync(join(__dirname, '__fixtures__', n), 'utf8');

describe('titleLooksLikeShoe', () => {
  it('accepts review titles with a version number', () => {
    expect(titleLooksLikeShoe('Hoka Clifton 10 Review')).toBe(true);
    expect(titleLooksLikeShoe('New Balance 1080 v14 First Look')).toBe(true);
  });
  it('rejects general articles', () => {
    expect(titleLooksLikeShoe('How to pace a marathon')).toBe(false);
  });
});

describe('readFeed', () => {
  it('turns feed items into nominations', async () => {
    const r = await readFeed({ key: 'running_shoes_guru', url: 'x' }, { fetchText: async () => fx('runningshoesguru.xml') });
    expect(r.empty).toBe(false);
    expect(r.nominations.length).toBeGreaterThan(0);
    for (const n of r.nominations) {
      expect(n.source).toBe('running_shoes_guru');
      expect(n.url).toMatch(/^https?:/);
      expect(n.publishedAt).toBeInstanceOf(Date);
      expect(n.modelText).toBe(n.title);
    }
  });
  it('flags an empty or unreachable feed', async () => {
    const r = await readFeed({ key: 'x', url: 'x' }, { fetchText: async () => { throw new Error('403'); } });
    expect(r).toMatchObject({ empty: true, error: '403', nominations: [] });
  });
});
```

`brandPages.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readBrandNewArrivals } from './brandPages';

const html = `<script type="application/ld+json">{"@type":"ItemList","itemListElement":[
 {"@type":"Product","name":"Clifton 10","url":"https://www.hoka.com/x/clifton-10","releaseDate":"2026-03-01","image":"https://cdn/a.jpg"},
 {"@type":"Product","name":"Bondi 9","url":"https://www.hoka.com/x/bondi-9","image":"https://cdn/b.jpg"}]}</script>`;

describe('readBrandNewArrivals', () => {
  it('nominates every Product on the listing with the brand attached', async () => {
    const r = await readBrandNewArrivals(
      { id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: 'https://www.hoka.com/new' },
      { fetchPage: async () => ({ html, title: 'New' }) },
    );
    expect(r.nominations).toEqual([
      expect.objectContaining({ brandText: 'Hoka', modelText: 'Clifton 10', url: 'https://www.hoka.com/x/clifton-10', source: 'brand:Hoka' }),
      expect.objectContaining({ brandText: 'Hoka', modelText: 'Bondi 9', publishedAt: null }),
    ]);
  });
  it('returns empty without error when the brand has no listing URL', async () => {
    const r = await readBrandNewArrivals({ id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: null }, { fetchPage: async () => null });
    expect(r).toMatchObject({ empty: true, nominations: [] });
    expect(r.error).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run, expect FAIL**

- [ ] **Step 4: Implement**

`rss.ts`:
```ts
import Parser from 'rss-parser';
import type { Nomination, SourceResult } from '../types';

export const FEEDS: { key: string; url: string }[] = [
  { key: 'running_shoes_guru', url: 'https://www.runningshoesguru.com/feed/' },
  { key: 'the_run_testers', url: 'https://theruntesters.com/feed/' },
  { key: 'runners_world', url: 'https://www.runnersworld.com/uk/rss/all.xml/' },
  { key: 'irunfar', url: 'https://www.irunfar.com/feed' },
  { key: 'believe_in_run', url: 'https://believeintherun.com/feed/' },
  { key: 'road_trail_run', url: 'https://www.roadtrailrun.com/feeds/posts/default?alt=rss' },
  { key: 'doctors_of_running', url: 'https://www.doctorsofrunning.com/feeds/posts/default?alt=rss' },
];

const SHOE_TITLE = /(review|first look|first run|preview|launch|tested|multi[- ]tester|\bv\d{1,2}\b|\b\d{1,2}\b|\b(ii|iii|iv|v|vi|vii|viii|ix|x)\b)/i;

export function titleLooksLikeShoe(title: string): boolean {
  return SHOE_TITLE.test(title);
}

export interface RssDeps { fetchText: (url: string) => Promise<string> }

const liveDeps: RssDeps = {
  fetchText: async url => {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    if (!res.ok && !text.includes('<item') && !text.includes('<entry')) throw new Error(`HTTP ${res.status}`);
    return text; // irunfar returns 406 with a valid body
  },
};

export async function readFeed(feed: { key: string; url: string }, deps: RssDeps = liveDeps): Promise<SourceResult> {
  try {
    const xml = await deps.fetchText(feed.url);
    const parsed = await new Parser().parseString(xml);
    const nominations: Nomination[] = [];
    for (const item of parsed.items) {
      const title = (item.title ?? '').trim();
      const url = item.link ?? '';
      if (!title || !url || !titleLooksLikeShoe(title)) continue;
      const d = item.isoDate ?? item.pubDate;
      nominations.push({ modelText: title, title, url, publishedAt: d ? new Date(d) : null, source: feed.key });
    }
    return { source: feed.key, nominations, empty: parsed.items.length === 0 };
  } catch (err) {
    return { source: feed.key, nominations: [], empty: true, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function readAllFeeds(deps: RssDeps = liveDeps): Promise<SourceResult[]> {
  return Promise.all(FEEDS.map(f => readFeed(f, deps)));
}
```

`brandPages.ts`:
```ts
import { fetchPage, extractJsonLdProducts } from '../../html';
import type { Brand } from '../../brands';
import type { SourceResult } from '../types';

export interface BrandPageDeps { fetchPage: typeof fetchPage }

export async function readBrandNewArrivals(brand: Brand, deps: BrandPageDeps = { fetchPage }): Promise<SourceResult> {
  const source = `brand:${brand.name}`;
  if (!brand.newArrivalsUrl) return { source, nominations: [], empty: true };
  const page = await deps.fetchPage(brand.newArrivalsUrl);
  if (!page) return { source, nominations: [], empty: true, error: 'unreachable' };
  const products = extractJsonLdProducts(page.html);
  const nominations = products.filter(p => p.name).map(p => ({
    brandText: brand.name, modelText: p.name!, title: p.name!, url: p.url ?? brand.newArrivalsUrl!,
    publishedAt: p.releaseDate ? new Date(p.releaseDate) : null, source,
  }));
  return { source, nominations, empty: nominations.length === 0 };
}
```
`extractJsonLdProducts` must also descend into `ItemList.itemListElement` (and `ListItem.item`) to find nested Products; extend it in `html.ts` and add a test case there.

`search.ts` (discovery): today's `discoverNewShoes` queries, but each search result becomes a `Nomination` `{ modelText: title, title, url, publishedAt: null, source: 'search' }` with no LLM call. Uses `webSearch` from `../../search` via deps.

- [ ] **Step 5: Run `npx vitest run src/lib/shoes` → PASS**

- [ ] **Step 6: Live probe of the blocked feeds** (record findings in the commit message; update `FEEDS` URLs where a working one is found)

```bash
for u in https://believeintherun.com/feed/ https://believeintherun.com/category/reviews/feed/ https://www.roadtrailrun.com/feeds/posts/default https://www.roadtrailrun.com/rss.xml https://www.doctorsofrunning.com/feeds/posts/default https://www.doctorsofrunning.com/rss.xml; do printf "%s " "$u"; curl -sL -o /tmp/f -w "%{http_code} " -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -H "Accept: application/rss+xml, application/xml, */*" --max-time 15 "$u"; grep -c "<item\|<entry" /tmp/f; done
```
Also try `/sitemap.xml` for each. If nothing works for a site, leave its entry in `FEEDS` (it will report `feed_empty` in the digest, which is the designed behaviour) and note it.

- [ ] **Step 7: Commit** `git add src/lib/shoes/discovery src/lib/shoes/html.ts src/lib/shoes/html.test.ts && git commit -m "Shoes: discovery sources — review feeds, brand new-arrivals pages, search nominator"`

---

### Task 6: Normalisation, dedupe and `discover()`

**Files:**
- Create: `src/lib/shoes/discovery/normalise.ts`, `src/lib/shoes/discovery/index.ts`
- Test: `src/lib/shoes/discovery/normalise.test.ts`, `src/lib/shoes/discovery/index.test.ts`

**Interfaces:**
- `normalise.ts`:
```ts
export interface Resolved { brand: Brand; model: string; slug: string; nominations: Nomination[] }
export interface Unresolved { brandText: string; model: string; slug: string; nominations: Nomination[] }
export async function normalise(noms: Nomination[], brands: Brand[], deps?: { completeText }): Promise<{ resolved: Resolved[]; unresolved: Unresolved[] }>
```
- `index.ts`:
```ts
export interface DiscoverDeps { readAllFeeds; readBrandNewArrivals; searchNominations; loadBrands; completeText; existingSlugs(): Promise<{ slug: string; brand: string; model: string }[]>; upsertCandidate(c: CandidateUpsert): Promise<void>; }
export interface CandidateUpsert { slug: string; brandId: number | null; brandText: string; modelText: string; holdReasons: string[]; evidence: { sources: { source: string; url: string; title: string; publishedAt: string | null }[] } }
export interface DiscoverReport { nominations: number; candidatesUpserted: number; alreadyKnown: number; feedsEmpty: string[] }
export async function discover(deps?: DiscoverDeps): Promise<DiscoverReport>
```

- [ ] **Step 1: Failing tests**

`normalise.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalise } from './normalise';
import type { Brand } from '../brands';

const brands: Brand[] = [
  { id: 1, name: 'Hoka', aliases: ['hoka'], domain: 'hoka.com', newArrivalsUrl: null },
  { id: 2, name: 'La Sportiva', aliases: ['la sportiva'], domain: 'lasportiva.com', newArrivalsUrl: null },
];
const nom = (title: string, source = 'feed') => ({ modelText: title, title, url: `https://x/${title}`, publishedAt: null, source });

describe('normalise', () => {
  it('asks the LLM once, resolves brands and groups by slug', async () => {
    let calls = 0;
    const r = await normalise([nom('Hoka Clifton 10 Review'), nom('HOKA Clifton 10 first look'), nom('Asics Ultra Raptor II review')], brands, {
      completeText: async () => { calls++; return JSON.stringify([{ i: 0, brand: 'Hoka', model: 'Clifton 10' }, { i: 1, brand: 'Hoka', model: 'Clifton 10' }, { i: 2, brand: 'Asics', model: 'Ultra Raptor II' }]); },
    });
    expect(calls).toBe(1);
    expect(r.resolved).toHaveLength(1);
    expect(r.resolved[0]).toMatchObject({ brand: { name: 'Hoka' }, model: 'Clifton 10', slug: 'hoka-clifton-10' });
    expect(r.resolved[0].nominations).toHaveLength(2);
    expect(r.unresolved).toEqual([expect.objectContaining({ brandText: 'Asics', model: 'Ultra Raptor II' })]);
  });
  it('prefers a brand supplied by the source over the LLM', async () => {
    const r = await normalise([{ ...nom('Clifton 10'), brandText: 'Hoka' }], brands, { completeText: async () => JSON.stringify([{ i: 0, brand: 'Hokа', model: 'Clifton 10' }]) });
    expect(r.resolved[0].brand.name).toBe('Hoka');
  });
  it('drops rows the LLM returns without a version-bearing model', async () => {
    const r = await normalise([nom('Best trail shoes 2026')], brands, { completeText: async () => JSON.stringify([{ i: 0, brand: 'Hoka', model: '' }]) });
    expect(r.resolved).toHaveLength(0);
    expect(r.unresolved).toHaveLength(0);
  });
  it('returns nothing on unparseable LLM output', async () => {
    const r = await normalise([nom('x 2')], brands, { completeText: async () => 'sorry' });
    expect(r).toEqual({ resolved: [], unresolved: [] });
  });
});
```

`index.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { discover } from './index';

const brands = [{ id: 1, name: 'Hoka', aliases: ['hoka'], domain: 'hoka.com', newArrivalsUrl: null }];
const nom = (title: string, source: string) => ({ modelText: title, title, url: `https://x/${title}`, publishedAt: new Date('2026-09-01'), source });

describe('discover', () => {
  it('upserts new candidates, skips known slugs and same-line-same-version, reports empty feeds', async () => {
    const upserts: unknown[] = [];
    const r = await discover({
      readAllFeeds: async () => [
        { source: 'a', nominations: [nom('Hoka Clifton 10 review', 'a'), nom('Hoka Bondi 9 review', 'a')], empty: false },
        { source: 'b', nominations: [], empty: true, error: '403' },
      ],
      readBrandNewArrivals: async () => ({ source: 'brand:Hoka', nominations: [], empty: true }),
      searchNominations: async () => ({ source: 'search', nominations: [nom('Asics Novablast 5', 'search')], empty: false }),
      loadBrands: async () => brands,
      completeText: async () => JSON.stringify([{ i: 0, brand: 'Hoka', model: 'Clifton 10' }, { i: 1, brand: 'Hoka', model: 'Bondi 9' }, { i: 2, brand: 'Asics', model: 'Novablast 5' }]),
      existingSlugs: async () => [{ slug: 'hoka-bondi-9', brand: 'Hoka', model: 'Bondi 9' }],
      upsertCandidate: async c => { upserts.push(c); },
    });
    expect(r).toMatchObject({ nominations: 3, candidatesUpserted: 2, alreadyKnown: 1, feedsEmpty: ['b'] });
    expect(upserts[0]).toMatchObject({ slug: 'hoka-clifton-10', brandId: 1, holdReasons: [] });
    expect(upserts[1]).toMatchObject({ slug: 'asics-novablast-5', brandId: null, holdReasons: ['brand_unresolved'] });
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

`normalise.ts`:
```ts
import { completeText } from '@/lib/llm';
import { resolveBrand, type Brand } from '../brands';
import { shoeToSlug } from '../slug';
import { parseModelVersion } from '../versions';
import type { Nomination } from './types';

export interface Resolved { brand: Brand; model: string; slug: string; nominations: Nomination[] }
export interface Unresolved { brandText: string; model: string; slug: string; nominations: Nomination[] }

export async function normalise(noms: Nomination[], brands: Brand[], deps = { completeText }): Promise<{ resolved: Resolved[]; unresolved: Unresolved[] }> {
  if (noms.length === 0) return { resolved: [], unresolved: [] };
  const rows = noms.map((n, i) => `${i}\t${n.brandText ?? ''}\t${n.title}`).join('\n');
  const text = await deps.completeText({
    maxTokens: 2000,
    prompt: `Each line below is "index<TAB>brand-if-known<TAB>headline" from a running-shoe website. For each line that is about ONE specific running shoe model, give the brand and the model name INCLUDING its version number or suffix (e.g. "Clifton 10", "1080 v14", "Ultra Raptor II", "Speedgoat 6 GTX"). Skip lines about several shoes, gear roundups, or no specific shoe.

${rows}

Reply with ONLY a JSON array, no markdown: [{"i": 0, "brand": "Hoka", "model": "Clifton 10"}]`,
  });
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return { resolved: [], unresolved: [] };
  let parsed: { i: number; brand: string; model: string }[];
  try { parsed = JSON.parse(m[0]); } catch { return { resolved: [], unresolved: [] }; }

  const resolvedMap = new Map<string, Resolved>();
  const unresolvedMap = new Map<string, Unresolved>();
  for (const row of parsed) {
    const nom = noms[row.i];
    if (!nom) continue;
    const model = (row.model ?? '').trim();
    if (!model || parseModelVersion(model).pattern === 'none' && !/\b(gtx|plus|max|pro|elite|premium)\b/i.test(model)) continue;
    const brandText = (nom.brandText ?? row.brand ?? '').trim();
    const brand = resolveBrand(brandText, brands);
    if (brand) {
      const slug = shoeToSlug(brand.name, model);
      const e = resolvedMap.get(slug);
      if (e) e.nominations.push(nom); else resolvedMap.set(slug, { brand, model, slug, nominations: [nom] });
    } else {
      const slug = shoeToSlug(brandText || 'unknown', model);
      const e = unresolvedMap.get(slug);
      if (e) e.nominations.push(nom); else unresolvedMap.set(slug, { brandText, model, slug, nominations: [nom] });
    }
  }
  return { resolved: [...resolvedMap.values()], unresolved: [...unresolvedMap.values()] };
}
```

`index.ts`:
```ts
import { prisma } from '@/lib/db';
import { completeText } from '@/lib/llm';
import { loadBrands } from '../brands';
import { isSameLine, parseModelVersion } from '../versions';
import { readAllFeeds } from './sources/rss';
import { readBrandNewArrivals } from './sources/brandPages';
import { searchNominations } from './sources/search';
import { normalise } from './normalise';
import type { Nomination } from './types';

export interface CandidateUpsert { slug: string; brandId: number | null; brandText: string; modelText: string; holdReasons: string[]; evidence: { sources: { source: string; url: string; title: string; publishedAt: string | null }[] } }
export interface DiscoverDeps {
  readAllFeeds: typeof readAllFeeds; readBrandNewArrivals: typeof readBrandNewArrivals; searchNominations: typeof searchNominations;
  loadBrands: typeof loadBrands; completeText: typeof completeText;
  existingSlugs: () => Promise<{ slug: string; brand: string; model: string }[]>;
  upsertCandidate: (c: CandidateUpsert) => Promise<void>;
}
export interface DiscoverReport { nominations: number; candidatesUpserted: number; alreadyKnown: number; feedsEmpty: string[] }

const liveDeps: DiscoverDeps = {
  readAllFeeds, readBrandNewArrivals, searchNominations, loadBrands, completeText,
  existingSlugs: async () => prisma.shoes.findMany({ select: { slug: true, brand: true, model: true } }),
  upsertCandidate: async c => {
    await prisma.shoe_candidates.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, brand_id: c.brandId, brand_text: c.brandText, model_text: c.modelText, hold_reasons: c.holdReasons, evidence: c.evidence, status: c.holdReasons.length ? 'held' : 'pending' },
      update: { last_seen_at: new Date(), evidence: c.evidence, brand_id: c.brandId ?? undefined },
    });
  },
};

function evidenceOf(noms: Nomination[]) {
  return { sources: noms.map(n => ({ source: n.source, url: n.url, title: n.title, publishedAt: n.publishedAt?.toISOString() ?? null })) };
}

export async function discover(deps: DiscoverDeps = liveDeps): Promise<DiscoverReport> {
  const brands = await deps.loadBrands();
  const feedResults = await deps.readAllFeeds();
  const brandResults = await Promise.all(brands.filter(b => b.newArrivalsUrl).map(b => deps.readBrandNewArrivals(b)));
  const searchResult = await deps.searchNominations();
  const all = [...feedResults, ...brandResults, searchResult];
  const noms = all.flatMap(r => r.nominations);
  const feedsEmpty = all.filter(r => r.empty && r.source !== 'search' && !r.source.startsWith('brand:')).map(r => r.source);

  const { resolved, unresolved } = await normalise(noms, brands, { completeText: deps.completeText });
  const existing = await deps.existingSlugs();
  const existingSlugs = new Set(existing.map(e => e.slug));

  let upserted = 0, known = 0;
  for (const r of resolved) {
    const sameVersionExists = existingSlugs.has(r.slug) || existing.some(e => e.brand === r.brand.name && isSameLine(e.model, r.model) && parseModelVersion(e.model).versionNum === parseModelVersion(r.model).versionNum);
    if (sameVersionExists) { known++; continue; }
    await deps.upsertCandidate({ slug: r.slug, brandId: r.brand.id, brandText: r.brand.name, modelText: r.model, holdReasons: [], evidence: evidenceOf(r.nominations) });
    upserted++;
  }
  for (const u of unresolved) {
    await deps.upsertCandidate({ slug: u.slug, brandId: null, brandText: u.brandText, modelText: u.model, holdReasons: ['brand_unresolved'], evidence: evidenceOf(u.nominations) });
    upserted++;
  }
  return { nominations: noms.length, candidatesUpserted: upserted, alreadyKnown: known, feedsEmpty };
}
```

- [ ] **Step 4: Run tests → PASS. Typecheck → still only the two route files.**
- [ ] **Step 5: Commit** `git add src/lib/shoes/discovery && git commit -m "Shoes: normalise nominations, dedupe against the catalogue, upsert candidates"`

---

### Task 7: Publish gate — brand page, evaluation, publish

**Files:**
- Create: `src/lib/shoes/publish/brandPage.ts`, `gate.ts`, `publish.ts`
- Test: `src/lib/shoes/publish/brandPage.test.ts`, `gate.test.ts`

**Interfaces:**
- `brandPage.ts`: `findBrandProductPage(brand: Brand, model: string, deps?): Promise<BrandPage | null>` with `BrandPage = { url: string; title: string; html: string; product: JsonLdProduct | null; releaseDate: Date | null }`; `BrandPageDeps = { webSearch, fetchPage }`. Search `site:{brand.domain} "{model}"`, up to 5 results; accept the first whose URL contains the model slug (`shoeToSlug('', model)` minus leading hyphen) **or** whose `<title>` contains the model (case-insensitive) **and** `findVersionConflict(model, title) === null`.
- `gate.ts`:
```ts
export type HoldReason = 'brand_unresolved' | 'no_brand_page' | 'too_old' | 'reviews_lt_2' | 'bad_taxonomy' | 'specs_unparseable';
export interface CandidateInput { id: number; slug: string; brand: Brand | null; model: string; evidence: { sources: { source: string; url: string; title: string; publishedAt: string | null }[] } }
export interface GatePass { publish: true; brandPage: BrandPage; specs: ParsedSpecs; reviews: ReviewResult[]; releaseDate: Date | null; softReasons: [] | ['no_image'] }
export interface GateHold { publish: false; reasons: HoldReason[]; partial: { brandPage?: BrandPage; reviews?: ReviewResult[] } }
export async function evaluate(c: CandidateInput, deps?: GateDeps, opts?: { override?: HoldReason[] }): Promise<GatePass | GateHold>
```
  `GateDeps = { findBrandProductPage, fetchReviewsForShoe, parseShoeSpecs, now(): Date }`. `MAX_AGE_MONTHS = 15`. `opts.override` lists reasons to ignore (used by the publish-anyway link for `too_old` and `reviews_lt_2` only).
- `publish.ts`: `publishCandidate(c: CandidateInput, pass: GatePass, deps?): Promise<{ shoeId: number; slug: string; supersededSlug: string | null }>`. Creates the `shoes` row (`origin: 'discovery'`, `brand`, `brand_id`, `release_date`, `release_year` from specs or releaseDate), upserts reviews, calls `recomputeShoeScore`, finds a same-line lower-version shoe of the same brand and sets its `superseded_by_id`, marks the candidate `published` with `shoe_id` and `decided_at`. `PublishDeps` wraps the Prisma calls.

- [ ] **Step 1: Failing tests**

`brandPage.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { findBrandProductPage } from './brandPage';
const hoka = { id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: null };

describe('findBrandProductPage', () => {
  it('accepts a result whose URL contains the model slug', async () => {
    const r = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [{ title: 'Men\'s Clifton', url: 'https://www.hoka.com/en/gb/clifton-10/1.html', description: '' }],
      fetchPage: async () => ({ html: '<script type="application/ld+json">{"@type":"Product","name":"Clifton 10","image":"https://c/a.jpg","releaseDate":"2026-01-15"}</script>', title: "Men's Clifton" }),
    });
    expect(r?.url).toContain('clifton-10');
    expect(r?.releaseDate?.toISOString()).toBe('2026-01-15T00:00:00.000Z');
    expect(r?.product?.image).toEqual(['https://c/a.jpg']);
  });
  it('rejects a neighbouring version', async () => {
    const r = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [{ title: 'Hoka Clifton 9', url: 'https://www.hoka.com/x/clifton-9/1.html', description: '' }],
      fetchPage: async () => ({ html: '', title: 'Hoka Clifton 9' }),
    });
    expect(r).toBeNull();
  });
  it('accepts on title when the URL is opaque', async () => {
    const r = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [{ title: 'Clifton 10 | HOKA UK', url: 'https://www.hoka.com/p/1155141', description: '' }],
      fetchPage: async () => ({ html: '', title: 'Clifton 10 | HOKA UK' }),
    });
    expect(r?.url).toBe('https://www.hoka.com/p/1155141');
  });
});
```

`gate.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { evaluate } from './gate';

const hoka = { id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: null };
const page = { url: 'https://www.hoka.com/clifton-10', title: 'Clifton 10', html: '', product: null, releaseDate: new Date('2026-02-01') };
const specs = { terrain: 'road' as const, category: 'daily_trainer' as const, description: 'x', drop_mm: 5, weight_g: 250, stack_height_mm: 40, price_gbp: 14000, release_year: 2026 };
const review = (source: string) => ({ source: source as never, source_url: `https://${source}`, expert_score: 8.5, summary: null });
const cand = (over: Partial<Parameters<typeof evaluate>[0]> = {}) => ({ id: 1, slug: 'hoka-clifton-10', brand: hoka, model: 'Clifton 10', evidence: { sources: [] }, ...over });
const ok = () => ({ findBrandProductPage: async () => page, fetchReviewsForShoe: async () => [review('runrepeat'), review('irunfar')], parseShoeSpecs: async () => specs, now: () => new Date('2026-09-13') });

describe('evaluate', () => {
  it('passes with brand page, recent release, two reviews', async () => {
    const r = await evaluate(cand(), ok());
    expect(r.publish).toBe(true);
  });
  it('holds brand_unresolved without calling anything', async () => {
    let called = false;
    const r = await evaluate(cand({ brand: null }), { ...ok(), findBrandProductPage: async () => { called = true; return page; } });
    expect(r).toMatchObject({ publish: false, reasons: ['brand_unresolved'] });
    expect(called).toBe(false);
  });
  it('holds no_brand_page', async () => {
    const r = await evaluate(cand(), { ...ok(), findBrandProductPage: async () => null });
    expect(r).toMatchObject({ publish: false, reasons: ['no_brand_page'] });
  });
  it('holds too_old using the brand releaseDate', async () => {
    const r = await evaluate(cand(), { ...ok(), findBrandProductPage: async () => ({ ...page, releaseDate: new Date('2024-01-01') }) });
    expect(r).toMatchObject({ publish: false, reasons: ['too_old'] });
  });
  it('falls back to the earliest review date when the brand page has none', async () => {
    const r = await evaluate(cand({ evidence: { sources: [{ source: 'a', url: '', title: '', publishedAt: '2026-08-01T00:00:00Z' }] } }), { ...ok(), findBrandProductPage: async () => ({ ...page, releaseDate: null }) });
    expect(r.publish).toBe(true);
  });
  it('holds reviews_lt_2 and keeps the brand page as partial evidence', async () => {
    const r = await evaluate(cand(), { ...ok(), fetchReviewsForShoe: async () => [review('runrepeat')] });
    expect(r).toMatchObject({ publish: false, reasons: ['reviews_lt_2'], partial: { brandPage: page } });
  });
  it('holds bad_taxonomy when specs throw it', async () => {
    const r = await evaluate(cand(), { ...ok(), parseShoeSpecs: async () => { throw new Error('bad_taxonomy'); } });
    expect(r).toMatchObject({ publish: false, reasons: ['bad_taxonomy'] });
  });
  it('override lets too_old and reviews_lt_2 through', async () => {
    const r = await evaluate(cand(), { ...ok(), fetchReviewsForShoe: async () => [], findBrandProductPage: async () => ({ ...page, releaseDate: new Date('2020-01-01') }) }, { override: ['too_old', 'reviews_lt_2'] });
    expect(r.publish).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement** the three files per the interfaces. Key logic for `gate.ts`:

```ts
export const MAX_AGE_MONTHS = 15;

export async function evaluate(c: CandidateInput, deps: GateDeps = liveDeps, opts: { override?: HoldReason[] } = {}): Promise<GatePass | GateHold> {
  const ignore = new Set(opts.override ?? []);
  if (!c.brand) return { publish: false, reasons: ['brand_unresolved'], partial: {} };

  const brandPage = await deps.findBrandProductPage(c.brand, c.model);
  if (!brandPage) return { publish: false, reasons: ['no_brand_page'], partial: {} };

  const reviewDates = c.evidence.sources.map(s => s.publishedAt).filter((d): d is string => !!d).map(d => new Date(d));
  const releaseDate = brandPage.releaseDate ?? (reviewDates.length ? new Date(Math.min(...reviewDates.map(d => d.getTime()))) : null);
  const cutoff = new Date(deps.now()); cutoff.setMonth(cutoff.getMonth() - MAX_AGE_MONTHS);
  if (releaseDate && releaseDate < cutoff && !ignore.has('too_old')) return { publish: false, reasons: ['too_old'], partial: { brandPage } };

  const reviews = await deps.fetchReviewsForShoe(c.brand.name, c.model);
  if (reviews.length < 2 && !ignore.has('reviews_lt_2')) return { publish: false, reasons: ['reviews_lt_2'], partial: { brandPage, reviews } };

  let specs: ParsedSpecs;
  try {
    const p = brandPage.product;
    const context = [brandPage.title, p?.name, p?.description, brandPage.html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 2500)].filter(Boolean).join('\n');
    specs = await deps.parseShoeSpecs({ brand: c.brand.name, model: c.model, context });
  } catch (err) {
    const reason: HoldReason = err instanceof Error && err.message === 'bad_taxonomy' ? 'bad_taxonomy' : 'specs_unparseable';
    return { publish: false, reasons: [reason], partial: { brandPage, reviews } };
  }
  return { publish: true, brandPage, specs, reviews, releaseDate, softReasons: [] };
}
```
A release date that is unknown (null) does not hold; the brand page is the evidence of currency.

`publish.ts` supersession query: `prisma.shoes.findFirst({ where: { brand_id, superseded_by_id: null, id: { not: newId } } })` filtered in JS with `isSameLine(existing.model, model) && (parseModelVersion(existing.model).versionNum ?? 0) < (parseModelVersion(model).versionNum ?? 0)`; set `superseded_by_id = newId` on the highest such version only.

- [ ] **Step 4: Run tests → PASS**
- [ ] **Step 5: Commit** `git add src/lib/shoes/publish && git commit -m "Shoes: publish gate (brand page, age, reviews, taxonomy) and candidate publishing"`

---

### Task 8: Images — candidates, verify, store, findAndStoreImage, audit

**Files:**
- Create: `src/lib/shoes/images/candidates.ts`, `verify.ts`, `store.ts`, `index.ts`
- Test: `src/lib/shoes/images/candidates.test.ts`, `store.test.ts`, `index.test.ts`

**Interfaces:**
- `candidates.ts`: `imageCandidates(input: { brand: Brand; model: string; brandPage: BrandPage | null }, deps?): Promise<ImageCandidate[]>` with `ImageCandidate = { url: string; method: 'brand-jsonld' | 'brand-og' | 'retailer-jsonld' | 'retailer-og'; pageUrl: string }`. `RETAILER_DOMAINS` moved from enrichment. Retailer acceptance: result URL contains the model slug (`shoeToSlug('', model)` without leading hyphen) **or** title includes model (case-insensitive), **and** `findVersionConflict(model, title) === null`, **and** `isProductPageUrl(url).isProduct || !isProductPageUrl(url).isArticle`.
- `verify.ts`: `isLikelyProductImage(url)`, `checkImageSize(url, deps?)`, `visionConfirmShoeImage(brand, model, url, deps?)` moved verbatim (`NON_CATALOGUE_HOSTS` included).
- `store.ts`: `storeImage(slug: string, sourceUrl: string, deps?): Promise<string>` returns the R2 public URL; `StoreDeps = { download(url): Promise<Buffer>; upload(key, body, contentType): Promise<string> }`. Uses `sharp(buf).rotate().resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()`. Key `shoes/${slug}.jpg`. Live `upload` is `uploadToR2` from `@/lib/r2`.
- `index.ts`:
```ts
export interface ImageOutcome { url: string; sourceUrl: string; method: string }
export async function findAndStoreImage(shoe: { slug: string; brand: Brand; model: string }, brandPage: BrandPage | null, deps?): Promise<ImageOutcome | null>
export async function auditImages(deps?, opts?: { limit?: number }): Promise<{ checked: number; cleared: string[] }>
```
  `findAndStoreImage` iterates candidates; for each: `isLikelyProductImage` → `checkImageSize` → `visionConfirmShoeImage === true` → `storeImage` → return. Writes `image_url`, `image_source_url`, `image_method`, `image_verified_at` via `deps.writeImage(slug, ...)`.
  `auditImages` HEADs every non-null `image_url`; on non-200 clears the four image fields via `deps.clearImage(slug)`.

- [ ] **Step 1: Failing tests**

`candidates.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { imageCandidates } from './candidates';
const brooks = { id: 1, name: 'Brooks', aliases: [], domain: 'brooksrunning.com', newArrivalsUrl: null };
const jsonld = (name: string, img: string) => `<script type="application/ld+json">{"@type":"Product","name":"${name}","image":"${img}"}</script>`;

describe('imageCandidates', () => {
  it('puts brand JSON-LD first, then brand og:image', async () => {
    const r = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: { url: 'https://www.brooksrunning.com/ghost-16', title: 'Ghost 16', html: jsonld('Ghost 16', 'https://c/j.jpg') + '<meta property="og:image" content="https://c/og.jpg">', product: null, releaseDate: null } }, { webSearch: async () => [], fetchPage: async () => null });
    expect(r.map(c => [c.method, c.url])).toEqual([['brand-jsonld', 'https://c/j.jpg'], ['brand-og', 'https://c/og.jpg']]);
  });
  it('rejects a retailer page for a neighbouring version', async () => {
    const r = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: null }, {
      webSearch: async () => [{ title: 'Brooks Ghost 15 Mens', url: 'https://sportsshoes.com/product/brooks-ghost-15', description: '' }],
      fetchPage: async () => ({ html: jsonld('Ghost 15', 'https://c/15.jpg'), title: 'Brooks Ghost 15 Mens' }),
    });
    expect(r).toEqual([]);
  });
  it('accepts a retailer page naming the exact model', async () => {
    const r = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: null }, {
      webSearch: async () => [{ title: 'Brooks Ghost 16 Mens Running Shoes', url: 'https://sportsshoes.com/product/brooks-ghost-16-mens', description: '' }],
      fetchPage: async () => ({ html: jsonld('Ghost 16', 'https://c/16.jpg'), title: 'Brooks Ghost 16 Mens Running Shoes' }),
    });
    expect(r[0]).toMatchObject({ method: 'retailer-jsonld', url: 'https://c/16.jpg' });
  });
});
```

`store.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { storeImage } from './store';

describe('storeImage', () => {
  it('resizes to ≤1000px JPEG and uploads under shoes/{slug}.jpg', async () => {
    const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#fff' } }).png().toBuffer();
    let uploaded: { key: string; type: string; w: number; h: number } | null = null;
    const url = await storeImage('hoka-clifton-10', 'https://x/a.png', {
      download: async () => png,
      upload: async (key, body, contentType) => { const m = await sharp(body).metadata(); uploaded = { key, type: contentType, w: m.width!, h: m.height! }; return `https://r2/${key}`; },
    });
    expect(url).toBe('https://r2/shoes/hoka-clifton-10.jpg');
    expect(uploaded).toEqual({ key: 'shoes/hoka-clifton-10.jpg', type: 'image/jpeg', w: 1000, h: 500 });
  });
});
```

`index.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { findAndStoreImage, auditImages } from './index';
const hoka = { id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: null };

describe('findAndStoreImage', () => {
  it('stores the first candidate that passes every check and records provenance', async () => {
    const writes: unknown[] = [];
    const r = await findAndStoreImage({ slug: 'hoka-clifton-10', brand: hoka, model: 'Clifton 10' }, null, {
      imageCandidates: async () => [{ url: 'https://c/logo.png', method: 'brand-og', pageUrl: 'p' }, { url: 'https://c/shoe.jpg', method: 'brand-jsonld', pageUrl: 'p' }],
      isLikelyProductImage: u => !u.includes('logo'),
      checkImageSize: async () => ({ ok: true }),
      visionConfirmShoeImage: async () => true,
      storeImage: async slug => `https://r2/shoes/${slug}.jpg`,
      writeImage: async (slug, data) => { writes.push([slug, data]); },
    });
    expect(r).toEqual({ url: 'https://r2/shoes/hoka-clifton-10.jpg', sourceUrl: 'https://c/shoe.jpg', method: 'brand-jsonld' });
    expect(writes[0]).toEqual(['hoka-clifton-10', expect.objectContaining({ image_url: 'https://r2/shoes/hoka-clifton-10.jpg', image_source_url: 'https://c/shoe.jpg', image_method: 'brand-jsonld' })]);
  });
  it('returns null and writes nothing when vision says NO or errors', async () => {
    const writes: unknown[] = [];
    const r = await findAndStoreImage({ slug: 's', brand: hoka, model: 'Clifton 10' }, null, {
      imageCandidates: async () => [{ url: 'a', method: 'brand-jsonld', pageUrl: 'p' }, { url: 'b', method: 'brand-og', pageUrl: 'p' }],
      isLikelyProductImage: () => true, checkImageSize: async () => ({ ok: true }),
      visionConfirmShoeImage: async u => (u === 'a' ? false : null),
      storeImage: async () => 'never', writeImage: async (...a) => { writes.push(a); },
    });
    expect(r).toBeNull(); expect(writes).toEqual([]);
  });
});

describe('auditImages', () => {
  it('clears images whose URL no longer resolves', async () => {
    const cleared: string[] = [];
    const r = await auditImages({
      listImages: async () => [{ slug: 'a', image_url: 'https://r2/a.jpg' }, { slug: 'b', image_url: 'https://dead/b.jpg' }],
      head: async url => (url.includes('dead') ? 404 : 200),
      clearImage: async slug => { cleared.push(slug); },
    });
    expect(r).toEqual({ checked: 2, cleared: ['b'] });
  });
});
```

- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement** per interfaces. In `candidates.ts`, for the brand page use `extractJsonLdProducts(html)` images then `extractMetaImages(html, url)`; for retailers loop `RETAILER_DOMAINS`, `webSearch(\`site:${domain} "${brand.name} ${model}"\`, 5)`, `sleep(1100)` between domains (skip sleeps when `deps` is injected: make `sleep` a dep defaulting to the real one). Stop after the first retailer that yields ≥1 candidate.
- [ ] **Step 4: Run tests → PASS**
- [ ] **Step 5: Commit** `git add src/lib/shoes/images && git commit -m "Shoes: image candidates (brand first, strict retailer match), R2 storage, audit"`

---

### Task 9: Weekly job and digest

**Files:**
- Create: `src/lib/shoes/job/weekly.ts`, `src/lib/shoes/job/digest.ts`
- Test: `src/lib/shoes/job/weekly.test.ts`, `src/lib/shoes/job/digest.test.ts`

**Interfaces:**
```ts
export interface JobReport {
  discovered: number; published: { slug: string; imageUrl: string | null }[]; held: { slug: string; reasons: string[] }[];
  errored: { slug: string; error: string }[]; reviewsRefreshed: number; imagesStored: string[]; imagesCleared: string[];
  feedsEmpty: string[]; durationMs: number; dryRun: boolean;
}
export interface WeeklyOpts { dryRun?: boolean; maxPublish?: number /* 10 */; maxImages?: number /* 20 */; maxStaleRefresh?: number /* 10 */ }
export interface WeeklyDeps {
  discover; loadBrands; listCandidates(status: ('pending'|'held')[]): Promise<CandidateInput[]>; evaluate; publishCandidate;
  holdCandidate(id, reasons: string[], partial: unknown): Promise<void>; rejectStale(olderThanWeeks: 8): Promise<number>;
  staleShoes(limit): Promise<{ id; slug; brand: Brand; model }[]>; fetchReviewsForShoe; upsertReviews(shoeId, reviews): Promise<void>; recomputeShoeScore;
  auditImages; shoesNeedingImage(limit): Promise<{ id; slug; brand: Brand; model }[]>; findAndStoreImage; findBrandProductPage;
  now(): Date; log(msg: string): void;
}
export async function runWeekly(opts?: WeeklyOpts, deps?: WeeklyDeps): Promise<JobReport>
```
`dryRun` wraps every writing dep (`publishCandidate`, `holdCandidate`, `rejectStale`, `upsertReviews`, `recomputeShoeScore`, `findAndStoreImage`'s `writeImage`/`storeImage`, `discover`'s `upsertCandidate`, `auditImages`'s `clearImage`) in no-ops that still return plausible shapes; implement by building `liveDeps(dryRun)`.

`digest.ts`: `renderDigest(report, baseUrl, signPublish: (candidateId) => string): { subject: string; html: string; text: string }`, `sendDigest(report, deps?)`. `signPublish(id)` = `${baseUrl}/api/shoes/candidates/${id}/publish?token=${hmac}` where `hmac = createHmac('sha256', CRON_SECRET).update(String(id)).digest('hex')`. Export `publishToken(id): string` and `verifyPublishToken(id, token): boolean` (timing-safe) from `digest.ts` for the route in Task 12. Held entries therefore need `candidateId`; add `id` to `held` items in `JobReport`.

- [ ] **Step 1: Failing tests**

`weekly.test.ts` — one test that wires fakes for all deps: 2 candidates (one passes, one holds `reviews_lt_2`), 1 stale shoe, audit clears 1, 1 shoe needs image and gets one; assert the `JobReport` fields and that `maxPublish: 1` stops after one publish. A second test: with `dryRun: true`, the same run reports the same numbers but no writing dep is called (track with counters). A third: a dep that throws for one candidate lands in `errored` with the message and the run continues.

`digest.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderDigest, publishToken, verifyPublishToken } from './digest';

describe('digest', () => {
  it('renders published, held with publish links, cleared images, empty feeds', () => {
    process.env.CRON_SECRET = 'test';
    const d = renderDigest({ discovered: 5, published: [{ slug: 'hoka-clifton-10', imageUrl: 'https://r2/x.jpg' }], held: [{ id: 3, slug: 'nike-pegasus-42', reasons: ['reviews_lt_2'] }], errored: [], reviewsRefreshed: 2, imagesStored: ['a'], imagesCleared: ['b'], feedsEmpty: ['believe_in_run'], durationMs: 1000, dryRun: false }, 'https://filmmyrun.com', id => `https://filmmyrun.com/api/shoes/candidates/${id}/publish?token=${publishToken(id)}`);
    expect(d.subject).toContain('1 published');
    expect(d.html).toContain('hoka-clifton-10');
    expect(d.html).toContain(`/api/shoes/candidates/3/publish?token=${publishToken(3)}`);
    expect(d.html).toContain('believe_in_run');
  });
  it('tokens verify and reject', () => {
    process.env.CRON_SECRET = 'test';
    expect(verifyPublishToken(3, publishToken(3))).toBe(true);
    expect(verifyPublishToken(4, publishToken(3))).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** Order in `runWeekly`: discover → rejectStale → evaluate/publish loop (cap) → stale reviews → auditImages → images for shoes with `image_url IS NULL OR image_url NOT LIKE '%/shoes/%'` (cap) → return. Each candidate and each shoe inside its own `try/catch` pushing to `errored`; `deps.log` is `console.log` live. Resend send via `new Resend(process.env.RESEND_API_KEY)` to `stephen@filmmyrun.com`, from `process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>'`, skipped when `dryRun` or no key.
- [ ] **Step 4: Run tests → PASS**
- [ ] **Step 5: Commit** `git add src/lib/shoes/job && git commit -m "Shoes: weekly job orchestrator with dry run, JobReport and Resend digest"`

---

### Task 10: Routes — weekly-update, candidates publish, add

**Files:**
- Rewrite: `src/app/api/shoes/weekly-update/route.ts`
- Create: `src/app/api/shoes/candidates/[id]/publish/route.ts`
- Rewrite: `src/app/api/shoes/add/route.ts`
- Delete: nothing yet

- [ ] **Step 1: weekly-update**

```ts
import { NextRequest } from 'next/server';
import { runWeekly } from '@/lib/shoes/job/weekly';
import { sendDigest } from '@/lib/shoes/job/digest';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.OPENROUTER_API_KEY) return Response.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 503 });
  if (!process.env.BRAVE_SEARCH_API_KEY && !process.env.SERPER_API_KEY) return Response.json({ error: 'No search API key configured' }, { status: 503 });

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const report = await runWeekly({ dryRun });
  if (!dryRun) {
    try { await sendDigest(report); } catch (err) { console.error('Shoe digest failed', err); }
  }
  return Response.json(report, { status: report.errored.length === 0 ? 200 : 500 });
}
```
(Streaming NDJSON goes; the workflow reads the JSON report instead.)

- [ ] **Step 2: candidates publish**

```ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPublishToken } from '@/lib/shoes/job/digest';
import { evaluate } from '@/lib/shoes/publish/gate';
import { publishCandidate } from '@/lib/shoes/publish/publish';
import { findAndStoreImage } from '@/lib/shoes/images';
import { loadBrands } from '@/lib/shoes/brands';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!Number.isFinite(id) || !verifyPublishToken(id, token)) return new Response('Bad link', { status: 403 });
  const c = await prisma.shoe_candidates.findUnique({ where: { id } });
  if (!c) return new Response('No such candidate', { status: 404 });
  if (c.status === 'published') return new Response(`Already published: ${c.slug}`, { status: 200 });
  const brand = (await loadBrands()).find(b => b.id === c.brand_id) ?? null;
  const input = { id: c.id, slug: c.slug, brand, model: c.model_text, evidence: c.evidence as never };
  const r = await evaluate(input, undefined, { override: ['too_old', 'reviews_lt_2'] });
  if (!r.publish) return new Response(`Still held: ${r.reasons.join(', ')}`, { status: 409 });
  const p = await publishCandidate(input, r);
  const img = await findAndStoreImage({ slug: p.slug, brand: brand!, model: c.model_text }, r.brandPage);
  return new Response(`Published ${p.slug}${img ? ' with image' : ' (no image)'}${p.supersededSlug ? `, supersedes ${p.supersededSlug}` : ''}`, { status: 200, headers: { 'Content-Type': 'text/plain' } });
}
```

- [ ] **Step 3: add route**

Keep the NDJSON stream (the modal reads it) but change the body:
- Gate on `OPENROUTER_API_KEY` and a search key (not `ANTHROPIC_API_KEY`).
- Rate limit: `prisma.shoes.count({ where: { added_by_user_id: userId, created_at: { gte: dayAgo } } }) >= 5` → 429 "Daily limit reached (5 shoes per day)".
- Parse the free-text query with one `completeText` call asking for `{brand, model}` only (prompt: the same rules as normalise, one line), then `resolveBrand`; unknown brand → stream `{ step: 'error', message: "We don't know the brand \"X\" yet" }`.
- Duplicate check by slug and by `isSameLine` + same version as in `discover`.
- Run `evaluate({ id: 0, slug, brand, model, evidence: { sources: [] } }, undefined, { override: ['too_old', 'reviews_lt_2'] })`. `no_brand_page` → stream error "Couldn't find this shoe on {brand.domain}, so it wasn't added". `bad_taxonomy`/`specs_unparseable` → error.
- Publish through a variant `publishCandidate` accepts: add an optional `origin: { kind: 'user'; userId: number }` third parameter that sets `origin: 'user'`, `added_by_user_id`, and skips the candidate-status update when `id === 0`.
- Then `findAndStoreImage`. Stream `complete` with the same shoe shape the modal expects (check `AddShoeModal.tsx` for the fields it reads; keep them).

- [ ] **Step 4: `npm run typecheck`** → the only remaining failure should be `src/app/api/shoes/route.ts` (enum + `myRating` etc.), fixed in Task 11. Delete the `findImageForShoe` line from the shim if still referenced.

- [ ] **Step 5: Commit** `git add src/app/api/shoes/weekly-update/route.ts src/app/api/shoes/candidates src/app/api/shoes/add/route.ts && git commit -m "Shoes: weekly-update returns a JobReport; signed publish-anyway link; user suggestions go through the gate"`

---

### Task 11: Routes — catalogue, [slug], my-ratings, rate

**Files:**
- Rewrite: `src/app/api/shoes/route.ts`
- Create: `src/app/api/shoes/[slug]/route.ts`, `src/app/api/shoes/my-ratings/route.ts`
- Modify: `src/app/api/shoes/rate/route.ts`
- Modify: `src/app/api/app/v1/shoes/route.ts` (drop `force-dynamic`, keep wrapper)
- Test: `src/app/api/shoes/query.test.ts` for a pure `buildShoeQuery(params)` helper

- [ ] **Step 1: Failing test for the query builder**

Create `src/app/api/shoes/query.ts` exporting `buildShoeQuery(sp: URLSearchParams): { where: Prisma.shoesWhereInput; orderBy: Prisma.shoesOrderByWithRelationInput[] }` and test:
```ts
import { describe, it, expect } from 'vitest';
import { buildShoeQuery } from './query';
const q = (s: string) => buildShoeQuery(new URLSearchParams(s));

describe('buildShoeQuery', () => {
  it('defaults: current shoes only, by score', () => {
    expect(q('')).toEqual({ where: { superseded_by_id: null }, orderBy: [{ avg_score: { sort: 'desc', nulls: 'last' } }, { review_count: 'desc' }] });
  });
  it('terrain includes both', () => {
    expect(q('terrain=trail').where).toMatchObject({ AND: [{ OR: [{ terrain: 'trail' }, { terrain: 'both' }] }] });
  });
  it('ignores an invalid category', () => {
    expect(q('category=banana').where).not.toHaveProperty('category');
  });
  it('user_rating sorts in SQL', () => {
    expect(q('sort=user_rating').orderBy[0]).toEqual({ user_avg_score: { sort: 'desc', nulls: 'last' } });
  });
  it('includeSuperseded lifts the default filter', () => {
    expect(q('includeSuperseded=1').where).not.toHaveProperty('superseded_by_id');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

`route.ts` (list): no `getServerSession`. `select` only the catalogue columns (no `shoe_reviews`, no `shoe_user_ratings`). Response shape per shoe: as today minus `reviews` and `myRating`, plus `supersededBySlug: string | null`, `imageSourceUrl` omitted. `meta` gains `labels: { categories: CATEGORY_LABELS, sources: SOURCE_LABELS, terrains: TERRAIN_LABELS }`. Brand and category lists come from `prisma.shoes.groupBy` as today. Add `export const revalidate = 300`.

`[slug]/route.ts`: `prisma.shoes.findUnique({ where: { slug }, include: { shoe_reviews: { select: {...} } } })` → full shoe JSON with `reviews` (same field names as the old list). 404 when missing. `revalidate = 300`.

`my-ratings/route.ts`: session required (401 otherwise); `prisma.shoe_user_ratings.findMany({ where: { user_id } })` → `{ ratings: { [shoeId]: number } }`. `dynamic = 'force-dynamic'`.

`rate/route.ts`: after the upsert / deleteMany, `const s = await recomputeShoeScore(shoeId)` and return `{ rating, userAvg: s.userAvgScore, userCount: s.userRatingCount }`.

`app/v1/shoes/route.ts`: remove the `force-dynamic` line and the comment about `myRating`.

- [ ] **Step 4: `npm run typecheck` → clean. `npm test` → green.**
- [ ] **Step 5: Commit** `git add src/app/api/shoes src/app/api/app/v1/shoes/route.ts && git commit -m "Shoes API: cacheable catalogue, per-shoe reviews, my-ratings; user_rating sort in SQL"`

---

### Task 12: Front end — labels from meta, ratings hook, lazy reviews

**Files:**
- Modify: `src/components/shoes/ShoeFinderClient.tsx`, `ShoeCard.tsx`, `UserRating.tsx`
- Create: `src/components/shoes/useShoeRatings.ts`
- Modify: `src/components/shoes/AddShoeModal.tsx` (only if the `complete` payload fields changed in Task 10)

- [ ] **Step 1: `useShoeRatings.ts`**

```ts
'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useShoeRatings() {
  const { status } = useAuth();
  const [ratings, setRatings] = useState<Record<number, number>>({});
  useEffect(() => {
    if (status !== 'authenticated') { setRatings({}); return; }
    let live = true;
    fetch('/api/shoes/my-ratings').then(r => (r.ok ? r.json() : { ratings: {} })).then(d => { if (live) setRatings(d.ratings ?? {}); });
    return () => { live = false; };
  }, [status]);
  const rate = useCallback(async (shoeId: number, score: number) => {
    const res = await fetch('/api/shoes/rate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shoeId, score }) });
    if (!res.ok) return null;
    const d = await res.json();
    setRatings(r => ({ ...r, [shoeId]: d.rating }));
    return d as { rating: number; userAvg: number | null; userCount: number };
  }, []);
  const remove = useCallback(async (shoeId: number) => {
    const res = await fetch(`/api/shoes/rate?shoeId=${shoeId}`, { method: 'DELETE' });
    if (!res.ok) return null;
    const d = await res.json();
    setRatings(r => { const n = { ...r }; delete n[shoeId]; return n; });
    return d as { userAvg: number | null; userCount: number };
  }, []);
  return { ratings, rate, remove };
}
```

- [ ] **Step 2: `ShoeFinderClient.tsx`**
  - `Shoe` type: drop `reviews` and `myRating`; add `supersededBySlug: string | null`. `Meta` gains `labels`.
  - Delete the local `CATEGORY_LABELS`; use `meta.labels.categories[c] ?? c` (default `meta.labels` to `{ categories: {}, sources: {}, terrains: {} }` in the initial state).
  - Call `useShoeRatings()` once; pass `ratings`, `rate`, `remove`, `labels` down to `ShoeCard` via a small `ShoeListContext` (createContext in the same file) so the card signature stays `({ shoe, rank })`.
  - Remove the "Run the review fetch script" hint; the unscored section stays.
- [ ] **Step 3: `ShoeCard.tsx`**
  - Delete `CATEGORY_LABELS`, `SOURCE_LABELS`; read from context.
  - Keep local `userAvgScore`/`userRatingCount` state (they are per-card aggregates that change on rating) but `myRating` comes from `ratings[shoe.id]`.
  - Review breakdown: on first expand, `fetch(\`/api/shoes/${shoe.slug}\`)`, store `reviews` in state, show a 3-line skeleton while loading. `reviewCount > 0` decides whether the toggle renders.
  - Remove `.replace(/<[^>]*>/g, '')` on summaries only if Task 4's `fetchReviewsForShoe` already strips tags; otherwise keep it.
- [ ] **Step 4: `UserRating.tsx`**: props become `{ shoeId, myRating, userAvgScore, userRatingCount, onRate(score), onRemove() }`; the fetches move to the hook. `onRate` / `onRemove` return the aggregate for the card to store.
- [ ] **Step 5: `npm run typecheck && npm run lint && npm test`** → clean.
- [ ] **Step 6: Run the dev server and click through** `/tools/shoe-finder`: filters, sort by user rating, expand a breakdown, rate a shoe (signed in), Suggest a Shoe with an unknown brand (expect the friendly error). Fix anything broken.
- [ ] **Step 7: Commit** `git add src/components/shoes && git commit -m "Shoe Finder UI: labels from the API, one ratings hook, reviews loaded on expand"`

---

### Task 13: Scripts and cleanup

**Files:**
- Create: `scripts/shoes.ts`
- Delete: `scripts/fetch-shoe-reviews.mjs`, `scripts/fetch-shoe-images.mjs`, `scripts/fix-shoe.mjs`, `scripts/cleanup-mismatched-reviews.mjs`, `scripts/shoe-utils.mjs`, `src/lib/shoe-enrichment.ts`
- Modify: `scripts/seed-shoes.mjs` (brand via `shoe_brands`, enums), `scripts/audit-shoe-data.mjs` (read new columns), `package.json` (add `"shoes": "tsx scripts/shoes.ts"`)

- [ ] **Step 1: `scripts/shoes.ts`**

Subcommands, parsed with `process.argv`:
- `enrich --slug X`: `fetchReviewsForShoe` + upsert + `recomputeShoeScore`; prints the reviews.
- `image --slug X [--force]`: `findBrandProductPage` then `findAndStoreImage`; `--force` clears the existing image first.
- `backfill-images [--limit N] [--from-slug S]`: all shoes ordered by slug, skipping those whose `image_url` starts with the R2 public URL unless `--force`; 1500 ms between shoes; prints `slug → method | NONE`; resumable via `--from-slug`.
- `run-weekly [--dry-run]`: calls `runWeekly` directly and prints the report as JSON.
- `candidates [--status held]`: lists candidates with reasons.

Load env with `import 'dotenv/config'` if the repo uses dotenv, otherwise run via `node --env-file=.env node_modules/.bin/tsx scripts/shoes.ts`. Document the exact invocation at the top of the file.

- [ ] **Step 2: Delete the old scripts and the shim.** Run `grep -rn "shoe-enrichment\|shoe-utils" src scripts` → must be empty.
- [ ] **Step 3: `npm run typecheck && npm test`** → clean.
- [ ] **Step 4: Commit** `git add -u scripts src/lib/shoe-enrichment.ts && git add scripts/shoes.ts package.json && git commit -m "Shoes: one tsx CLI replaces the stale enrichment scripts"`

---

### Task 14: Workflow and docs

**Files:**
- Modify: `.github/workflows/weekly-shoe-update.yml`
- Modify: `docs/app-api.md` (if it documents `/shoes`: note `reviews` moved to `/shoes/[slug]`, `labels` in meta)
- Modify: `CLAUDE.md` "Running Shoe Finder" section — **only that section**, and only if the other session's diff does not touch it (`git diff CLAUDE.md | grep -c "Shoe Finder"` must be 0; otherwise write the new section to `docs/shoe-finder.md` and leave CLAUDE.md alone, noting it in the commit)

- [ ] **Step 1: Workflow**

```yaml
name: Weekly Shoe Update
on:
  schedule:
    - cron: '0 6 * * 0'
  workflow_dispatch:
    inputs:
      dryRun:
        description: 'Dry run (no writes, no digest)'
        type: boolean
        default: false
jobs:
  update-shoes:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Run the weekly shoe job
        id: run
        run: |
          q=""; [ "${{ inputs.dryRun }}" = "true" ] && q="?dryRun=1"
          code=$(curl -s -o report.json -w "%{http_code}" -X POST "${{ secrets.SITE_URL }}/api/shoes/weekly-update$q" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" --max-time 600)
          echo "## Weekly Shoe Update (HTTP $code)" >> $GITHUB_STEP_SUMMARY
          echo '```json' >> $GITHUB_STEP_SUMMARY; cat report.json >> $GITHUB_STEP_SUMMARY; echo '```' >> $GITHUB_STEP_SUMMARY
          python3 - <<'EOF' >> $GITHUB_OUTPUT
          import json; r=json.load(open('report.json'))
          print(f"activity={len(r.get('published',[]))+len(r.get('held',[]))}")
          EOF
          [ "$code" = "200" ] || { echo "::error::weekly-update returned $code"; exit 1; }
      - name: Fail if two runs in a row found nothing
        env: { GH_TOKEN: "${{ github.token }}" }
        run: |
          prev=$(gh api "repos/${{ github.repository }}/actions/workflows/weekly-shoe-update.yml/runs?status=success&per_page=2" --jq '.workflow_runs[1].id' 2>/dev/null || echo "")
          [ -z "$prev" ] && exit 0
          prev_activity=$(gh api "repos/${{ github.repository }}/actions/runs/$prev/jobs" --jq '.jobs[0].steps[] | select(.name=="Run the weekly shoe job") | .conclusion' 2>/dev/null || echo "")
          if [ "${{ steps.run.outputs.activity }}" = "0" ]; then
            echo "::warning::No shoes published or held this week"
            gh run view "$prev" --log 2>/dev/null | grep -q '"published":\[\],"held":\[\]' && { echo "::error::Two consecutive empty runs"; exit 1; }
          fi
```

- [ ] **Step 2: Docs.** New section content: the source list, the gate rules, the hold reasons and what clears each, the digest, the CLI commands, R2 key layout, and "to fix one shoe's image: `npm run shoes -- image --slug X --force`".
- [ ] **Step 3: Commit** `git add .github/workflows/weekly-shoe-update.yml docs && git commit -m "Shoes: workflow fails on non-200 and on two empty runs; docs"` (add `CLAUDE.md` only if edited per the rule above).

---

### Task 15: Deploy, dry run, backfill

Run by the main session, not a subagent. Each step is a checkpoint with Stephen.

- [ ] **Step 1: Pre-flight.** `npm run typecheck && npm run lint && npm test && npm run build` all green. `git status` shows only the other session's two files modified.
- [ ] **Step 2: Migration rehearsal.** `npx prisma migrate diff --from-url "$DATABASE_PUBLIC_URL" --to-schema-datamodel prisma/schema.prisma --script > /tmp/diff.sql` and compare with the hand-written migration for missing DDL (the diff will not contain the data steps; that is expected). Fix any DDL discrepancy in the migration file and commit.
- [ ] **Step 3: Push.** `git push origin main`. Watch `railway logs` for `migrate deploy` applying `20260913120000_add_shoe_pipeline` and the app starting.
- [ ] **Step 4: Verify what is served.** `curl -s https://filmmyrun.com/api/shoes | jq '.meta.labels.categories.max_cushion, .meta.total, (.shoes|map(.brand)|unique)'` → `"Max Cushion"`, 193, one spelling per brand. `curl -s https://filmmyrun.com/api/shoes/hoka-clifton-10 | jq '.reviews|length'`. Open `/tools/shoe-finder` in a browser.
- [ ] **Step 5: Dry run.** Trigger the workflow with `dryRun: true` (`gh workflow run weekly-shoe-update.yml -f dryRun=true`), read the step summary. Expect candidates and holds with reasons, zero errored. If `feedsEmpty` lists a feed that worked in Task 5, investigate the User-Agent from Railway before going on.
- [ ] **Step 6: Backfill images.** `railway run -- npm run shoes -- backfill-images` (or locally with `DATABASE_URL=$DATABASE_PUBLIC_URL` and the R2/Brave/OpenRouter keys exported). Expect ~194 lines, most `brand-jsonld`. Spot-check 10 slugs on the site, especially versioned lines (Ghost, Clifton, 1080, Pegasus).
- [ ] **Step 7: Real run.** `gh workflow run weekly-shoe-update.yml`. Confirm the digest email arrives and the report has `errored: []`.
- [ ] **Step 8: Memory.** Update `project-film-my-run-*` memory with: discovery sources, hold reasons, the publish-anyway link, the CLI, and the "no image beats wrong image" rule.
