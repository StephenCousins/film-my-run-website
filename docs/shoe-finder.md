# Shoe Finder pipeline

`/tools/shoe-finder` is backed by a weekly job that discovers new shoes on
review sites and brand pages, runs each one through a publish gate, finds and
verifies a product image, and emails a digest. This doc covers that pipeline —
discovery, the gate, images, the digest, the CLI, the data model, and what to
check when something looks wrong. For the catalogue/detail API shapes
themselves, see `docs/app-api.md`.

Note: `CLAUDE.md`'s "Running Shoe Finder" section still describes the old
manual `scripts/*.mjs` workflow (Anthropic-direct calls, hand-run monthly
refresh). It predates this pipeline and has not been updated here because
another session has an unrelated uncommitted diff touching that file; treat
this document as current instead.

## Overview

```
discovery → publish gate → publish (+ image) → digest
              ↑                                   │
              └─────── held / re-evaluated ────────┘
```

Everything runs from one call: `POST /api/shoes/weekly-update`, triggered by
`.github/workflows/weekly-shoe-update.yml` every Sunday at 06:00 UK time, and
runnable by hand via `workflow_dispatch` or `npm run shoes -- run-weekly`.

## The weekly job

`runWeekly()` (`src/lib/shoes/job/weekly.ts`) does, in order:

1. **Discover** — read all sources, normalise nominations to `{brand, model}`,
   upsert `shoe_candidates` rows.
2. **Reject stale holds** — held candidates untouched for 8 weeks
   (`REJECT_HELD_AFTER_WEEKS`) become `rejected`.
3. **Evaluate & publish** — pending candidates first, then held ones (so a
   backlog of holds re-evaluated every week can't crowd out something new),
   up to `maxPublish` (10/run). Each publish immediately attempts an image
   find+store for that shoe.
4. **Refresh reviews** for up to `maxStaleRefresh` (10) shoes not reviewed in
   30 days (`STALE_REVIEW_DAYS`).
5. **Audit images** — HEAD every stored image, clear dead ones.
6. **Backfill images** — a separate pass, up to `maxImages` (20), over shoes
   still missing an R2 image (published without one, or an old hotlink from
   before this pipeline).
7. **Send the digest** (skipped on a dry run) — done by the route handler
   after `runWeekly()` returns, not inside it.

The route handler (`src/app/api/shoes/weekly-update/route.ts`) wraps this:
bearer-auth with `CRON_SECRET`, `?dryRun=1` to run every read and no write,
and returns the `JobReport` as JSON — **HTTP 200 iff `errored` is empty, else
500** (so a broken run fails the workflow visibly). It 503s up front if
`OPENROUTER_API_KEY` or a search key (`BRAVE_SEARCH_API_KEY`/`SERPER_API_KEY`)
is missing.

### JobReport shape

```
{
  discovered: number,
  published: [{ slug, imageUrl }],
  publishedWithoutImage: string[],   // published but no image cleared verification; retried next week
  linkedExisting: [],                // candidate's slug already existed as a shoe; marked published against it, no new row
  held: [{ id, slug, reasons }],
  errored: [{ slug, error }],        // any entry here forces HTTP 500
  rejectedStale: number,             // held candidates closed after 8 weeks untouched
  reviewsRefreshed: number,
  imagesStored: string[],
  imagesCleared: string[],           // by the image audit, see below
  feedsEmpty: string[],
  durationMs: number,
  dryRun: boolean
}
```

## Discovery

`src/lib/shoes/discovery/` gathers **nominations** — raw `{title, url,
publishedAt, source}` guesses at a shoe — from three kinds of source, then
resolves each into a candidate:

- **Review-site RSS feeds** (`discovery/sources/rss.ts`, `FEEDS`): Running
  Shoes Guru, The Run Testers, Runner's World UK, iRunFar, Believe in the Run,
  Road Trail Run, Doctors of Running. A title is a nomination only if it
  matches `titleLooksLikeShoe()` — a review/launch word or a version number
  (`v3`, `II`, digits). A feed returning zero items is recorded in
  `feedsEmpty`.
- **Brand new-arrivals pages** (`discovery/sources/brandPages.ts`), driven by
  `shoe_brands.new_arrivals_url`. **No brand has this set yet** — the column
  exists but the source is dormant until URLs are added.
- **Brave/Serper web search** (`discovery/sources/search.ts`) — three fixed
  queries (`best new running shoes <month> <year>`, `new trail running shoes
  <year>`, `new road running shoes <year>`), used **only as a nominator**:
  every result becomes a nomination as-is, with resolution doing the real
  filtering.

One LLM call per run (`completeText`, Gemini 2.5 Flash Lite) normalises the
batch of headlines to `{brand, model}` pairs. The brand is then resolved
against `shoe_brands` (by name or alias) — but an unresolved brand is **not**
dropped: `discover()` still upserts it as a `shoe_candidates` row with
`brand_id: null`, immediately `held` with `brand_unresolved`. Adding the
brand's name (or an alias) to `shoe_brands` is what lets the *next* weekly
run resolve it and hand it to the gate. Candidates are keyed by slug: a
nomination that matches an existing candidate merges its evidence sources
(deduped by URL) rather than replacing them, and keeps its current status —
discovery only sets the initial status (`pending`, or `held` for an
unresolved brand); every re-run after that is the gate's call, not
discovery's.

## Publish gate & hold reasons

`src/lib/shoes/publish/gate.ts`, cheapest checks first, each hold carrying
whatever was gathered so far (so a re-run or manual override skips repeating
the paid calls):

| Order | Check | Hold reason | Clears when |
|---|---|---|---|
| 1 | Brand resolved | `brand_unresolved` | the LLM/alias match succeeds on a later run (rare without re-discovery) |
| 2 | Brand's own site has a product page naming the exact model **and** version | `no_brand_page` | the brand publishes that page |
| 3 | Release date (brand JSON-LD `releaseDate`, else earliest review date; **unknown passes**) within 15 months (`MAX_AGE_MONTHS`) | `too_old` | never on its own — lift via "Publish anyway" (see Digest) |
| 4 | ≥2 review sources found | `reviews_lt_2` | a third review site covers it; or "Publish anyway" |
| 5 | Specs parse (LLM) into valid taxonomy (`ShoeTerrain`/`ShoeCategory`) | `bad_taxonomy` | the brand page's text becomes parseable |
| 5 | Specs otherwise fail to parse | `specs_unparseable` | same |

A held candidate is **re-evaluated every week** the gate runs, so a hold
clears itself once its cause does — no manual action needed except for
`too_old`/`reviews_lt_2`, which the gate will never lift on its own (that's
the point of those two checks).

Before any of this, a candidate whose slug already matches an existing
`shoes` row skips the gate entirely: it's linked to that shoe (`status:
'published'`, `shoe_id` set) and counted in `linkedExisting`, not `held`.
**`shoe_already_linked`** is the rare exception to that — it fires only when
`shoe_id` (unique per candidate) is already claimed by a *different*
candidate for the same shoe, e.g. two nominations under variant slugs for the
same shoe. That candidate is rejected instead of linked, but it is still
counted in `linkedExisting` (the report reflects "this slug matched an
existing shoe", not "this candidate is now live").

A candidate held for 8 weeks without changing status is closed as `rejected`
by the weekly job (`rejectStale`), regardless of reason.

On publish: a `shoes` row is created with `origin: 'discovery'`, and if a
prior version of the same shoe line exists, its `superseded_by_id` is set to
the new row (`isSameLine`/`parseModelVersion` in `src/lib/shoes/versions.ts`
decide "same line, newer version").

### User suggestions

`POST /api/shoes/add` runs a signed-in user's free-text query through the
**same gate**, with `too_old` and `reviews_lt_2` pre-overridden (a person
asking for an older or under-reviewed shoe by name still wants it; `no_brand_page`,
`bad_taxonomy`/`specs_unparseable` and `brand_unresolved` still hold it). Limits
per user per day: **5 published, 10 attempts** (held/rejected/errored all
count as an attempt) — in-process, so a deploy resets the counters.

## Images

`src/lib/shoes/images/` finds one image per shoe, brand phase first,
retailer only if nothing from the brand phase stored:

1. **Candidates** (`images/candidates.ts`): the brand product page's JSON-LD
   `Product` images, then its `og:image`/`twitter:image`; if that phase
   yields nothing, retailer product pages — but only ones that name the exact
   model **and** version, checked by `pageNamesExactModel(model, url, title)`
   (the same matcher the gate uses for the brand page itself, `src/lib/shoes/
   publish/brandPage.ts`) against the fetched page's `<title>`.
   `isProductPageUrl` is a separate, weaker check: it only ranks
   product-shaped URLs (`/product/`, `/p/`, `/buy/`, …) above article-shaped
   ones (`/article/`, `/blog/`, `/news/`, …) when picking which search results
   to fetch — it doesn't confirm the model.
2. **Filters** (`images/verify.ts`): `NON_CATALOGUE_HOSTS` rejects known-bad
   hosts (eBay, Bazaarvoice, Outside Online, etc.) before spending a vision
   call; `isLikelyProductImage` filters obvious non-product URLs;
   `checkImageSize` rejects anything too small to be a real product shot.
3. **Vision check** (`visionConfirmShoeImage`): one call per surviving
   candidate, asking for a catalogue-style product shot of the given
   brand/model — but deliberately *not* asked to confirm a version number
   (asked to, it invents one; it once called a Brooks Ghost 18 a "Ghost 15"
   off a shoe with no version printed on it). Version identity is the URL/
   title match's job, not vision's. Only an explicit YES passes; an API
   failure or anything else counts as **not verified**, never as a pass — no
   image beats a wrong image, and a null `image_url` just renders a
   placeholder.
4. **Store** (`images/store.ts`): the winning candidate is downloaded,
   rotated per EXIF, resized to ≤1000px (longest side, no upscaling),
   flattened onto white (transparent PNGs would otherwise go black on JPEG),
   and uploaded to R2 as `shoes/{slug}.jpg` (`imageKey()`). `image_source_url`,
   `image_method` and `image_verified_at` are recorded on the `shoes` row.

A shoe can publish with no image (`publishedWithoutImage`) — the image phase
retries on every subsequent weekly run until something passes.

### Weekly image audit

`auditImages()` HEADs every stored image. `404`/`410` clears the three
`image_*` fields (`imagesCleared` in the report, re-tried next run); `429`,
5xx, or no response at all count as merely **unverified**, not cleared — a
flaky CDN should not wipe a good image.

## Digest & publish-anyway

After every **non-dry** run, `sendDigest()` (`src/lib/shoes/job/digest.ts`)
emails `stephen@filmmyrun.com` via Resend: published (with a link to each
shoe, flagged if it has no image), held (with reasons and a **"Publish
anyway"** link), linked-to-existing, errors, images cleared, and empty feeds.
`sendDigest` is a silent no-op (returns `false`, no log line) on a dry run or
when `RESEND_API_KEY` is missing; if `CRON_SECRET` is missing it logs a
warning and also sends nothing (there's no key to sign publish links with).
An actual send failure (a Resend API error) is caught by the route handler
and logged — it never fails the job or the HTTP response either way.

**Publish anyway**: the link token is an HMAC-SHA256 of the candidate id
keyed by `CRON_SECRET` (`publishToken`/`verifyPublishToken`, constant-time
compared). `GET /api/shoes/candidates/[id]/publish?token=…` shows a
confirmation page (a mail client's link-scanner following the GET must not
publish anything); the page's form `POST`s the same token, which re-runs the
gate with `too_old` and `reviews_lt_2` overridden — the same two holds the
`/api/shoes/add` user path lifts. Every other hold (`brand_unresolved`,
`no_brand_page`, `bad_taxonomy`, `specs_unparseable`) still blocks it; an
already-published or already-rejected candidate returns a plain message
instead of a form.

## API

- `GET /api/shoes` — the public catalogue, no `reviews` unless
  `?withReviews=1`; superseded shoes hidden unless `?includeSuperseded=1`;
  `sort=score|user_rating|brand|newest`; response `meta` includes `labels`
  (display names for categories/sources/terrains).
- `GET /api/shoes/[slug]` — one shoe, with reviews.
- `GET /api/shoes/my-ratings` — a signed-in user's own ratings,
  `{ ratings: { [shoeId]: number } }`.
- `POST /api/shoes/add` — the user-suggestion flow above.
- `GET /api/app/v1/shoes` — the iPhone-app alias, always `withReviews=1`,
  cached 1 hour. Full shapes for both: `docs/app-api.md`.

## CLI

`npm run shoes -- <command> [flags]` (`scripts/shoes.ts`):

| Command | Does |
|---|---|
| `enrich --slug S` | Fetch review scores for one shoe, upsert them, recompute its score. |
| `image --slug S [--force]` | Find, verify and store an image for one shoe. `--force` clears the current one first, then re-searches. |
| `backfill-images [--limit N] [--from-slug S] [--force]` | Image pass over the whole catalogue — current shoes first, then superseded. Skips shoes already on R2 unless `--force`; resume a long run with `--from-slug`. |
| `run-weekly [--dry-run]` | Runs the weekly job in-process and prints the `JobReport` as JSON — the same thing the workflow triggers over HTTP, without the network hop or CRON_SECRET. |
| `candidates [--status held\|pending\|rejected\|published]` | Lists discovered candidates with their hold reasons. |
| `audit-images` | HEADs every stored image and clears the ones that are gone. |

Needs `.env` with `DATABASE_URL`, `OPENROUTER_API_KEY`,
`BRAVE_SEARCH_API_KEY` (or `SERPER_API_KEY`), the `R2_*` credentials, and
`RESEND_API_KEY` (only `run-weekly` without `--dry-run` sends a digest, which
also needs `CRON_SECRET` for the publish-anyway link token). Exit code is 1 on
any error.

**To fix one shoe's image:**
```
npm run shoes -- image --slug <slug> --force
```

## Data model

Additions on top of the original `shoes`/`shoe_reviews` tables (see
`prisma/schema.prisma`, the source of truth):

- **`shoe_brands`** — `name` (unique canonical name), `aliases` (String[]),
  `domain`, `new_arrivals_url` (nullable — none set yet). Referenced by both
  `shoes.brand_id` and `shoe_candidates.brand_id`.
- **`shoe_candidates`** — `brand_id` (nullable — null while `brand_unresolved`),
  `brand_text`/`model_text` (raw, pre-resolution), `slug` (unique),
  `status` (`CandidateStatus`: `pending | published | held | rejected`),
  `hold_reasons` (String[]), `evidence` (JSON — `{ sources: [{source, url,
  title, publishedAt}] }`, merged across runs), `shoe_id` (set once
  published), `first_seen_at`, `last_seen_at`, `decided_at`.
- **`shoes`** additions: `origin` (`ShoeOrigin`: `seed | user | discovery`),
  `added_by_user_id`, `superseded_by_id` (self-relation — the newer version of
  this line), `user_avg_score`/`user_rating_count` (from `shoe_user_ratings`,
  distinct from the expert `avg_score`/`review_count`), `image_url`,
  `image_source_url`, `image_method`, `image_verified_at`.
- **Enums**: `ShoeTerrain` (`road|trail|both`), `ShoeCategory`
  (`daily_trainer|race|long_run|speed|ultra|stability|max_cushion|minimal`),
  `ShoeOrigin`, `CandidateStatus`.

## Environment

| Variable | Used for |
|---|---|
| `DATABASE_URL` | Everything |
| `OPENROUTER_API_KEY` | Nomination normalisation, spec parsing, image vision check |
| `BRAVE_SEARCH_API_KEY` or `SERPER_API_KEY` | The search-nomination source, brand/retailer page lookup |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_URL` | Image storage |
| `RESEND_API_KEY` | The weekly digest email |
| `CRON_SECRET` | Auth for `POST /api/shoes/weekly-update`; also signs "Publish anyway" links |

The GitHub Actions workflow additionally needs the repo secrets `SITE_URL`
and `CRON_SECRET` (it never sees the others — it just calls the deployed
endpoint).

## Troubleshooting

**To fix one shoe's image**: `npm run shoes -- image --slug <slug> --force`.
If that reports "no candidate passed verification", the brand/retailer pages
genuinely have nothing that clears the filters or the vision check — check
`findBrandProductPage` manually before assuming the pipeline is broken.

**A shoe is held: what clears each reason** —
- `brand_unresolved`: add the brand's name (or an alias matching what the LLM
  is outputting) to `shoe_brands`; the *next weekly run's discovery* is what
  picks up the resolution when it re-nominates the shoe (or
  `npm run shoes -- run-weekly` to force a run sooner) — the gate itself just
  reads whatever `brand_id` is already stored on the candidate.
- `no_brand_page`: nothing to do — the gate rechecks weekly and clears
  itself once the brand publishes the product page.
- `too_old`: will never clear itself by design. Use "Publish anyway" from the
  digest email, or `POST` the same signed link if you kept it.
- `reviews_lt_2`: clears itself once a third review source is found on a
  later run, or use "Publish anyway".
- `bad_taxonomy` / `specs_unparseable`: the brand page's text isn't giving the
  LLM a clean spec read. Check `findBrandProductPage(brand, model)` returns a
  real product page, not a category/listing page; re-run once it does.
- Held candidates left untouched for 8 weeks close as `rejected` regardless of
  reason — check with `npm run shoes -- candidates --status rejected`.

**Feed empty every week**: check `feedsEmpty` in the report/digest. First
suspect the tool, not the pipeline — a feed host blocking the request (User-Agent,
rate limit, or a genuine outage) looks identical to "no new posts". Try
fetching the feed URL directly (`rss.ts`'s `FEEDS`) before assuming the site
stopped publishing.

**Digest not arriving**: check `report.dryRun` first — dry runs never send
one, by design. Otherwise confirm `RESEND_API_KEY` is set in the deploy
environment: a missing key makes `sendDigest` return `false` **silently** (no
error, no log line — the job's HTTP status only reflects `errored`, never the
digest). A missing `CRON_SECRET` does log a warning ("cannot sign publish
links") and also sends nothing. If both are set, check the sending domain is
still verified in Resend.
