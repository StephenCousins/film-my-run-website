# News sorter check

> **Two runs, 26 Sep 2026.** Run 1 (`sorter-check-run1.md`, original prompt): 16 false passes at 0.90 and still 14 at 0.95, so raising the threshold was not the fix. The false passes were BBC video clips, field events (long jump), sales/entries promotion, interviews, analysis columns and a feature. Fix: video/audio/live URLs are settled as media in code without a model call, and the prompt now names interviews, takeaways, recaps, features, entries/sales updates, promotion and live pages as not news, and field events as not running. Run 2 (below): **0 false passes**, 135 of 150 real news items pass (90%); most misses are weekly round-ups, whose events reach us through other sources. Threshold stays 0.90. Also found: Gemini 3.7 Flash always reasons and the reasoning counts against max_tokens, so the sorter's 300-token limit truncated replies; raised to 2000 (grouper to 12000). Labels: 360 items, the whole 60-day feed store, 12 marked unsure (listed at the end).


Date: 2026-09-26
Model: google/gemini-3.7-flash
Threshold: 0.9
Items: 360 (12 unsure, 0 null verdicts)
Total cost: $0.5267

## Confusion at threshold 0.9

| | Predicted news | Predicted not-news |
|---|---|---|
| Labelled news | 135 (true pass) | 15 (missed) |
| Labelled not-news | 0 (**false pass**) | 198 (true reject) |

## False passes (auto-publish risk) — target 0

_None._

## Missed real news

| id | source | title | verdict type | confidence |
|---|---|---|---|---|
| 4261 | Athletics Weekly | Weekly round-up from the UK endurance running world | other | 0.95 |
| 4258 | Canadian Running | Last weekend of summer sees record-shattering performances across the track and road | other | 0.85 |
| 4240 | iRunFar | This Week In Running: September 21, 2026 | other | 0.95 |
| 4220 | Canadian Running | 16 Canadians are headed to Denmark for the World Athletics Road Running Championships | preview | 0.95 |
| 4192 | LetsRun | December’s 2026 Kalakaua Merrie Mile will offer $15,000 1st place purse + $20,000 WR bonus | news | 0.85 |
| 4180 | Athletics Weekly | Great North Run masters action headlines busy road racing weekend | other | 0.90 |
| 4134 | iRunFar | This Week In Running: September 14, 2026 | other | 0.95 |
| 4095 | RunABC South | New Swindon 10K Brings Closed Road Racing To Lydiard Park | other | 0.90 |
| 4086 | Canadian Running | Trail runner beats cyclist in epic mountain climb | news | 0.85 |
| 4065 | Athletics Weekly | Kirsty Longley runs through grief for age-group podium days after sister's sudden death | news | 0.85 |
| 4054 | iRunFar | This Week In Running: September 7, 2026 | other | 0.95 |
| 3994 | Athletics Weekly | Sunshine and record turnout as new Middlesbrough Runs festival gets off the ground | news | 0.85 |
| 3973 | Canadian Running | Sulphur Springs organizers reignite classic Ontario trail race | news | 0.85 |
| 3960 | iRunFar | This Week In Running: August 31, 2026 | other | 0.95 |
| 3935 | RunABC South | Team Marathon Brings A New Social Running Format To London | news | 0.85 |

## Confidence spread (news-typed verdicts, 0.1 buckets)

| bucket | labelled news | labelled not-news | unsure |
|---|---|---|---|
| 0.0-0.1 | 0 | 0 | 0 |
| 0.1-0.2 | 0 | 0 | 0 |
| 0.2-0.3 | 0 | 0 | 0 |
| 0.3-0.4 | 0 | 0 | 0 |
| 0.4-0.5 | 0 | 0 | 0 |
| 0.5-0.6 | 0 | 0 | 0 |
| 0.6-0.7 | 0 | 0 | 0 |
| 0.7-0.8 | 0 | 0 | 0 |
| 0.8-0.9 | 6 | 1 | 2 |
| 0.9-1.0 | 135 | 5 | 3 |

## Confusion at other thresholds

### 0.85

| | Predicted news | Predicted not-news |
|---|---|---|
| Labelled news | 141 (true pass) | 9 (missed) |
| Labelled not-news | 0 (**false pass**) | 198 (true reject) |

### 0.95

| | Predicted news | Predicted not-news |
|---|---|---|
| Labelled news | 129 (true pass) | 21 (missed) |
| Labelled not-news | 0 (**false pass**) | 198 (true reject) |

## Unsure (excluded from the confusion table above)

| id | source | title | note | verdict type | confidence |
|---|---|---|---|---|---|
| 4311 | Canadian Running | Track and field sees record prize purses across a crowded 2028 calendar | prize purse figures announced; partly analysis, track and field | news | 0.95 |
| 4290 | Canadian Running | Hamilton runners and dogs will race for a good cause in November | local charity race listing, unclear if new | preview | 0.90 |
| 4254 | Trail Runner Magazine | “Your Brain Gets Very Fried.” How 6th-Grade Teacher Megan Eckert Shattered the 6-Day World Record | feature profile about a record already reported | other | 0.95 |
| 4169 | iRunFar | 2026 Run Rabbit Run Live Coverage | live coverage page, no story at publish | media | 0.95 |
| 4158 | Canadian Running | Olympians push back against Sydney Sweeney’s controversial Novig ad | reaction to betting ad, not a running event | news | 0.85 |
| 4146 | Athletics Weekly | Sheffield & Dearne and Chelmsford win NAL promotion battle at Horspath | league result; mixed track and field | news | 0.95 |
| 4099 | iRunFar | The End of the Beaverhead 100k | column about race ending; cancellation may be news | opinion | 0.95 |
| 4085 | Trail Runner Magazine | UTMB “Has Become Unbearable” Says Chamonix Mayor | mayor's statement on UTMB; quote story | news | 0.90 |
| 4034 | RunABC Scotland | Great Scottish Run Countdown: Five New Additions For 2026 | countdown promo listing event additions | preview | 0.95 |
| 4002 | Trail Runner Magazine | What Happened to Courtney Dauwalter, Zach Miller, and Other Favorites Who Did Not Finish UTMB? | report on favourites' DNFs; factual but feature-ish | news | 0.85 |
| 3956 | LetsRun | 2026 TCS Sydney Marathon Results, Live Leaderboard, and Tracking | results/live tracking page, likely pre-race | other | 0.95 |
| 3923 | Trail Runner Magazine | 2026 UTMB Mont-Blanc Live Race Updates and Results | live updates page | media | 0.90 |
