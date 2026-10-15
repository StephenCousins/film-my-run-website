# Documentary film stats: live from YouTube

Moved from CLAUDE.md on 15 Oct 2026.

The view counts on `/services/documentary-films` are fetched from the YouTube
Data API rather than hand-maintained. They had drifted badly when they were
hardcoded: the UTMB film read 21K+ against an actual 48.8K, Making Marks 7K+
against 28.4K.

## How it works
`src/lib/youtube-stats.ts` owns it:

| Export | Does |
|---|---|
| `getVideoViewCounts(ids)` | View counts keyed by YouTube ID |
| `getChannelStats()` | Subscriber and lifetime-view totals |
| `formatCount(n)` | `48827` → `48K+`, `1573` → `1.5K+`, `8022632` → `8M+` |
| `selectStaleIds(...)` | Which IDs are missing or older than `STATS_MAX_AGE_MS` |

Counts are cached in `youtube_video_stats` (keyed by `youtube_id`) and
`youtube_channel_stats` (keyed by `channel_id`). Any row older than **7 days**
is refetched on the next request, all stale IDs in one batched `videos.list`
call. That costs **one quota unit** against a daily 10,000, so the cache is
about page speed, not rationing quota.

The cache is keyed by YouTube ID rather than hung off the `films` table because
**only 2 of the 8 showcased films have `films` rows**: 81 Yards, Sub 40 and the
rest exist only as hardcoded entries in `films.ts`.

## Page structure
- `films.ts`: plain film data (titles, descriptions, awards, `fallbackViews`)
- `page.tsx`: server component, fetches stats, wrapped in `unstable_cache`
- `DocumentaryFilmsClient.tsx`: all the JSX

## Things that will bite you
- **`formatCount` always rounds down.** A page that overstates a film's reach to
  a prospective sponsor is worse than one that understates it.
- **The page must stay `force-dynamic`** (see the build-container gotcha in CLAUDE.md).
- **Watch time is not available here.** It needs the YouTube *Analytics* API and
  OAuth, not the public Data API. Those figures stay hand-maintained in
  `films.ts`. The `~/Developer/youtube-analytics` CLI already has that auth if
  it is ever worth wiring up.
- **`YOUTUBE_API_KEY` is server-side** and set in Railway. Without it the page
  serves the cache, then the `films.ts` fallbacks: it never breaks, it just
  stops refreshing. Everything here fails soft the same way: a YouTube outage
  serves stale numbers rather than an error.
- **The main channel is `UCjphxoB7x0A_VhB1CUz3AwA`.** The ID hardcoded in
  `src/app/live/page.tsx` is a *different* channel ("Virtual FMR", ~2K subs).
  That page also ships the API key to the browser, and the key has no referrer
  restriction.
