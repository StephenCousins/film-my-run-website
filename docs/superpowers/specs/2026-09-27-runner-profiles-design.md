# Runner profiles: design

Agreed with Stephen, 27 Sep 2026.

## Why

1. **SEO.** A page per notable runner catches searches on runner names.
2. **Better, cheaper news.** The news writer reads a local file on each runner it
   writes about, so it needs fewer web searches, and every story links the names
   it mentions to their pages.

It is an ongoing project. Completeness is not the goal; the pages grow over time.

## Who is in it

- Current trail and ultra runners first, then road and track, plus historic greats
  (Ann Trason, Paula Radcliffe, Mo Farah, Scott Jurek and others).
- **First batch, about 150:**
  - everyone named in our published news stories, so links work from day one
  - the top 50 men and top 50 women by UTMB index
  - about 25 historic greats: Stephen's four plus names I suggest and he approves
- **After that:** anyone a newly published news story names gets a page
  automatically (see "Writing").

## Storage

A new Prisma model, `runners`. It uses snake_case like the rest of the schema.

| Field | Notes |
|---|---|
| `id`, `slug` (unique), `name` | `slug` from the name, e.g. `ann-trason` |
| `aliases` text[] | Other spellings: "Kilian Jornet Burgada", "Jim Walmsley" vs "James Walmsley" |
| `nationality` (ISO 2), `sex` (`M`/`F`), `birth_year` | Any of these may be null |
| `disciplines` text[] | Values: `trail_ultra`, `road`, `track`; these match the news `Topic` |
| `era` | `current` or `historic` |
| `bio` | HTML, 3 to 5 short paragraphs |
| `best_finishes` jsonb | `[{race, year, distance, time, position, source}]` |
| `sources` jsonb | `[{name, url}]`, shown on the page |
| `utmb_id`, `utmb_uri`, `utmb_index`, `utmb_index_at` | Refreshed weekly |
| `photo_url`, `photo_credit`, `photo_licence`, `photo_source_url` | Null means the branded card is shown |
| `status` | `published` or `draft` |
| `written_by` | `session` or `auto` |
| `created_at`, `updated_at`, `bio_checked_at` | |

ITRA scores are **out of scope**. itra.run answers automated requests with a bot
challenge (HTTP 202 with an empty body), and its terms may not allow collection.
Nullable `itra_*` columns can be added later if Stephen wants them.

## Where facts come from (cheapest first)

1. **Local data, no web:**
   - the DUV ultra finishes, 2010 to 2026 (`filmmyrun-ios/tools/ultra-calibration/`)
   - the rankinglists UK road dataset
   - Centurion results
   - `po10_athletes`
   - our own published `news_stories`
2. **UTMB public API** (`api.utmb.world`; robots.txt allows everything). The
   ranked search gives the index, UTMB id, nationality and sex:
   `/search/runners?category=general&sex=H|F&limit=&offset=`.
3. **Web:**
   - Wikipedia through its REST API. The text is CC BY-SA, so we rewrite it,
     never copy it, and list it as a source.
   - the runner's own site
   - interviews and race reports found by the existing news `moreCoverage` search

Every fact in a bio must come from one of these. The news rules apply unchanged:

- The fact-checker compares the bio with its sources.
- An unconfirmed fact is first looked up in more coverage, then corrected or cut.
  As a last resort it keeps an asterisk and "* Film My Run could not verify this
  information."
- The code checks for em dashes and near-copies (`rules.ts`) also apply.
- The voice is the news desk's third-person reporter, not Stephen's first-person
  blog voice.

**Care with living people:**

- Nothing about health, family or private life beyond what the runner has made
  public.
- Doping is mentioned only when an official body (AIU, USADA, UKAD, WADA or a
  national federation) has ruled, and the ruling is stated as it was made.
- A death is stated only from a reliable report.

## Photos

- **Only** Wikimedia Commons photos under a free licence (credit and licence
  shown on the page), or Stephen's own photos and film stills.
- UTMB profile pictures and press photos are **not** used.
- A runner with neither gets a branded Film My Run card showing their name,
  flag and UTMB index.
- Photos are copied to R2 under `runners/`, never hotlinked.

## Pages

- **`/runners`**
  - lists published runners
  - has a search box and filters for discipline and era
  - sorts by UTMB index by default, with the historic greats in their own section
- **`/runners/[slug]`**
  - photo (or card), name, flag, disciplines
  - UTMB index with "as of <date>"
  - the bio
  - a best-finishes table
  - "In the news": every published Film My Run story about this runner, newest
    first, with date, headline and thumbnail, each linking to the story. It is
    worked out live, so a new story appears the moment it publishes, and it is
    left out when there are none.
  - sources
- Both pages are `force-dynamic` (the database can't be reached at build time).
- Each runner page has Person JSON-LD and a breadcrumb.
- The sitemap lists every published runner.
- Nav: `/runners` goes on the news page and in the footer. There is no new
  top-nav item.

## Links from news stories

- Linking happens **when a story page is shown**. The stored story HTML is never
  changed, so the 16 existing stories get links too, and so does any runner added
  later.
- Only the first mention of a runner in each story is linked.
- A mention counts only when it matches the runner's `name` or an alias exactly
  (case-sensitive, whole words).
- A name or alias shared by two published runners is linked for neither.
- Text inside existing links, headings and figcaptions is never linked.
- "In the news" is worked out the same way: a story counts when it would link
  the runner.

## Writing

**The first batch is written in Claude Code sessions**, on Stephen's
subscription, so it has no per-bio cost:

- `npm run runners:gather -- <name | utmb uri>` collects local data, the UTMB
  entry, Wikipedia and other sources into `runners-work/<slug>.json`.
- Claude writes the bio and best finishes in the session.
- `npm run runners:save -- runners-work/<slug>.json` runs the code checks
  (em dashes, near-copy, 3 to 5 paragraphs, every best finish has a source),
  uploads the photo, and publishes.
- `runners:save` rejects a draft that fails the code checks. Nothing is held for
  review; it is fixed in the session and saved again.

**New names from the daily news are written automatically:**

- After the news run publishes, it pulls the people named in the new stories
  (the writer lists them) and looks each one up in `runners`.
- Anyone without a page gets `gather` and then a bio through OpenRouter, using
  the same writer, fact-check and fix rounds as a news story.
- At most 3 a day, counted against the news run's £10 monthly ceiling, at about
  10p each.
- Minor people get no page:
  - the writer only lists runners the story is about
  - a runner must have at least one result we can find (UTMB, DUV, Power of 10
    or Wikipedia), or no page is made
- Auto pages are published with `written_by = 'auto'`. The Monday email lists
  them.

**The news writer uses the runner file:**

- Before writing, the pipeline finds published runners named in the bundle's
  source texts (the same exact-name matching as the links).
- It adds each runner's profile (bio, best finishes, UTMB index) to the bundle
  as a source named "Film My Run runner file".
- The fact-checker accepts facts from it like any other source, so fewer bundles
  need `moreCoverage`.

## Keeping it current

- **Weekly GitHub Action (no AI, free).** It refreshes `utmb_index` and
  `utmb_index_at` for every runner with a `utmb_id`, and records a runner who
  drops off UTMB's ranking without deleting anything. Its secrets are the same
  as the news workflow's.
- "In the news" is always live.
- Bios are **not** rewritten automatically. A bio is refreshed when Stephen asks,
  or in a session when something big happens to that runner (the news pipeline
  can flag it). `bio_checked_at` shows the age of each bio.

## Out of scope

- ITRA scores.
- Automatic bio rewrites.
- A runner comparison tool.
- Runner pages in the iOS app.
- Photos from UTMB, sponsors or press kits.

## Success

- 150 runner pages live, each with at least 3 paragraphs, a sourced
  best-finishes table and a UTMB index or historic record.
- The 16 existing news stories show links for every runner they mention who has
  a page.
- The weekly job updates the UTMB index, and the date on the page changes.
- A news story about a runner with a page can pass its fact check with no web
  search when the runner file covers the facts.
- A new name in a news story has a page by the next morning.

## Risks

- **Wrong-person links** (two "David Roche"s). Handled by exact matching and by
  never linking a name that belongs to two runners.
- **Stale facts in bios.** `bio_checked_at` is shown, and the index date is
  always shown.
- **UTMB changes its API.** The weekly job fails loudly in the Monday email and
  the page keeps the last index with its date.
- **Copyright.** Text is rewritten and checked for near-copies; photos only
  under a free licence or Stephen's own.
