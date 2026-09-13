# Shoe Finder: discovery, images and data model (design)

Date: 2026-09-13. Repo: film-my-run-website. Consumers: `/tools/shoe-finder`
and the iPhone app via `/api/app/v1/shoes`.

## Goals, in priority order

1. Find genuinely new shoe releases every week, from sources that review
   shoes, not from search-snippet listicles.
2. Attach reviews from the known review sites.
3. Never show a wrong image. A placeholder beats a look-alike.
4. Make the weekly job fail loudly and report to Stephen.
5. Fix the data-model debts the review found while the tables are being
   migrated anyway (one migration, not two).

## What is wrong today (evidence)

- Discovery = three Brave searches + "extract shoe names" LLM call. It
  invented `Asics Ultra Raptor II` (it is a La Sportiva), re-added the 2021
  Puma Deviate Nitro as "new", and 3 of 6 candidates on 13 Sep failed with an
  empty error message.
- The cron returned HTTP 200 while streaming an Anthropic "credit too low"
  error for four weeks (26 Jul to 16 Aug). Nobody knew.
- Brands drift: `Asics`/`ASICS`, `adidas`/`Adidas`, `Topo`/`Topo Athletic`.
  `BRAND_DOMAINS['Asics']` misses, so asics.com is never searched.
- 96 of 188 images hotlink one BigCommerce store. Every image is a hotlink.
- `[added by user N]` / `[auto-discovered]` are stored in `description` and
  rendered to users. The rate-limit comment says 5/day, the code says 50.
- `add/route.ts` gates on `ANTHROPIC_API_KEY`, which nothing uses since the
  OpenRouter switch.
- `GET /api/shoes` joins every review and every rating for every shoe on
  every request (263 KB), reads the session, and is `force-dynamic`; the v1
  alias then claims `Cache-Control: public`.
- `avg_score` maths is copied in three places; `userAvgScore` is computed in
  JS per request.
- `terrain`, `category`, `source` are free-text columns; `CATEGORY_LABELS`
  is duplicated in two components; iOS shows `runrepeat` raw.
- The enrichment scripts under `scripts/` are a stale second copy of
  `src/lib/shoe-enrichment.ts` and still call Anthropic directly.

## Decisions taken with Stephen

- New shoes **auto-publish** when they pass every check; anything that fails
  is **held** for him. No approve-first queue.
- Image fallback: brand site first; otherwise a retailer product page **only
  if its URL or title names the exact model and version**; otherwise no
  image.
- Fold in the data-model items (#1, #2, #5, #7, #8 of the review). Leave URL
  filter state / SEO and the iOS-side changes as separate tasks.

## Data model

All in one Prisma migration, `add_shoe_pipeline`.

### New enums

```
enum ShoeTerrain   { road trail both }
enum ShoeCategory  { daily_trainer race long_run speed ultra stability max_cushion minimal }
enum ReviewSource  { runrepeat runners_world irunfar believe_in_run the_run_testers
                     running_shoes_guru road_trail_run doctors_of_running other }
enum ShoeOrigin    { seed user discovery }
enum CandidateStatus { pending published held rejected }
```

`shoes.terrain` and `shoes.category` become the enums (existing values
already conform; the migration casts). `shoe_reviews.source` becomes
`ReviewSource` after a data fix that maps any unknown value to `other`.

### `shoe_brands` (new)

| column | type | notes |
|---|---|---|
| id | Int PK | |
| name | String unique | canonical, e.g. `ASICS`, `Topo Athletic` |
| aliases | String[] | lower-cased; `asics`, `topo` |
| domain | String | `asics.com` |
| new_arrivals_url | String? | brand "new releases" listing when one exists |
| created_at | DateTime | |

Seeded from the current `BRAND_DOMAINS` map plus the brands present in
`shoes` that it lacks (Avelo, Kiprun, Li-Ning, Nnormal, Norda). Migration
data step: rewrite `shoes.brand` to the canonical name for every alias hit,
then add `shoes.brand_id` FK (non-null after the rewrite). `shoes.brand`
stays as a denormalised string for the API shape.

### `shoes` (changed)

Add: `brand_id Int FK`, `origin ShoeOrigin @default(seed)`,
`added_by_user_id Int?`, `superseded_by_id Int?` (self-relation),
`user_avg_score Decimal(3,1)?`, `user_rating_count Int @default(0)`,
`image_source_url String?`, `image_method String?`,
`image_verified_at DateTime?`, `release_date DateTime?`.

Data step: `origin = user` + `added_by_user_id` parsed from the
`[added by user N]` suffix; `origin = discovery` from `[auto-discovered]`;
both markers stripped from `description`. `user_avg_score` /
`user_rating_count` backfilled from `shoe_user_ratings`.

Delete the phantom row `asics-ultra-raptor-ii`.

### `shoe_candidates` (new)

| column | type | notes |
|---|---|---|
| id | Int PK | |
| brand_id | Int? FK | null when the brand did not resolve (a hold reason) |
| brand_text | String | as found |
| model_text | String | as found |
| slug | String unique | from canonical brand + model when resolvable |
| status | CandidateStatus | |
| hold_reasons | String[] | machine-readable, e.g. `brand_unresolved`, `no_brand_page`, `reviews_lt_2`, `too_old`, `no_image` |
| evidence | Json | `{ sources: [{source, url, publishedAt, title}], brandPage?: {url, title, releaseDate?}, reviews?: [...], image?: {...} }` |
| shoe_id | Int? FK | set on publish |
| first_seen_at / last_seen_at | DateTime | a candidate seen again updates `last_seen_at` and merges evidence |
| decided_at | DateTime? | |

## Modules

Everything new lives under `src/lib/shoes/`. `src/lib/shoe-enrichment.ts`
is split into these files; nothing outside `src/lib/shoes/` and the routes
imports network code.

```
src/lib/shoes/
  taxonomy.ts        enums re-exported from Prisma + label maps (category, source, terrain)
  brands.ts          resolveBrand(text) → {id, name, domain} | null; loads shoe_brands once per process
  versions.ts        parseModelVersion, findVersionConflict, isSameLine (moved from enrichment)
  slug.ts            shoeToSlug (moved)
  scores.ts          normaliseScore, recomputeShoeScore(shoeId) — the ONE place avg_score/review_count/user_avg_score are written
  search.ts          webSearch / imageSearch (Brave, Serper) (moved)
  discovery/
    types.ts         Nomination { brandText?, modelText, url, publishedAt, source }
    sources/
      rss.ts         one generic RSS/Atom reader; feeds listed in FEEDS with per-feed title regexes
      brandPages.ts  new-arrivals listings via JSON-LD Product lists
      search.ts      today's three queries, as a nominator only
    normalise.ts     batch LLM call: nominations → {brandText, modelText}; then resolveBrand; then dedupe against shoes (version-aware)
    index.ts         discover(): runs sources, normalises, upserts shoe_candidates
  publish/
    gate.ts          evaluate(candidate) → {publish: true, shoe: ParsedShoe} | {publish: false, reasons}
    brandPage.ts     findBrandProductPage(brand, model) → {url, title, jsonLd, releaseDate?} | null
    publish.ts       createShoeFromCandidate(); sets superseded_by on the previous version
  reviews.ts         fetchReviewsForShoe (moved; sources from ReviewSource)
  images/
    candidates.ts    brand JSON-LD → retailer product page (strict match) → []
    verify.ts        vision quality check (moved, unchanged prompt)
    store.ts         download, sharp resize ≤1000px, JPEG q85, upload to R2 `shoes/{slug}.jpg`, return public URL
    index.ts         findAndStoreImage(shoe) → {url, sourceUrl, method} | null; audit(shoeIds) → HEAD checks
  job/
    weekly.ts        orchestrator; returns JobReport
    digest.ts        Resend email from a JobReport
```

### Discovery sources

`rss.ts` reads each feed with `rss-parser` (already a dependency) using a
browser User-Agent. Feeds confirmed reachable on 13 Sep: Running Shoes Guru,
The Run Testers, Runner's World UK, iRunFar (serves items with a 406). Believe
in the Run, Road Trail Run and Doctors of Running block plain fetches; the
implementation task must find a working feed or sitemap URL for each, and
any feed that returns nothing is reported in the digest as `feed_empty`
rather than silently skipped. Item titles are filtered with a permissive
regex (`review|first look|preview|launch|new|v\d|\b\d{1,2}\b`) before the
LLM sees them, to keep the batch small.

`brandPages.ts` only runs for brands with `new_arrivals_url`; the
implementation task fills that column for the brands whose sites expose a
listing with JSON-LD `Product` entries (Hoka, Brooks, Saucony, New Balance,
Altra, On are the likely ones). Missing is fine.

`search.ts` is the existing three-query nominator. Its nominations carry
`source: 'search'` and count for nothing in the publish gate.

### Normalisation and dedupe

One LLM call per run over all nominations (Gemini Flash Lite via
`completeText`): input is `{title, url}` rows, output is
`[{i, brand, model}]` with `model` including the version. A row whose brand
does not `resolveBrand()` is held with `brand_unresolved`.

Dedupe against `shoes` and `shoe_candidates` by slug, then by
`isSameLine(model) && sameVersion` from `versions.ts`. A nomination for a
version that already exists updates `last_seen_at` only.

### Publish gate

`evaluate(candidate)` runs, in order, stopping at the first hard failure:

1. `brand_id` set, else `brand_unresolved`.
2. `findBrandProductPage(brand, model)` returns a page whose URL slug or
   `<title>` contains the exact model and version (using
   `findVersionConflict` to reject neighbours). Else `no_brand_page`.
3. Release date: JSON-LD `releaseDate` if present, else the earliest
   `publishedAt` across review nominations. Must be within the last 15
   months. Else `too_old`.
4. `fetchReviewsForShoe` returns ≥ 2 sources. Else `reviews_lt_2`.
5. `findAndStoreImage` returns a URL. Else `no_image` (soft: the shoe still
   publishes, with a placeholder, and the digest lists it).

Specs (`drop_mm`, `weight_g`, `stack_height_mm`, `price_gbp`, `category`,
`terrain`, `description`) come from the existing `parseShoeQuery` prompt,
fed the brand page title + description + JSON-LD rather than search
snippets. `category` and `terrain` must be enum members; anything else is a
hold with `bad_taxonomy`.

On publish: create `shoes` row with `origin = discovery`, upsert reviews,
`recomputeShoeScore`, and if a lower-version sibling exists set its
`superseded_by_id`. Candidate becomes `published` with `shoe_id`.

A held candidate is re-evaluated on every later run (evidence accumulates;
`reviews_lt_2` often clears a week later). After 8 weeks held it is set to
`rejected`.

### Images

`candidates.ts` returns an ordered list:

1. Brand product page (from the gate, or found now for a backfill): every
   JSON-LD `Product.image` on the page, then `og:image`.
2. Retailer product pages: for each of `RETAILER_DOMAINS`, `site:` search;
   accept a result only if `urlMatchesShoe` **or** the title contains the
   exact model string **and** `findVersionConflict` is null. Same image
   extraction.

Each candidate passes `isLikelyProductImage`, the HEAD size check, and the
existing vision quality prompt. The first pass is stored. Nothing from image
search; `NON_CATALOGUE_HOSTS` stays.

`store.ts` downloads the file, converts with `sharp` to JPEG, longest side
1000px, and uploads to R2 at `shoes/{slug}.jpg` (overwrite). `image_url`
becomes the R2 public URL; `image_source_url`, `image_method`,
`image_verified_at` are written.

`audit()` HEADs every `shoes.image_url`; a non-200 clears the image fields
and queues the shoe for `findAndStoreImage` in the same run (capped at 20
per run).

### Weekly job

`POST /api/shoes/weekly-update` (auth unchanged) runs:

1. `discover()`
2. `evaluate` + `publish` for every `pending` or `held` candidate (cap 10
   publishes per run)
3. stale review refresh (as today, via `reviews.ts` + `recomputeShoeScore`)
4. `images.audit()` then `findAndStoreImage` for any shoe with a null or
   non-R2 `image_url` (cap 20)
5. `sendDigest(report)`

Returns JSON `JobReport`:

```
{ discovered, published: [{slug}], held: [{slug, reasons}], errored: [{slug, error}],
  reviewsRefreshed, imagesStored, imagesCleared, feedsEmpty: [name], durationMs }
```

Status 200 only if `errored.length === 0`; otherwise 500 with the report.
Errors are logged with `console.error(err)` (the object, not `.message`).
`?dryRun=1` runs everything without writing to Prisma or R2 and skips the
digest.

The GitHub workflow fails the job on non-200 and prints the report as the
step summary. A second workflow step fails if `published + held == 0` for
this run and the previous run (read via the Actions API).

### Digest

Resend, from `RESEND_FROM_EMAIL`, to `stephen@filmmyrun.com`, plain HTML:
published shoes (image thumbnail, score, brand page link), held shoes with
reasons and a **Publish anyway** link, images cleared, feeds empty, errors.
The publish link is `GET /api/shoes/candidates/{id}/publish?token=` with an
HMAC of the id and `CRON_SECRET`; it runs the publish step ignoring
`reviews_lt_2` and `too_old` but not `brand_unresolved`.

## API changes

- `GET /api/shoes` (and the v1 alias): no session read, no `myRating`, no
  `reviews` array. Adds `labels` to `meta`:
  `{ categories: {daily_trainer: 'Daily Trainer', …}, sources: {…} }`. Sort
  `user_rating` becomes `orderBy: user_avg_score desc`. The v1 alias keeps
  `public, max-age=3600`.
- `GET /api/shoes/[slug]`: full shoe including `reviews`. Public.
- `GET /api/shoes/my-ratings`: `{ [shoeId]: score }` for the session user.
- `POST/DELETE /api/shoes/rate`: unchanged shape; calls
  `recomputeShoeScore`.
- `POST /api/shoes/add`: gate on `OPENROUTER_API_KEY`; limit 5/day counted
  by `added_by_user_id`; writes `origin = user`; uses the same publish
  helpers (brand must resolve; image via `findAndStoreImage`).

## Front end

`ShoeFinderClient` fetches `/api/shoes` and, if signed in,
`/api/shoes/my-ratings` once; ratings live in a small `useShoeRatings()`
hook so `ShoeCard` reads rather than copies props. The review breakdown
fetches `/api/shoes/[slug]` on first expand. Labels come from `meta.labels`;
the two `CATEGORY_LABELS` copies and `SOURCE_LABELS` go. The description
marker strip in `ShoeCard` is no longer needed.

## Scripts

Delete `scripts/fetch-shoe-reviews.mjs`, `fetch-shoe-images.mjs`,
`fix-shoe.mjs`, `cleanup-mismatched-reviews.mjs`, `shoe-utils.mjs`. Add
`scripts/shoes.ts` (tsx) with subcommands `enrich --slug`, `image --slug`,
`backfill-images`, `run-weekly --dry-run`, all calling `src/lib/shoes/`.
Keep `seed-shoes.mjs` and `audit-shoe-data.mjs`, updated for the enums.

## Backfill (one-off, after deploy)

`scripts/shoes.ts backfill-images` runs `findAndStoreImage` for all 194
shoes in slug order, 1.5 s between shoes, resumable (skips shoes whose
`image_url` is already on R2). A shoe whose current image fails the stricter
match ends with `image_url = null` and appears in the next digest. Expected
cost: ~200 Brave searches + ~200 vision calls, well under £2.

## Tests

vitest, `src/lib/shoes/**/*.test.ts`:

- `brands`: alias resolution, case, unknown → null.
- `versions`: `parseModelVersion` on `Clifton 10`, `1080 V14`, `Ultra Raptor II`, `Speedgoat 6 GTX`; `findVersionConflict`; `isSameLine`.
- `slug`: existing behaviour pinned.
- `scores`: normalisation (5-star, %, /10); `recomputeShoeScore` against a Prisma mock.
- `discovery/rss`: fixture feeds → nominations; empty feed → `feed_empty`.
- `discovery/normalise`: LLM output → resolved/held split; dedupe cases.
- `publish/gate`: each hold reason, soft `no_image`, supersede.
- `images/candidates`: ordering, strict retailer match rejects `Ghost 15` for `Ghost 16`, JSON-LD Product filter.
- `job/weekly`: report shape; dry run writes nothing; 500 on error.

Network and Prisma are behind small interfaces injected into each function
(`deps` parameter, defaulting to the live implementations).

## Rollout

1. Land the migration and the new lib with the old routes still working
   (one deploy; `preDeployCommand` runs the migration).
2. Run `scripts/shoes.ts run-weekly --dry-run` against prod; read the report.
3. Run `backfill-images`; check the site.
4. Switch the workflow to fail on non-200; trigger it by hand once.

## Out of scope

URL filter state and server-rendered first page; iOS reading `meta.labels`
and fetching `[slug]` on a deep-link miss (next scheduled build); the
endpoint moving under `/api/app/v1` only (existing aliasing stays).
