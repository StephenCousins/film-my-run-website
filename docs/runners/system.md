# Runner profiles: how the system works

Moved from CLAUDE.md's "Runner profiles" section on 15 Oct 2026. The recipe
for adding runners is `docs/runners/HOW-TO.md`.

`/runners` and `/runners/[slug]` show a page per runner. Each page has a bio, up
to two photos, best finishes, a live UTMB index and "In the news". The spec is
`docs/superpowers/specs/2026-09-27-runner-profiles-design.md`.

- **Table:** `runners`. `photos`, `best_finishes` and `sources` are jsonb, and
  `written_by` is `session` or `auto`. The code lives in `src/lib/runners/`.
- **Links:** `linkRunners` links runner names in news stories when the page is
  shown. The stored story HTML is never changed. "In the news" uses the same
  matcher (`mentionedSlugs`), so the two directions always agree.
- **The news writer reads our runner file.**
  - `RUNNER_FILE_SOURCE` joins the bundle's sources for the writer and the
    fact-checker.
  - It is left out of the published sources, the near-copy check and the
    "second report" count.
  - Sentences marked `*` in a bio are dropped from it.
- **Monday:** `news:daily` refreshes every runner's UTMB index before the
  weekly email. It has a 5-minute limit and a guard for UTMB changing its page
  shape. From the same page read (since 20 Oct 2026) it stores every UTMB finish
  in `results` (the page's "Race history") and adds new podiums to best finishes,
  so a weekend's result shows by Monday. No AI, no cost.
- **Automatic pages:** `src/lib/runners/auto.ts` writes pages for runners new
  stories are about.
  - At most 6 attempts a day and $1.50 per run, inside the £10 ceiling.
  - An 8-minute limit.
  - It never overwrites an existing slug and skips names that failed in the
    last 14 days.
  - Pages use the runner's UTMB profile picture as a portrait when they have
    one, otherwise no photo until a session adds one.
- **Monthly refresh:** on the first Monday of the month `news:daily` runs
  `src/lib/runners/monthly.ts` after the UTMB index refresh: up to 20 bios with a
  UTMB podium since the last bio check, or a newer story, revised through the same fix loop as auto pages (`checkedBio`). $3, no bio
  started after 10 minutes; photos and `written_by` are kept; its spend
  is recorded after every bio. Runs after the weekly email, with its own email.
  `--monthly-refresh` runs it by hand.
- **Personal bests:** `src/lib/runners/pbs.ts` reads the `personal_best` field
  of the Wikipedia infobox the page cites as a source (that exact article, never a
  name search) into `personal_bests`. First Monday of the month, before the bio
  refresh; free. A failed read or an empty field keeps what was stored. Many
  legends' infoboxes have no such field (Ron Hill, Ingrid Kristiansen).
- **Photos:** only free-licence Commons photos or others with a named
  photographer. `AGENCY_CREDITS` refuses agency credits.
- **ITRA is out of scope:** itra.run blocks automated requests.
