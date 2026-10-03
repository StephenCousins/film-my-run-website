# Handover history

Dated status entries moved out of CLAUDE.md. Newest first.

## 2-3 Oct 2026: news fixes, must-cover races, Ask Stephen busy switch, Fartlex

**News pipeline**
- New feeds: Run Ultra, RunABC North, Runner's World UK (`rss-fetcher.ts`). The page extractor takes the biggest `<article>` with 3+ paragraphs, else `<main>` (Run Ultra's first `<article>` is a related-post card). Unreadable page: the feed's own `content:encoded` is used.
- **One item = one story** (Stephen): `isRoundUp(title)` in `sort.ts` settles weekly updates/round-ups as not news before any model call; the writer takes only this event's part of a multi-event source; `ruleProblems` flags a story that names its own source ("Run Ultra's update"), and the voice says sources are credited at the end only.
- **Must-cover list**: `src/lib/news/must-cover.json` (61 races, dates to end 2027; 19 estimated, Barkley and Skyline Scotland are windows) + `must-cover.ts`. From 21 days before to 7 after an edition its stories go first, outside the 4-a-day cap, never stale; 1-3 days after the finish with nothing published the run searches and writes it (gap fill). Writer is told to name British runners. Refresh the dates each autumn.
- **Trail beats road/track**: `bundleImportance` takes 2 off road and track unless a title says world record/best; classic-round records (Bob Graham etc.) are in the sorters' 8-9 tier. Sorter calibration not re-run.
- Stories published by hand: Karen Nash (13 Valleys), Bodis Spartathlon record. The mixed round-up story was set to held by Stephen.
- First daily run with all of this: 3 Oct 05:30. Read its report.

**Ask Stephen**
- `/admin/inbox` has an "I'm busy" / "I'm back" toggle (`settings` key `chat_busy`); `GET /api/app/v1/chat/thread` carries `stephenBusy`.

**Fartlex** (daily word game; launched as Word Run, renamed the same day)
- `/games/fartlex` (`/games/word-run` 308s to it), `/api/app/v1/word-run` for the app. Code lives in `src/lib/word-run/` and keeps that name; `GAME_NAME` is the display name.
- 364 answers with facts (`answers.ts`): 104 each of 4/5/6 letters, 52 of 7 = no repeat until Oct 2027, then each list repeats in a seeded shuffle. Add words only at the END of a list, run `scripts/word-run-words.ts`, and copy `public/games/fartlex/words-*.txt` to the iOS app.
- Lengths by weekday: 4 Mon-Tue, 5 Wed-Thu, 6 Fri-Sat, 7 Sun; 4 letters get 7 guesses. Streak in localStorage (`wordrun:v1`, kept through the rename).
- Found via: homepage strip (`FartlexStrip`), For Runners menu, Tools card, sitemap, share card `/games/fartlex/og`. The 7:30 news push adds "Today's Fartlex is ready: N letters."

**Missing pages**
- The root `loading.tsx` streams every page, so a missing story/post/runner/film/product returned 200 with `index, follow`. Their `generateMetadata` now returns `robots: noindex`. A true 404 would mean dropping the loading screen. Unknown routes were already 404.

## Moved from CLAUDE.md on 3 Oct 2026

## Migration — complete

The WordPress migration is done: Railway project and Postgres live, R2 bucket
holding the 2.6GB of images, 212 posts and the race results imported, a Stripe
account configured (nothing in this repo uses it yet), and DNS switched. The site serves from **filmmyrun.com**.

(Superseded since: Stripe is now used by the shop and club, see CLAUDE.md "Tech Stack".)
