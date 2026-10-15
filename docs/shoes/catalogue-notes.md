# Shoe Finder: older catalogue notes

Moved from CLAUDE.md's "Running Shoe Finder" section on 15 Oct 2026.
**`docs/shoe-finder.md` is the current reference** for the weekly pipeline,
gate, images, CLI, data model and environment; where the two disagree, trust
that doc. These notes are kept for the parts it does not restate.

**Page:** `/tools/shoe-finder`
**API:** `GET /api/shoes`: supports filters: `terrain`, `category`, `brand`, `sort`, `minDrop`, `maxDrop`, `search`

## Database Tables
- `shoes`: brand, model, slug, terrain, category, drop_mm, weight_g, stack_height_mm, price_gbp, release_year, description, image_url, buy_url, avg_score, review_count, last_reviewed
- `shoe_reviews`: shoe_id, source, source_url, expert_score, user_score, user_count, summary, fetched_at
- Unique constraint on `shoe_reviews`: `(shoe_id, source)`

## Scripts

Shoe maintenance is one CLI over `src/lib/shoes/`: `npm run shoes -- <command>`
(`scripts/shoes.ts`; its header lists every command and flag). It needs
`DATABASE_URL`, plus `BRAVE_SEARCH_API_KEY`, `OPENROUTER_API_KEY` and the `R2_*`
credentials for anything that searches or verifies.

| Command | Purpose |
|---------|---------|
| `enrich --slug S` | Fetch review scores for one shoe and recompute its score |
| `image --slug S [--force]` | Find, verify and store an image for one shoe |
| `backfill-images` | Image pass over the catalogue (`--clear-hotlinks` nulls non-R2 images) |
| `run-weekly [--dry-run] [--max-publish N]` | The weekly discovery/publish job, in-process |
| `candidates`, `audit-images`, `add --brand X --model Y` | Inspect holds, prune dead images, owner-curated add |

`node --env-file=.env scripts/seed-shoes.mjs` still imports `data/shoes-seed.json`.

## Image Matching Notes
- Uses two-pass search: quoted exact query first, broader fallback second
- `fetchPageData` collects images from og:image, twitter:image and JSON-LD.
  **JSON-LD is filtered to `Product` entities**: retailer pages embed
  related-product carousels in their structured data, and without that filter a
  page genuinely about the Hoka Mafate X served up a Mafate hiking boot.
- Vision then checks the candidate. It judges **photo quality and legible brand
  or model names only**: it is explicitly told not to guess version numbers.
  Asked to verify the model, it invents them (it called a Brooks Ghost 18 a
  "Ghost 15" from a shoe with no version printed on it). Model identity is the
  job of the page/URL match, not the vision call.
- Only an explicit YES passes. An API failure counts as unverified, not a pass:
  a wrong image is worse than none, and a null `image_url` renders a placeholder.
- `NON_CATALOGUE_HOSTS` rejects eBay, Bazaarvoice, Outside Online and similar
  before spending a vision call; every bad image in the Aug 2026 audit came from
  one of those.
- Verified images are stored on R2 (`src/lib/shoes/images/store.ts`).
- To fix a specific mismatched shoe: `npm run shoes -- image --slug <slug> --force`

## Review Score Notes
- Brave Search finds review pages, regex extracts explicit scores (e.g. 9.2/10)
- Where no explicit score exists, the LLM reads the review text and infers a score
- Scores are normalised to 0–10 (5-star ratings doubled, percentages divided by 10)
- Results filtered to only include pages that mention the exact shoe model name
- Sources: runrepeat, runners_world, irunfar, believe_in_run, the_run_testers

## Seed Data
`data/shoes-seed.json`: 123 curated road and trail shoes across all major brands.
To add more shoes: append entries to the JSON and re-run `seed-shoes.mjs` (skips existing slugs).
