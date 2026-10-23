# Handover history

Dated status entries moved out of CLAUDE.md. Newest first.

## 23 Oct 2026: site stats page; assistant reply fix

- **/admin/stats** (885343f): traffic, most-read posts and news, tools and games, newsletter by source, accounts,
  paying members, shop, iPhone app, referrers, outbound clicks. Queries in `src/lib/admin-stats.ts`. New
  `site_events` table (migration 20261023120000): tool uses via `track()` in `src/lib/track.ts` and the
  `useRequireAuth({ tool })` option (sign-in walls counted separately), outbound clicks from `Analytics.tsx`, app API
  calls from `withAppApi`. Those three only count from 23 Oct. Not yet seen signed in.
- **Assistant** (2aa08c1): low reasoning effort and 1,500 reply tokens. At 600, Haiku 5.5 could spend the whole
  budget thinking and return nothing, which showed visitors "not available" (found on zwift.run's copy).
- Uncommitted shoe-finder work from another session was left alone.

## 22 Oct 2026: site chat assistant, POV page made honest

**Site assistant** (`docs/assistant.md`; commits `97fd8f9` to `db929d9`)
- Chat bubble answering visitors about Stephen and the site. Claude Haiku 5.5 via OpenRouter (`ASSISTANT_MODEL`), the
  whole knowledge pack as a cached system prompt, no retrieval. Rules in `src/lib/assistant/chat.ts`: third person,
  answer only from the pack, say "don't know" + /contact, treadmill/Zwift/NoblePro to zwift.run, no medical advice, no
  personal details beyond facts.md, stay on topic, light running humour in small talk only, no em dashes.
- Pack: `content/assistant/pack.md` from `npm run assistant:pack` (facts.md + every sitemap page + the YouTube channel's
  25 most-viewed videos with real counts; needs `YOUTUBE_API_KEY` in .env). ~75k tokens as Claude counts them.
  `content/assistant/facts.md` is Stephen's and wins over everything; he confirmed family, Worthing, degree, John
  Kettley / A Tribe of Toffs, Ruth / The 45s, Arc of Attrition presenting.
- Measured cost: ~0.75p for a conversation's first message (cache write), ~0.07p each after; caching confirmed in the
  Railway log line `assistant: $..., N/M prompt tokens cached`. Limits: 15 msgs/10 min and 60/day per IP (in memory),
  `ASSISTANT_DAILY_USD` cap (default $1).
- Log: `assistant_messages` table (migration `20261022150000`), read at `/admin/assistant` (CHAT_ADMIN_EMAIL gate,
  also in middleware). Test conversations are under session `claude-test-22oct`.
- "Can I help?" nudge: page-aware line beside the bubble after 25 s, or half-way down a page after 8 s; hides after
  15 s; once per 7 days per browser; never on contact/account/admin/checkout/login/games. `?assistant=1` resets it.
- Tested live: 14 questions plus off-topic (football), unknown (pizza, Lakeland shoes), small talk; all handled. One
  small-talk joke ("my legs do all the hard work") didn't quite land; offered Stephen example jokes in his style.
- **State:** `ASSISTANT_ENABLED=true` on Railway; `ASSISTANT_PUBLIC` not set, so only browsers that opened a page with
  `?assistant=1` see it. Stephen turns it on for everyone when happy.
- **Open:** Stephen's PBs for facts.md (it currently infers the marathon PB from a blog post); "unanswered" filter and
  weekly email of unanswered questions offered, not built; app version planned after 1.0 (filmmyrun-ios
  `docs/superpowers/specs/2026-10-22-site-assistant-in-app-design.md`).

**POV Race Coverage page** (`c87d2a9`)
- Every race card named a different race from the video it played ("UTMB 171km, 850K+" played CCC 2018, 317K) and the
  view counts were invented. Cards now describe their own videos (`src/app/services/pov-race-coverage/races.ts`), with
  live counts and the channel total via `youtube-stats.ts`, like the documentary page. No count shown rather than a
  made-up one if YouTube is down. Distances left blank for UTMB, TDS and Ben Nevis Ultra until Stephen gives them.
- "200+ races filmed", "15 years", "12 countries" are unverified and unchanged. Other service pages may carry invented
  figures the same way; not checked.

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

(Superseded since: Stripe is now used by the shop and club, see docs/architecture.md "Tech Stack".)
