# Shoe Finder pipeline

`/tools/shoe-finder` is backed by a weekly job that discovers new shoes on
review-site feeds and Shopify storefronts, runs each one through a publish
gate, finds and verifies a product image, and emails a digest. This doc covers that pipeline —
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
6. **Backfill images** — a separate pass, up to `maxImages` (10), over shoes
   still missing an R2 image (published without one, or an old hotlink from
   before this pipeline), least recently attempted first — see "Which shoes
   get tried" under Images. Skipped entirely on a dry run: the searches would
   be paid for and their result thrown away.
7. **Send the digest** (skipped on a dry run) — done by the route handler
   after `runWeekly()` returns, not inside it. A send failure is added to
   `errored` as `{ slug: 'digest' }`, so the run is a 500.

The route handler (`src/app/api/shoes/weekly-update/route.ts`) wraps this:
bearer-auth with `CRON_SECRET`, `?dryRun=1` to run every read and no write,
and returns the `JobReport` as JSON — **HTTP 200 iff `errored` is empty, else
500** (so a broken run fails the workflow visibly). It 503s up front if
`OPENROUTER_API_KEY` or a search key (`BRAVE_SEARCH_API_KEY`/`SERPER_API_KEY`)
is missing (the search key is still needed: Brave is the fallback behind
every site adapter, see "Site adapters"). The workflow's curl waits up to 30
minutes (`--max-time 1800`, job timeout 35): a full run with the image
backfill is 15–30 minutes of page fetches and rate-limited searches.

Every candidate and shoe runs inside its own try/catch, and a thrown error
becomes an `errored` row rather than a hold. Two failures are deliberately
thrown rather than swallowed, because swallowed they read as "no shoe": a
Brave search error (401/402/429, quota) with no `SERPER_API_KEY` fallback
throws `search:<status>` (`src/lib/shoes/search.ts`); an LLM normalise reply
that is not a JSON array drops every nomination and is reported as
`{ slug: 'discover', error: 'LLM normalise output was unparseable; …' }`.

### JobReport shape

```
{
  discovered: number,
  nominations: { feeds, shops, versionBumps },  // what discovery had to work from, by kind of source
  published: [{ slug, imageUrl }],
  publishedWithoutImage: string[],   // published but no image cleared verification; retried next week
  linkedExisting: [],                // candidate's slug already existed as a shoe; marked published against it, no new row
  held: [{ id, slug, reasons }],
  errored: [{ slug, error }],        // any entry here forces HTTP 500; slug 'digest' = the email did not send
  rejectedStale: number,             // held candidates closed after 8 weeks untouched
  reviewsRefreshed: number,
  imagesStored: string[],
  imagesCleared: string[],           // by the image audit, see below
  feedsEmpty: string[],              // 'irunfar' = quiet week; 'irunfar (HTTP 403)' = the fetch failed
  storesEmpty: string[],             // 'shopify:kicksown.com' = no new arrivals; 'version-bump:kicksown.com' = no newer versions; '… (unreachable:503)' = refused
  durationMs: number,
  dryRun: boolean
}
```

## Discovery

`src/lib/shoes/discovery/` gathers **nominations** — raw `{title, url,
publishedAt, source}` guesses at a shoe — from three kinds of source, read
concurrently, then resolves each into a candidate. No web search is spent
here: the three fixed Brave queries (`best new running shoes <month>`, …)
that used to nominate were removed on 14 September 2026, because they
nominated roundup headlines rather than shoes.

- **Review-site RSS feeds** (`discovery/sources/rss.ts`, `FEEDS`): RTINGS,
  Running Shoes Guru, The Run Testers, Runner's World UK, iRunFar, Believe
  in the Run, Doctors of Running. RTINGS has no per-category feed; its
  `/latest-rss.xml` lists the thirty most recent reviews across every
  category, and the feed's `linkPattern` keeps the `/running-shoes/reviews/`
  ones. Road Trail Run is not in the list: its feed answers every
  server-side fetch with a Cloudflare challenge (403, probed 13 September
  2026; the comment above `FEEDS` has the detail). A title is a nomination
  only if it matches `titleLooksLikeShoe()` — a review/launch word or a
  version number (`v3`, `II`, digits). A feed returning zero items is
  recorded in `feedsEmpty`, with the error appended when there was one
  (`'irunfar (HTTP 403)'`), so a block and a quiet week look different.
- **Shopify new arrivals** (`discovery/sources/shopifyNewArrivals.ts`,
  `NEW_ARRIVALS_STORES`): every Shopify store serves
  `/products.json?limit=250`, newest first, with a `published_at` per
  product. Two retailers (kicksown.com, startfitness.co.uk) and sixteen
  brand stores are read each run — 361°, Anta, Norda, Xero Shoes, Altra,
  Atreyu, Newton, Speedland, Mount to Coast, Freet, Karhu, Scarpa,
  Raidlight, Luna, Bedrock, Shamma: the ones whose `/products.json?limit=5`
  answered with products on 14 September 2026 (diadora.com is a 404;
  lemsshoes.com and normanwalsh.com answer but sell boots and retro
  trainers). Up to three pages are read while each page is full and still
  has something inside the window (Start Fitness has thousands of products
  and republishes in bursts). A product is put forward when it was
  published in the last 21 days (`NEW_ARRIVAL_DAYS`; `windowDays` in the
  deps overrides it) and looks like a running shoe, decided in this order:
  1. **Out** if the title or `product_type` names apparel, socks, boots,
     sandals, slides, spikes, other sports, lifestyle/hiking/climbing/
     mountaineering/approach/ski, parts and services, kids; or if a tag,
     read as a category (the whole tag after a `Footwear Type:` style key,
     with one qualifier allowed: "Walking Boots", "Basketball Shoes",
     "Socks"), names one. Start Fitness tags every shoe "Flair: + FREE PAIR
     OF SOCKS", which is why a tag has to be the category and not merely
     mention one. A store marked `sandals` (Luna, Bedrock, Shamma) keeps its
     sandals: they are its running shoes.
  2. A store with a `typePattern` puts forward only that `product_type`
     (Karhu "Running" against "Lifestyle", Scarpa "Trail Running" against
     "Hiking", Raidlight "Chaussures de trail …" against a hundred kinds of
     trail kit whose French types all say "trail", the sandal brands
     "Sandal(s)").
  3. Otherwise a running word (running, road, trail, racing, marathon,
     trainer, tempo, 跑步) in the type, the title, a tag or the description
     counts, as does a bare "Shoes"/"Footwear" type; failing all that, the
     store being configured `assumeShoes` (Altra, Xero and the small brand
     stores put nothing useful in `product_type`). Whatever gets through is
     still the LLM normaliser's to drop.
  Colourways collapse to one nomination per cleaned model name
  (`cleanModelText` strips `'Black'`, `「Women」`, `- Women's`, `| Running
  Shoes`, "Men's", "WIDE FIT (2E)"), most recent first, at most 60 per
  store. The brand is the store's own for a brand store, the `vendor` for
  Start Fitness, and left for the normaliser to read from the title on
  kicksown (whose vendor is itself). Most of Start Fitness's nominations
  are shoes the catalogue already has; those drop out as `alreadyKnown`.
- **Version bumps** (`discovery/sources/versionBumps.ts`): the catalogue
  asked of the stores. Every shoe with `superseded_by_id IS NULL` whose
  model parses to a version (`parseModelVersion`) is grouped into lines by
  `(brand, base)` and the highest version kept — "Clifton 11", "1080 v14",
  "Ultra Raptor II", "Rocket X2". For each line the Shopify stores'
  predictive search (`/search/suggest.json?q=<brand> <base>`, ten products,
  no API key) is asked at startfitness.co.uk, kicksown.com and the brand's
  own store when `BRAND_SITE_ADAPTERS` has a `shopify` adapter for it. Each
  product title is read for the version after the base — `Clifton 11`,
  `Clifton 11 GORE-TEX`, `1080v15`, `Flame 4.5`, `Lone Peak 9+` (the "+"
  is a refresh of 9, not a version), `Gel Kayano 32` for the catalogue's
  "Gel-Kayano", `Ultra Raptor III` for a roman line — and any version
  **strictly greater** than the catalogue's and **less than catalogue + 4**
  (`MAX_VERSION_JUMP`: "Wave Rider 300" and a SKU are noise, a jump of
  three is real when the catalogue is stale) is nominated, once per
  (brand, base, version), written in the line's own style (`v15`, `III`,
  `X3`). The nomination's title is "<brand> <base> <N>" in the catalogue's
  spelling, so the normaliser extends the line rather than opening a
  parallel one; its URL is the plainest product page that named it (the
  shortest title once colour, gender and width are stripped, so "Clifton
  11" over "Clifton 11 GORE-TEX"); `publishedAt` is null. Stores are read
  concurrently, each line 300 ms after the last (`PAUSE_MS`); a store that
  refuses (`unreachable:<status>`), 404s or answers something that is not
  the suggest JSON is not asked again that run, and the other stores'
  answers still count. On 14 September 2026 the live catalogue (164 lines)
  produced 13 bumps in 111 s; the prototype earlier that day found 38, the
  first 25 of which had already been added by hand.

Every store read — new arrivals and version-bump lookups alike — is
recorded in the report's `stores` as `{ store, fetched, nominated,
error? }` (`shopify:<host>` or `version-bump:<host>`), and the ones that
produced nothing are listed in `storesEmpty` with the error appended the
way `feedsEmpty` does it: `shopify:nordarun.com (unreachable:503)` is a
refusal, `version-bump:kicksown.com` is a store that had no newer version
of anything — which, for the lookups, is the normal state of a catalogue
that is up to date. The digest opens with one line on all of it:
`Discovered 26 from 173 nominations (feeds 66, shops 94, version bumps 13);
feeds empty: none; stores empty: …`.

The `shoe_brands.new_arrivals_url` column and its reader (`brandPages.ts`)
were removed from the run on 14 September 2026 — no brand ever had the URL
set and the Shopify source covers the same ground from code. The column is
still in the schema and unused.

One LLM call per run (`completeText`, Gemini 2.5 Flash Lite) normalises the
batch of headlines to `{brand, model}` pairs. A reply that is not a JSON
array (a refusal, prose, output cut off at the token cap) loses every
nomination for that run; it is logged with the first 200 characters of the
reply and reported under `errored`. The brand is then resolved against
`shoe_brands` (by name or alias) — but an unresolved brand is **not**
dropped: `discover()` still upserts it as a `shoe_candidates` row with
`brand_id: null`, immediately `held` with `brand_unresolved`. Adding the
brand's name (or an alias) to `shoe_brands` is what lets the *next* weekly
run resolve it and hand it to the gate. `loadBrands()` caches the table for
five minutes and `runWeekly()` clears the cache before it starts, so a row
added between runs counts on the next one without a redeploy. Candidates are keyed by slug: a
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
| 2 | Brand's own site has a product page naming the exact model **and** version — asked through the brand's storefront adapter where there is one, else a Brave `site:` search; if the brand site refuses the fetch (or has no page and the brand has curated importers), a retailer page that does (see below) | `no_brand_page` | the brand publishes that page, or a retailer lists it |
| 3 | Release date (brand JSON-LD `releaseDate`, else earliest review date; **unknown passes**) within 15 months (`MAX_AGE_MONTHS`) | `too_old` | never on its own — lift via "Publish anyway" (see Digest) |
| 4 | ≥2 review sources found (the review sites' own lookups first, one Brave search only if they gave fewer than two — see "Site adapters") | `reviews_lt_2` | a third review site covers it; or "Publish anyway" |
| 5 | Specs parse (LLM) into valid taxonomy (`ShoeTerrain`/`ShoeCategory`) | `bad_taxonomy` | the brand page's text becomes parseable |
| 5 | Specs otherwise fail to parse | `specs_unparseable` | same |

**The brand-page check and sites that block server fetches.**
`findBrandProductPage` (`src/lib/shoes/publish/brandPage.ts`) asks the
brand's storefront directly when `BRAND_SITE_ADAPTERS` has an adapter for
it (Saucony and Nike by their search pages, the Shopify brands by
`suggest.json` — see "Site adapters"); the Brave `site:<domain> "<model>"`
search runs only when there is no adapter, or it refused, or nothing it
named proved to be the shoe once fetched. Either way the fetched page's
`<title>` decides, not the lookup's own title. `fetchPage`
(`src/lib/shoes/html.ts`) distinguishes three outcomes: a 2xx page, a gone
page (404/410 → `null`), and a refused one (403/406/429/5xx/timeout → it
throws `unreachable:<status>`). `findBrandProductPage` returns `found`,
`absent` (the site answered; no page names this exact model) or
`unreachable` (every page it tried was refused — hoka.com answers 406 and
brooksrunning.com 403 to any server-side fetch). On `unreachable` the gate
walks the UK retailers in `UK_RETAILERS` (`src/lib/shoes/publish/
retailerPage.ts`, the same walk the image finder uses: startfitness.co.uk
by its own Shopify search first, then the rest by `site:` search) and the
first page whose fetched `<title>` names the exact model stands in as the
brand page with `source: 'retailer'`; `no_brand_page` is held only when the
brand site was reachable and had no page, or was unreachable and no
retailer has one (the candidate's evidence then records `brandUnreachable:
'unreachable:406'`).
Which page proved the shoe (`brandPage: { url, title, source }`) is stored
in the candidate's evidence on hold and on publish.

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

### Reviews

`fetchReviewsForShoe` (`src/lib/shoes/reviews.ts`) is what check 4 and the
weekly refresh call. It asks each review site's own lookup first
(`REVIEW_SITE_LOOKUPS` in `src/lib/shoes/sitesearch/config.ts`: RTINGS by
its predictable review URL, the WordPress sites and Runner's World by their
search pages), fetches the page it names, re-checks the fetched `<title>`
against the model, and reads the score **from the page itself**: the
JSON-LD `reviewRating` where the site publishes one (RTINGS, Running Shoes
Guru — the reviewer's rating, never the readers' `aggregateRating`), else an
explicit "8/10" / "4.5 stars" in the title, meta description or the opening
of the article (`extractExplicitScore`), else the LLM's read of the first
800 characters of the article (`inferScoreFromText`). A page that yields no
number is not a usable review. The summary is the page's meta description,
or its first real paragraph, cut to 200 characters. Only when fewer than
two sites answered (`MIN_SITE_REVIEWS_BEFORE_SEARCH`) is **one** Brave
search spent — `"<brand> <model>" running shoe review` — and its results
handled as they always were (snippet score or LLM inference, an LLM check
for comparisons and off-slug URLs). That fallback is how RunRepeat and Road
Trail Run, which refuse server fetches, still get in. Each `ReviewResult`
carries `via: 'site' | 'search'` (not stored; for reports). RTINGS has no
`ReviewSource` enum value yet, so its review is stored under `other` — one
per shoe, so an `other` review from the search fallback is dropped when
RTINGS already has that slot. Adding `rtings` to the enum is a migration.

### User suggestions

`POST /api/shoes/add` runs a signed-in user's free-text query through the
**same gate**, with `too_old` and `reviews_lt_2` pre-overridden (a person
asking for an older or under-reviewed shoe by name still wants it; `no_brand_page`,
`bad_taxonomy`/`specs_unparseable` and `brand_unresolved` still hold it). Limits
per user per day: **5 published, 10 attempts** (held/rejected/errored all
count as an attempt) — in-process, so a deploy resets the counters.

### Brands without a findable English product page

The Chinese brands — Li-Ning, Anta, Xtep, 361°, Qiaodan, Bmai, Dynafish,
Do-Win, Runsifly, Peak, Kailas (`prisma/migrations/20260914120000_chinese_brands`)
— mostly fail check 2: the English brand site is thin, has no JSON-LD, or
refuses server fetches (`en.lining.com` 403s), and none of the UK retailers
in `RETAILER_DOMAINS` stock them. `RETAILERS_BY_BRAND` in
`src/lib/shoes/publish/retailerPage.ts` gives each of those brands the
Western importers that do have proper product pages — `kicksown.com`,
`supwell.com`, `shopnings.com`, `chinasportshop.com` (plus `qiaodan.asia` and
`dynafish.us` first for their own brands) — and `searchRetailerPages` walks a
brand's importers **before** the UK list, for both the gate's fallback and
the image finder. Each entry carries a `lookup`: **`shopify`** for
`kicksown.com`, `qiaodan.asia` and `dynafish.us`, whose own predictive
search (`/search/suggest.json?q=<model>`, `findShopifyProductPages` in
`src/lib/shoes/publish/shopifyLookup.ts`) is asked instead of Brave — Brave
barely indexes them (`site:kicksown.com "Feidian Ultra"` finds nothing) and
the store lookup costs no search call; **`search`** for `supwell.com`,
`shopnings.com` and `chinasportshop.com`, which 404 that endpoint (probed
14 September 2026) and get a `site:` search with only the model quoted
(they spell the brand their own way: `LiNing`, `361`, `Dowin`). The Shopify
reply is fuzzy — a query for one model returns its neighbours, colourways
and unrelated shoes — so its products are filtered by `pageNamesExactModel`
on handle and title, and the page is then fetched and its `<title>` checked
exactly as a search result would be. `resolveBrand` also ignores case,
hyphens, whitespace and the degree sign, so `LiNing`, `Li Ning`, `Dowin` and
`361 Degrees` all resolve.

For a brand with a `RETAILERS_BY_BRAND` entry the gate asks the importers
whenever the brand site has no page — on `absent` as well as `unreachable`
(every other brand still holds on `absent` without a retailer search), and
a matching importer page stands in as the brand page with `source:
'retailer'`. Discovery therefore publishes these shoes on its own when an
importer lists them; it holds `no_brand_page` only when none does, and
nothing lifts that automatically. The owner adds those by hand:

```
npm run shoes -- add --brand "Li-Ning" --model "Feidian 6 Elite" --lift-no-brand-page
```

`add` runs the same gate as a user suggestion (`too_old` and `reviews_lt_2`
lifted); `--lift-no-brand-page` also lifts `no_brand_page`. The retailers
are still searched, and if nothing names the shoe the pass has
`brandPage: null`: the specs are parsed from web-search snippets
(`"<brand> <model>" running shoe specs`, five results) instead of a page, and
the release date comes from review dates alone. `--terrain` and `--category`
are handed to the spec parser as overrides (`evaluate(…, { specs })`), laid
over the LLM's reply *before* its taxonomy check, so a valid value from the
owner rescues an invalid one from the model instead of holding
`bad_taxonomy`. The shoe is published with `origin: 'seed'`
(no candidate row, no user), then an image is sought. **Images for such
shoes come only from those importers**: with no brand page there is no
brand phase, and the retailer phase's only pages naming the exact model are
theirs. Expect `image: NONE` if none of them lists the shoe.

## Images

`src/lib/shoes/images/` finds one image per shoe, brand phase first,
retailer only if nothing from the brand phase stored:

1. **Candidates** (`images/candidates.ts`): the brand product page's JSON-LD
   `Product` images, then its `og:image`/`twitter:image`; if that phase
   yields nothing, retailer product pages (the same `searchRetailerPages`
   walk as the gate: the brand's importers, then `UK_RETAILERS` —
   startfitness.co.uk by its own Shopify search, the rest by `site:` search)
   — but only ones that name the exact model **and** version, checked by
   `pageNamesExactModel(model, url, title)` (`src/lib/shoes/pageMatch.ts`,
   the one matcher the gate, the site adapters, the review lookup and the
   image finder share) against the fetched page's `<title>`.
   `pageNamesExactModel` also rejects a **variant word** straight after the
   model in the title or URL slug — `st, gtx, gore, gt, wp, tr, pro, elite,
   ultra, max, plus, challenger, turbo, fly, lite, light, se, x` — unless the word is
   part of the model itself: the `361° Miro Nude` was once proved (and
   pictured) by the `Miro Nude ST` page, and a following version *number*
   was already caught. `isProductPageUrl` is a separate, weaker check: it only ranks
   product-shaped URLs (`/product/`, `/p/`, `/buy/`, …) above article-shaped
   ones (`/article/`, `/blog/`, `/news/`, …) when picking which search results
   to fetch — it doesn't confirm the model.
2. **Filters** (`images/verify.ts`): `NON_CATALOGUE_HOSTS` rejects known-bad
   hosts (eBay, Bazaarvoice, Outside Online, etc.) before spending a vision
   call; `isLikelyProductImage` filters obvious non-product URLs (logos,
   icons, placeholders, banners) — "default" is rejected only as a filename
   and "brand" only as a logo/mark/icon, because Salesforce Commerce Cloud
   brand sites (Hoka, Brooks, Saucony) serve every catalogue image under a
   `/default/` path segment; `checkImageSize` rejects anything too small to
   be a real product shot.
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
retries on later weekly runs until something passes.

### Which shoes get tried

"Stored by the pipeline" means `image_url` starts with the bucket's public
`shoes/` prefix (`isR2ImageUrl` in `images/store.ts`, built from
`R2_PUBLIC_URL`); anything else — null, or a hotlink from the old catalogue —
needs an image. There is no separate attempt column: **`image_verified_at`
is the last successful verification when `image_url` is on R2, and the last
attempt when it is not.** A failed `findAndStoreImage` (nothing passed
verification; a thrown error does not count) stamps `image_verified_at =
now()` and leaves `image_url` as it was, and the weekly pass orders by
`image_verified_at ASC NULLS FIRST`, so every shoe is tried once before any
is tried twice and a shoe that found nothing waits behind the whole queue.

### Weekly image audit

`auditImages()` HEADs every stored image. `404`/`410` clears the four
`image_*` fields (`imagesCleared` in the report, re-tried next run); `429`,
5xx, or no response at all count as merely **unverified**, not cleared — a
flaky CDN should not wipe a good image.

## Digest & publish-anyway

After every **non-dry** run, `sendDigest()` (`src/lib/shoes/job/digest.ts`)
emails `stephen.cousins@gmail.com (override with `SHOE_DIGEST_TO`; Resend's default sender only reaches the account owner until filmmyrun.com is verified at resend.com/domains)` via Resend: published (flagged if it has no
image), held (with reasons and a **"Publish anyway"** link),
linked-to-existing, errors, images stored and cleared, and empty feeds. Each
shoe carries two links, "data" (`/api/shoes/<slug>`, the record) and "finder"
(`/tools/shoe-finder`); there is no per-shoe page yet and the finder takes no
URL state. `sendDigest` is a silent no-op (returns `false`, no log line) on a
dry run or when `RESEND_API_KEY` is missing; if `CRON_SECRET` is missing it
logs a warning and also sends nothing (there's no key to sign publish links
with). The Resend SDK reports an API error (unverified sender domain, 422,
429) in its response instead of throwing; `sendDigest` turns that into a
throw (`Resend: <name>: <message>`), and the route handler logs it **and
adds it to `errored` as `{ slug: 'digest' }`, so the run returns 500 and the
workflow fails**. The only silent case left is a missing key.

**Publish anyway**: the link token is an HMAC-SHA256 of the candidate id
keyed by `CRON_SECRET` (`publishToken`/`verifyPublishToken`, constant-time
compared). `GET /api/shoes/candidates/[id]/publish?token=…` shows a
confirmation page (a mail client's link-scanner following the GET must not
publish anything); the page's form `POST`s the same token, which re-runs the
gate with `too_old` and `reviews_lt_2` overridden — the same two holds the
`/api/shoes/add` user path lifts. Every other hold (`brand_unresolved`,
`no_brand_page`, `bad_taxonomy`, `specs_unparseable`) still blocks it; an
already-published or already-rejected candidate returns a plain message
instead of a form. The only path that lifts `no_brand_page` is the CLI
`add --lift-no-brand-page` (see "Brands without a findable English product
page").

## Site adapters

`src/lib/shoes/sitesearch/` is how the pipeline asks a site for a page
about one shoe **without a search engine**. One shape, `findPages(adapter,
brand, model) → { url, title }[]`, three kinds, every result filtered
through `pageNamesExactModel` and every page still fetched and its
`<title>` checked by the caller:

- **`rtings-url`** — RTINGS reviews live at
  `https://www.rtings.com/running-shoes/reviews/<brand-slug>/<model-slug>`;
  one GET answers 200 with the review or a 404 page.
- **`html-search`** — the site's own search page (`?s=` on WordPress,
  `/search/?q=` on Runner's World, the Saucony and Nike storefront
  searches), every anchor whose URL matches the adapter's `linkPattern`.
  Anchors are named from a `title`/`aria-label`/`data-vars-ga-call-to-
  action` attribute when there is one (Runner's World's card text is the
  byline), else their text; query strings are dropped (Saucony's `?dwvar_…`
  colourways) and the longest name per URL kept.
- **`shopify`** — the store's `/search/suggest.json?q=<model>`
  (`findShopifyProductPages`), for brand and retailer stores on Shopify.
  `store` is the host plus a locale prefix where the store only answers
  under one (`www.altrarunning.com/en-us`).

Every fetch sends a Chrome UA with a 15 s timeout and has `fetchPage`'s
three outcomes: a body, `null` on 404/410, or a thrown `unreachable:
<status|timeout|network>` on 403/406/429/5xx — so a caller falls back to
Brave on a refusal and treats an absence as an absence. The Brave (or
Serper) search is now only ever the **fallback**: no adapter for the brand,
an adapter that refused or named nothing, fewer than two review sites
answering, the non-Shopify UK retailers, and the specs snippets for a
page-less `add`.

| Site | Used for | Adapter | Probed 14 Sep 2026 | When it goes quiet, check |
|---|---|---|---|---|
| rtings.com | reviews (stored as `other`); discovery feed | `rtings-url`; `/latest-rss.xml` with `linkPattern` | 200 / 404 by URL; feed 200, 30 items all categories | GET the review URL for a shoe you know it has (`hoka/clifton-10`); the JSON-LD `reviewRating` must still be there |
| runnersworld.com | reviews; discovery feed | `html-search` `/search/?q=`, links `/gear/a<id>/` | 200 | the result anchors still carry `data-vars-ga-call-to-action` and `href="/gear/a…"` |
| irunfar.com | reviews; discovery feed | `html-search` `?s=`, links `…review…` | 200 | `<h3 class="article-title"><a href=…>` in the results |
| believeintherun.com | reviews; discovery feed | `html-search` `?s=`, links `/shoe-reviews/` | 200 | `<div class="result"> … <h4><a href="/shoe-reviews/…">` |
| theruntesters.com | reviews; discovery feed | `html-search` `?s=`, links `…review…` | 429 once, then 200 | a 429 is a refusal: that week's review comes via the Brave fallback; persistent 429 = they rate-limit the UA |
| runningshoesguru.com | reviews; discovery feed | `html-search` `?s=`, links `/reviews/<cat>/<slug>/` | 200 | `<a … rel="bookmark">` under `h3.entry-title`; the JSON-LD `Review.reviewRating` |
| doctorsofrunning.com | reviews; discovery feed | `html-search` `?s=`, links `…review…` | 200 | `h2.wp-block-post-title > a` |
| runrepeat.com | reviews | none (403 to every server fetch) | 403 | Brave fallback only |
| roadtrailrun.com | reviews | none (Cloudflare challenge) | 403 | Brave fallback only |
| saucony.com | brand page | `html-search` `/UK/en_GB/search?q=<model>`, links `/UK/en_GB/<slug>/<sku>.html` | 200, product links in HTML | `a.name-link` in the results |
| nike.com | brand page | `html-search` `/gb/w?q=<model>`, links `/gb/t/` | 200, product links in HTML | `a.product-card__link-overlay` |
| on.com | brand page | none: Nuxt, search is client-side (`/en-gb/search?q=` returns an error shell) | 200, 4 KB | Brave `site:on.com` fallback finds the page |
| 361europe.com, eu.anta.com, nordarun.com, xeroshoes.com, altrarunning.com (`/en-us`), atreyu.com, newtonrunning.com, runspeedland.com, mounttocoast.com, lemsshoes.com, freetbarefoot.com, normanwalsh.com | brand page (`BRAND_SITE_ADAPTERS`); most also discovery (`NEW_ARRIVALS_STORES`) | `shopify` | `suggest.json` 200 with products; `products.json` 200 | `https://<store>/search/suggest.json?q=x&resources[type]=product` still returns `resources.results.products` |
| kicksown.com, qiaodan.asia, dynafish.us | Chinese-brand importers (gate fallback, images); kicksown also discovery | `shopify` | 200 | as above |
| startfitness.co.uk | first UK retailer (gate fallback, images); discovery | `shopify` | 200 | as above |
| karhu.com, scarpa.com, raidlight.com, lunasandals.com, bedrocksandals.com, shammasandals.com | discovery only (`NEW_ARRIVALS_STORES`, each with a `typePattern`) | `products.json` | 200 with products (suggest.json on karhu/scarpa/raidlight was 503 on the earlier probe, so no brand-page adapter) | `https://<store>/products.json?limit=5` still returns `products`; the `product_type` of a running shoe is still "Running" / "Trail Running" / "Chaussures de trail …" / "Sandal" |
| tracksmith.com (404), nnormal.com (404), topoathletic.com (HTML back), diadora.com (404), vivobarefoot.com (403) | — | none | probed, no Shopify search | Brave `site:` fallback |

**Adding a site**: an entry in `REVIEW_SITE_LOOKUPS`, `BRAND_SITE_ADAPTERS`
or `NEW_ARRIVALS_STORES`, a trimmed capture of the live response under
`sitesearch/__fixtures__/` (curl with a Chrome UA, keep the `<title>` and
the result anchors), and a test in `sitesearch/index.test.ts` that finds
the right page and rejects a version neighbour.

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
| `backfill-images [--limit N] [--from-slug S] [--force] [--clear-hotlinks]` | Image pass over the whole catalogue — current shoes first, then superseded. Skips shoes already on R2 unless `--force`; resume a long run with `--from-slug`. Afterwards it lists every shoe still on a non-R2 `image_url`: with `--clear-hotlinks` it nulls their four `image_*` fields (the spec's "a shoe whose image fails the stricter match ends with `image_url = null`", so a placeholder replaces a look-alike); without it, it prints the count and the command. `--limit 0 --clear-hotlinks` runs only that step. A shoe that finds nothing is stamped as attempted, like in the weekly job. |
| `run-weekly [--dry-run]` | Runs `runWeekly()` in-process and prints the `JobReport` as JSON. It does **not** send the digest — that is the HTTP route's job, so the CLI needs neither `RESEND_API_KEY` nor `CRON_SECRET`. |
| `candidates [--status held\|pending\|rejected\|published]` | Lists discovered candidates with their hold reasons. |
| `audit-images` | HEADs every stored image and clears the ones that are gone. |
| `add --brand "X" --model "Y" [--lift-no-brand-page] [--terrain road\|trail\|both] [--category …]` | Owner-curated add: the user-suggestion gate (age and review-count holds lifted), published as `origin: 'seed'`, then an image find. `--lift-no-brand-page` also lifts `no_brand_page` — see "Brands without a findable English product page". Refuses a shoe already in the catalogue (prints its slug); exit 1 if held. |

Needs `.env` with `DATABASE_URL`, `OPENROUTER_API_KEY`,
`BRAVE_SEARCH_API_KEY` (or `SERPER_API_KEY`) and the `R2_*` credentials.
No command sends email. Exit code is 1 on any error.

**To fix one shoe's image:**
```
npm run shoes -- image --slug <slug> --force
```

## Data model

Additions on top of the original `shoes`/`shoe_reviews` tables (see
`prisma/schema.prisma`, the source of truth):

- **`shoe_brands`** — `name` (unique canonical name), `aliases` (String[]),
  `domain`, `new_arrivals_url` (nullable, unused since 14 September 2026 — the store list lives in code, see Discovery). Referenced by both
  `shoes.brand_id` and `shoe_candidates.brand_id`.
- **`shoe_candidates`** — `brand_id` (nullable — null while `brand_unresolved`),
  `brand_text`/`model_text` (raw, pre-resolution), `slug` (unique),
  `status` (`CandidateStatus`: `pending | published | held | rejected`),
  `hold_reasons` (String[]), `evidence` (JSON — `{ sources: [{source, url,
  title, publishedAt}] }`, merged across runs), `shoe_id` (set once
  published), `first_seen_at`, `last_seen_at`, `decided_at`.
- **`shoes`** additions: `origin` (`ShoeOrigin`: `seed | user | discovery` —
  `seed` is both the original catalogue and the CLI `add` command),
  `added_by_user_id`, `superseded_by_id` (self-relation — the newer version of
  this line), `user_avg_score`/`user_rating_count` (from `shoe_user_ratings`,
  distinct from the expert `avg_score`/`review_count`), `image_url`,
  `image_source_url`, `image_method`, `image_verified_at` (last successful
  verification when `image_url` is on R2; last attempt otherwise — see
  "Which shoes get tried").
- **Enums**: `ShoeTerrain` (`road|trail|both`), `ShoeCategory`
  (`daily_trainer|race|long_run|speed|ultra|stability|max_cushion|minimal`),
  `ShoeOrigin`, `CandidateStatus`.

## Environment

| Variable | Used for |
|---|---|
| `DATABASE_URL` | Everything |
| `OPENROUTER_API_KEY` | Nomination normalisation, spec parsing, image vision check |
| `BRAVE_SEARCH_API_KEY` or `SERPER_API_KEY` | The fallback behind every site adapter: brand pages for brands without one, the UK retailers except Start Fitness, reviews when fewer than two sites answered, specs snippets for a page-less `add` |
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
  reads whatever `brand_id` is already stored on the candidate. The brand
  cache is cleared at the start of every run and expires after five minutes
  anyway, so no redeploy is needed.
- `no_brand_page`: look at the candidate's evidence
  (`npm run shoes -- candidates --status held`, then the row). If it carries
  `brandUnreachable`, the brand site refused the fetch *and* no retailer in
  `RETAILER_DOMAINS` had a page naming the exact model; the gate rechecks
  both weekly. Without it the brand site answered and has no such page —
  nothing to do until the brand publishes it, unless it is one of the brands
  with no findable English page, which the owner adds by hand with
  `npm run shoes -- add … --lift-no-brand-page` (the candidate then closes as
  linked on the next run, since its slug now exists).
- `too_old`: will never clear itself by design. Use "Publish anyway" from the
  digest email, or `POST` the same signed link if you kept it.
- `reviews_lt_2`: clears itself once a third review source is found on a
  later run, or use "Publish anyway".
- `bad_taxonomy` / `specs_unparseable`: the brand page's text isn't giving the
  LLM a clean spec read. Check `findBrandProductPage(brand, model)` returns a
  real product page, not a category/listing page; re-run once it does.
- Held candidates left untouched for 8 weeks close as `rejected` regardless of
  reason — check with `npm run shoes -- candidates --status rejected`.

**Feed or store empty every week**: check `feedsEmpty` and `storesEmpty` in
the report/digest. An entry with a suffix (`irunfar (HTTP 403)`,
`shopify:nordarun.com (unreachable:503)`) is a fetch that failed; a bare
key is a feed or store that answered with nothing usable (for a
`version-bump:` store, nothing newer than the catalogue, which is normal). Either way, first suspect the tool, not
the pipeline — try fetching the feed URL directly with the headers in
`rss.ts`, or `https://<store>/products.json?limit=250` with a Chrome UA,
before assuming the site stopped publishing. A feed that fails every week
should be removed from `FEEDS` (as Road Trail Run was), and a store from
`NEW_ARRIVALS_STORES`, not left to train the eye to skip that section. The
Shopify brand stores publish new products rarely (Altra: two in the 21 days
before 14 September 2026; Anta: one), so a bare `shopify:` entry is the
normal week.

**Digest not arriving**: check the workflow run first. A Resend API error
(the sending domain not verified, or the default `onboarding@resend.dev`
sender used for a non-owner address, 422, 429) puts
`{ slug: 'digest', error: 'Resend: …' }` in `errored`, the run returns 500
and the workflow fails with the message in the step summary. If the run was
200 and there is still no email: `report.dryRun` true means no digest, by
design; otherwise `RESEND_API_KEY` is not set in the deploy environment — a
missing key makes `sendDigest` return `false` **silently** (no error, no log
line). A missing `CRON_SECRET` logs a warning ("cannot sign publish links")
and also sends nothing. `run-weekly` from the CLI never sends one.
