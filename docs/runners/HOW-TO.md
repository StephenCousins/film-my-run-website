# Runner profiles: how to add runners

Pages live at filmmyrun.com/runners. Spec: `docs/superpowers/specs/2026-09-27-runner-profiles-design.md`.

Bios for the first batch (and any hand-made page) are written in a Claude Code
session, on Stephen's subscription, so they cost nothing per page. Automatic
pages from the daily news cost about 10p each (see "Automatic pages" below).

## 1. Gather

```bash
npx tsx --env-file=.env --tsconfig tsconfig.json scripts/runners-gather.ts "Ann Trason" --historic
npx tsx --env-file=.env --tsconfig tsconfig.json scripts/runners-gather.ts --utmb 2704.kilian.jornetburgada
npx tsx --env-file=.env --tsconfig tsconfig.json scripts/runners-gather.ts --top 50   # top 50 women + 50 men by UTMB index
```

Each writes `runners-work/<slug>.json` (git-ignored). It holds:

- `texts`: UTMB results, the Wikipedia article and our own news stories.
- `results`: UTMB finishes.
- `photoCandidates`: the Wikipedia lead photo, when Commons names who took it.

It prints NOT FOUND when there is no UTMB entry and no Wikipedia article about
running. Try `--utmb <uri>` (look the runner up on utmb.world) or the exact
Wikipedia title.

## 2. Write, in the session

Fill these into the work file:

- `bio`: 3 to 5 plain paragraphs.
  - News-desk voice, third person, British English. Sentences average about 16 words, none over about 30. Pick the highlights, not every result.
  - No em dashes, no semicolons.
  - Every fact from `texts`, nothing from memory. Check the sources are about the same person: namesakes are common (a Wikipedia "Hannah Allgood" was an 18th-century cookery writer).
  - No 10-word run copied from a source.
  - Living people (Stephen's rules, 27 Sep 2026):
    - No family life: no spouses, partners, children or family disputes. A relative is named only as a coach, training partner or fellow runner.
    - No medical or mental-health conditions, even ones the runner has spoken about publicly. A running injury that stopped a race or season is fine.
    - Doping only where an official body ruled (AIU, USADA, UKAD, WADA or a federation). Name the body and state the ruling as made.
    - Other controversies only if well reported, stated plainly with no comment, and about their running or sponsorship. No insinuations.
  - A runner who has died: plain and respectful. Give the date, never the cause.
  - Thin sources: you may add iRunFar, federation, race or the runner's own pages to `texts` (with the passage you read) and to `sources`.
- `bestFinishes`: `{race, year, distance, time, position, source}`.
  - `source` must be the name of an entry in `sources`.
  - Tidy UTMB's race names ("HARDROCK 100 ENDURANCE RUN HARDROCK 100 - CW" becomes "Hardrock 100").
- `sources`: the `{name, url}` entries actually used.
- Profile fields:
  - `aliases`: other spellings used in the news (e.g. "Kilian Jornet Burgada").
  - `disciplines` (`trail_ultra`, `road`, `track`).
  - `era` (`current` or `historic`).
  - `nationality`, `sex`, `birthYear`.
  - Change `slug` and `name` if UTMB's form reads badly (UTMB gives "Kilian Jornet Burgada"; we use "Kilian Jornet").
- `photos`: every runner gets at least a portrait (Stephen, 27 Sep 2026: copyrighted photos are fine when credited). Up to one `portrait` and one `action`, each `{kind, url, credit, licence, source_url}`. Look in this order:
  1. Wikimedia Commons. Search with `action=query&generator=search&gsrsearch=filetype:bitmap "Name"`. Credit "Photo: <Artist> / Wikimedia Commons".
  2. Any credited photo on the web: iRunFar (captions name the photographer), sponsor athlete pages, the runner's own site, race or federation pages, non-agency news, public Instagram. Credit "Photo: <photographer> / <outlet>", or the owner ("Photo: HOKA") when no photographer is named.
  3. Fallback: the runner's UTMB profile picture. `profilePicture` in the UTMB runner page's `__NEXT_DATA__` becomes `https://img.utmb.world/image/upload/q_auto/f_jpg/c_limit,w_1600/v1/<path>`. Credit "Photo: UTMB profile". Use it only when it's a real photo of them.

  Look at every candidate before using it, and make sure it's clearly them. **Never an agency photo** (Getty, AFP, Reuters, AP, PA, Shutterstock, Alamy). The save step refuses them.

## 3. Save

```bash
npx tsx --env-file=.env --tsconfig tsconfig.json scripts/runners-save.ts runners-work/<slug>.json
```

It runs the checks, copies the photos to R2 (`runners/<slug>-<kind>.webp`,
never hotlinked) and publishes. "Not saved" names what to fix: fix it and run
it again. Nothing is ever held.

Then check what's served: `curl -s -o /dev/null -w "%{http_code}" https://filmmyrun.com/runners/<slug>`.

## Taking a photo down (a takedown or an invoice)

```bash
npx tsx --env-file=.env --tsconfig tsconfig.json scripts/runners-photo.ts <slug> --remove portrait
```

The branded card shows instead.

## What happens by itself

- **Links:** a runner's name or alias in any news story links to their page
  when the story is shown.
  - Only the first mention is linked.
  - Only names of two or more words, matched as whole words.
  - A name two runners share links neither.
  - Nothing is saved into the story.
- **In the news:** a runner's page lists every story that links them.
- **The runner file:** the news writer gets our page on any runner a story
  names as one more source.
  - Sentences marked `*` are left out.
  - It never counts as a second report of the event.
- **Monday:** the 06:17 news run refreshes every UTMB index.
  - It has a 5-minute limit.
  - If UTMB stops showing indexes altogether, nothing is overwritten.
  - The result is a line in the Monday email.
- **Automatic pages:** runners a new story is about get a page written
  through OpenRouter (`written_by = 'auto'`, no photos, the card).
  - At most 3 attempts a day, and at most $1 of spend per run, inside the £10 monthly ceiling.
  - An 8-minute limit.
  - They never overwrite an existing page.
  - Only runners with a UTMB entry or a Wikipedia article about running get one.
  - A name that failed is skipped for 14 days.
  - The Monday email lists them. Add their photos in a session.
