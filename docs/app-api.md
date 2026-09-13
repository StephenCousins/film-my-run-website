# App API (`/api/app/v1/`)

Routes the Film My Run iPhone app calls. Added 11 September 2026 (milestone M5-W of the app spec). They are **aliases**: each one imports the existing route's handler and adds per-IP rate limiting and `Cache-Control`. The existing routes are untouched, so the website's own tools work exactly as before. Do not change a v1 response shape; add `/v2/` instead.

| Method | Path | Same handler as | Limit / min | Cache |
|---|---|---|---|---|
| GET | `/api/app/v1/how-fast/parkrun?id=` | `/api/how-fast/parkrun` | 30 | none |
| POST | `/api/app/v1/how-fast/parkrun/refresh` `{ id }` | `/api/how-fast/parkrun/refresh` | 6 | none |
| GET | `/api/app/v1/how-fast/po10?id=` | `/api/how-fast/po10` | 30 | none |
| POST | `/api/app/v1/how-fast/po10/refresh` `{ id }` | `/api/how-fast/po10/refresh` | 6 | none |
| GET | `/api/app/v1/shoes?terrain=&category=&brand=&sort=&minDrop=&maxDrop=&search=` | `/api/shoes` | 60 | 1 h |
| GET | `/api/app/v1/partner-offers` | new | 60 | 1 h |
| GET | `/api/app/v1/latest-video` | new | 60 | 1 h |

Over the limit: `429` with `Retry-After` seconds and `{ ok: false, error: "Too many requests" }`. Every response carries `X-FMR-API: v1`. The limiter is in-memory per instance (`src/lib/app-api/rate-limit.ts`), like `/api/track`.

## Response shapes

**how-fast/parkrun** — `{ ok, cached, needsRefresh, athlete: { name, athleteId, totalRuns, stats: { bestSeconds, bestTime, averageTime, typicalAvgTime, recentAvgTime, pbEvent, pbDate, pbAge, trend, trendMessage, avgAgeGrade, recentAvgAgeGrade, outlierCount, normalRunCount } | null, recentResults[], allResults[] }, comparison: { percentile, abilityLevel, ratingMessage, timeSeconds, timeStr, parkrunComparisons, distanceComparison } | null }`. Results: `{ event, runDate, runNumber, position, time, time_seconds, ageGrade, pb }`. Errors: `400` bad id, `404` no results, `500` scrape failed.

**how-fast/po10** — `{ ok, cached, needsRefresh, athlete: { name, athleteId, club, ageGroup, gender, pbs: { [distance]: { time, seconds, timeFormatted } } }, stats: { distances: [{ distance, distanceName, time, seconds, percentile, abilityLevel }], … } }`.

**shoes** — `{ shoes: [{ id, brand, model, slug, terrain, category, dropMm, weightG, stackHeightMm, priceGbp, releaseYear, description, imageUrl, buyUrl, avgScore, reviewCount, userAvgScore, userRatingCount, lastReviewed, supersededBySlug }], meta: { brands[], categories[], total, labels: { categories, sources, terrains } } }`. Catalogue only: since 13 September 2026 the list carries no `reviews` or `myRating`. Per-shoe reviews are at `/api/shoes/[slug]` (same shoe fields plus `reviews: [{ source, sourceUrl, expertScore, userScore, userCount, summary }]`); the signed-in user's own ratings at `/api/shoes/my-ratings` (`{ ratings: { [shoeId]: number } }`, session required). Superseded shoes are hidden unless `includeSuperseded=1`.

**partner-offers** — `{ offers: [{ id, partner, title, body, url, logoUrl, startsAt, endsAt }] }`, filtered to today's date. Edit `content/app/partner-offers.json` and push.

**latest-video** — `{ video: { id, title, publishedAt, thumbnailUrl, url } }` from the channel's public Atom feed (no API key). `503` if the feed is down.

Sample responses are saved in the app repository under `Packages/FMRData/Tests/FMRDataTests/Fixtures/api/`.
