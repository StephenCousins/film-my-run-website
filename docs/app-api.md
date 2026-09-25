# App API (`/api/app/v1/`)

Routes the Film My Run iPhone app calls. Added 11 September 2026 (milestone M5-W of the app spec). They are **aliases**: each one imports the existing route's handler and adds per-IP rate limiting and `Cache-Control`. The existing routes are untouched, so the website's own tools work exactly as before. Do not change a v1 response shape; add `/v2/` instead.

| Method | Path | Same handler as | Limit / min | Cache |
|---|---|---|---|---|
| GET | `/api/app/v1/how-fast/parkrun?id=` | `/api/how-fast/parkrun` | 30 | none |
| POST | `/api/app/v1/how-fast/parkrun/refresh` `{ id }` | `/api/how-fast/parkrun/refresh` | 6 | none |
| GET | `/api/app/v1/how-fast/po10?id=` | `/api/how-fast/po10` | 30 | none |
| POST | `/api/app/v1/how-fast/po10/refresh` `{ id }` | `/api/how-fast/po10/refresh` | 6 | none |
| GET | `/api/app/v1/shoes?terrain=&category=&brand=&sort=&minDrop=&maxDrop=&search=` | `/api/shoes?withReviews=1` | 60 | 1 h |
| GET | `/api/app/v1/partner-offers` | new | 60 | 1 h |
| GET | `/api/app/v1/latest-video` | new | 60 | 1 h |
| GET | `/api/app/v1/chat/thread` | new | 30 | none |
| POST | `/api/app/v1/chat/messages` `{ name, email, text }` | new | 6 | none |
| POST | `/api/app/v1/auth/code` `{ email }` | new | 20 | none |
| POST | `/api/app/v1/auth/verify` `{ email, code }` | new | 30 | none |
| POST | `/api/app/v1/auth/apple` `{ identityToken, name? }` | new | 30 | optional bearer (links Apple to that member) |
| GET | `/api/app/v1/auth/me` | new | 60 | none |
| POST | `/api/app/v1/auth/signout` | new | 60 | none |
| GET | `/api/app/v1/orders` | new | 60 | none |
| GET | `/api/app/v1/orders/{id}` | new | 60 | none |

Over the limit: `429` with `Retry-After` seconds and `{ ok: false, error: "Too many requests" }`. Every response carries `X-FMR-API: v1`. The limiter is in-memory per instance (`src/lib/app-api/rate-limit.ts`), like `/api/track`.

## Response shapes

**how-fast/parkrun** — `{ ok, cached, needsRefresh, athlete: { name, athleteId, totalRuns, stats: { bestSeconds, bestTime, averageTime, typicalAvgTime, recentAvgTime, pbEvent, pbDate, pbAge, trend, trendMessage, avgAgeGrade, recentAvgAgeGrade, outlierCount, normalRunCount } | null, recentResults[], allResults[] }, comparison: { percentile, abilityLevel, ratingMessage, timeSeconds, timeStr, parkrunComparisons, distanceComparison } | null }`. Results: `{ event, runDate, runNumber, position, time, time_seconds, ageGrade, pb }`. Errors: `400` bad id, `404` no results, `500` scrape failed.

**how-fast/po10** — `{ ok, cached, needsRefresh, athlete: { name, athleteId, club, ageGroup, gender, pbs: { [distance]: { time, seconds, timeFormatted } } }, stats: { distances: [{ distance, distanceName, time, seconds, percentile, abilityLevel }], … } }`.

**shoes** — see `docs/shoe-finder.md` for the discovery/publish/image pipeline behind this catalogue. `{ shoes: [{ id, brand, model, slug, terrain, category, dropMm, weightG, stackHeightMm, priceGbp, releaseYear, description, imageUrl, buyUrl, avgScore, reviewCount, userAvgScore, userRatingCount, lastReviewed, supersededBySlug, reviews: [{ source, sourceUrl, expertScore, userScore, userCount, summary }] }], meta: { brands[], categories[], total, labels: { categories, sources, terrains } } }`. The alias always calls the site route with `withReviews=1` and `includeSuperseded=1`, so `reviews` is present and superseded shoes (an older version whose successor has published; `supersededBySlug` names the successor) stay in the list — the app has no query for them and a runner still wearing the old version must still find it. `myRating` was removed on 13 September 2026 (it was always `null` for the app, which sends no session). The public `/api/shoes` omits `reviews` unless asked and hides superseded shoes unless `includeSuperseded=1`; per-shoe reviews are also at `/api/shoes/[slug]`, and a signed-in user's own ratings at `/api/shoes/my-ratings` (`{ ratings: { [shoeId]: number } }`).

**partner-offers** — `{ offers: [{ id, partner, title, body, url, logoUrl, startsAt, endsAt }] }`, filtered to today's date. Edit `content/app/partner-offers.json` and push.

**latest-video** — `{ video: { id, title, publishedAt, thumbnailUrl, url } }` from the channel's public Atom feed (no API key). `503` if the feed is down.

**chat/thread** — "Ask Stephen" (see `docs/superpowers/specs/2026-09-16-pro-page-chat-design.md` §3 in the app repository). Requires `X-FMR-Install: <uuid>`; no Pro proof needed — a lapsed subscriber can still read what Stephen wrote. `{ ok: true, thread: { id, messages: [{ id, from: "user" | "stephen", text, createdAt }] } | null }`, `null` when the install has no thread yet. `400 { ok: false, error }` when the install header is missing or not a UUID.

**chat/messages** (POST `{ name, email, text }`) — requires `X-FMR-Install` and `X-FMR-Pro: <JWS>` (the StoreKit transaction's `jwsRepresentation`; the server decodes the payload without verifying Apple's signature in v1 — see the design doc for the known gap and the planned follow-up). A Debug build sends `X-FMR-Pro: debug-<installID>`, accepted only when that install id is in the server's `CHAT_DEBUG_INSTALL_IDS` (comma-separated, compared case-insensitively) — how Stephen's own phone is Pro before the App Store products exist. `{ ok: true, message: { id, from, text, createdAt } }`. `403 { ok: false, error: "Pro required" }` when the Pro header fails. `400 { ok: false, error }` when `text` (1–2000 chars, trimmed), `name` (1–80) or `email` fails validation. `429 { ok: false, error: "That's five today, Stephen will get back to you." }` after 5 user messages to the same install in one UTC day (checked against the database, independent of the per-IP limit above). Side effect: emails `CHAT_ADMIN_EMAIL` via Resend with the message and a link to the admin inbox thread (reply-to is the runner's address); a send failure is logged, not returned to the caller.

## Members

Email-code sign-in, no password. Every route but `auth/code` and `auth/verify` needs `Authorization: Bearer <token>` (the token from `auth/verify`); a missing or dead token answers `401 { ok: false, error: "signed_out" }`.

- **`POST /api/app/v1/auth/code` `{ email }`** — always `{ ok: true }` for a well-formed email (no account enumeration). Errors: `400 { ok: false, error: "bad_email" }`, `429 { ok: false, error: "too_many_codes" }` (five an hour per email, `Retry-After` seconds), `503 { ok: false, error: "email_unavailable" }` if Resend fails.
- **`POST /api/app/v1/auth/verify` `{ email, code }`** — `{ ok: true, token, member: { id, email, name } }`. Errors: `400 { ok: false, error: "bad_request" }` for a malformed body, `401 { ok: false, error: "wrong_code" }`, `410 { ok: false, error: "expired" }` (no code sent, code past its 10 minutes, or five wrong attempts).
- **`POST /api/app/v1/auth/apple` `{ identityToken, name? }`** (23 Sep 2026): Sign in with Apple from the app. The identity token is checked against Apple's keys for audience `com.filmmyrun.app`. The member is, in order: the account the Apple id is linked to (`accounts`, provider `apple`); the member signed in with the request's bearer; the account with the email Apple shares; or a new account on that email. Answers like `auth/verify`: `{ ok: true, token, member }`. Errors: `400 bad_request`, `401 apple_rejected`, `503 apple_unavailable`.
- **`POST /api/app/v1/auth/delete`** (bearer; 23 Sep 2026): deletes the account (App Store guideline 5.1.1(v)). A live website FMR Club subscription on Stripe is cancelled first. Orders are kept, with their account link removed. Sessions, Apple links, saved routes and shoe ratings go with the account. `{ ok: true }`; `401 signed_out`; `500 delete_failed`.
- **`GET /api/app/v1/auth/me`** — `{ ok: true, member: { id, email, name, proUntil } }` or `401 signed_out`. `proUntil` is an ISO date while the account is Pro (`users.access_tier = PRO` and `subscription_end` ahead, or no end for a hand-set account), else null.
- **`POST /api/app/v1/auth/pro`** — bearer + `X-FMR-Install` + `X-FMR-Pro` (the chat's proof). Stamps the account `access_tier = PRO`, `subscription_end = expiresDate` (never shortening a later date), so a Pro subscriber is Pro on the website and on every device signed into the account. `{ ok: true, member }`; `401 signed_out`, `400 bad_install`, `403 Pro required`. The app posts it after sign-in and whenever its StoreKit state refreshes.
- **`POST /api/app/v1/auth/signout`** — `{ ok: true }`, deletes only the session behind the bearer token.
- **`GET /api/app/v1/orders`** — `{ ok: true, orders: [{ id, placedAt, status: "paid" | "submitted" | "shipped", items: [{ slug, name, variant, quantity, pricePence, imageUrl }], totalPence, currency, trackingUrl }] }`, newest first. A `pending` order (payment not yet confirmed) never appears.
- **`GET /api/app/v1/orders/{id}`** — `{ ok: true, order: <same shape> }`. `400 { ok: false, error: "bad_id" }` for a non-numeric id; `404 { ok: false, error: "not_found" }` for someone else's order — deliberately 404, not 403, so a guess reveals nothing about whether the order exists.

`POST /api/shop/checkout` (website only, not app-api) now returns `{ url, member, reason? }`: `member: true` when the 10% discount (`STRIPE_MEMBER_COUPON`, alongside the other Stripe env vars) was applied at Stripe, for a signed-in member or for a valid `X-FMR-Pro` + `X-FMR-Install` proof from a subscriber who has not signed in; `club: true` alongside it when the account is a Club subscriber (15% via `STRIPE_CLUB_COUPON`, falling back to the member coupon when that is not set); `member: false` with `reason: "signed_out"` if a bearer token was sent but is dead, or `reason: "no_coupon"` if `STRIPE_MEMBER_COUPON` isn't set; no `reason` for a guest, who was never offered a discount to lose.

Sample responses are saved in the app repository under `Packages/FMRData/Tests/FMRDataTests/Fixtures/api/`.

## Races (race-day pacing, 25 Sep 2026)

One race database for Film My Run and Crew Notes: the Crew Notes race library,
read server to server (`/v1/partner` on the Crew Notes API, header
`X-Service-Key` = `CREWNOTES_PARTNER_KEY` here, `PARTNER_API_KEY` there) and
cached here for a day. Logic in `src/lib/races/handlers.ts`.

- `GET /api/app/v1/races` → `{ ok, races: [{ slug, name, courseName, country, distanceKm, elevationGainM, checkpointCount, verified }] }`.
  Anyone. Races with fewer than two checkpoints are left out.
- `GET /api/app/v1/races?slug=utmb-occ` → `{ ok, course: { …summary, provenance, hasProfile, checkpoints: [{ name, distanceFromStartKm, elevationM, climbFromPrevM, cutoffElapsedMin }] } }`.
  FMR Club (X-FMR-Pro proof or a bearer for an FMR Club account), else 403.
  `climbFromPrevM` is the GPX climb on the leg into that checkpoint; null when
  the race has no track. `cutoffElapsedMin` is minutes from the gun.
- Crew Notes unreachable and nothing cached: 503.

