# News sorter check

Date: 2026-09-27
Model: google/gemini-3.7-flash
Threshold: 0.9
Items: 341 (12 unsure, 0 null verdicts)
Total cost: $0.6166

## Confusion at threshold 0.9

| | Predicted news | Predicted not-news |
|---|---|---|
| Labelled news | 119 (true pass) | 16 (missed) |
| Labelled not-news | 0 (**false pass**) | 194 (true reject) |

## False passes (auto-publish risk) — target 0

_None._

## Missed real news

| id | source | title | verdict type | confidence |
|---|---|---|---|---|
| 4309 | Trail Runner Magazine | Wake Up! Team USA Just Won 3 World Titles | opinion | 0.85 |
| 4261 | Athletics Weekly | Weekly round-up from the UK endurance running world | other | 0.95 |
| 4258 | Canadian Running | Last weekend of summer sees record-shattering performances across the track and road | other | 0.90 |
| 4240 | iRunFar | This Week In Running: September 21, 2026 | other | 0.95 |
| 4220 | Canadian Running | 16 Canadians are headed to Denmark for the World Athletics Road Running Championships | preview | 0.95 |
| 4192 | LetsRun | December’s 2026 Kalakaua Merrie Mile will offer $15,000 1st place purse + $20,000 WR bonus | news | 0.85 |
| 4180 | Athletics Weekly | Great North Run masters action headlines busy road racing weekend | other | 0.90 |
| 4134 | iRunFar | This Week In Running: September 14, 2026 | other | 0.95 |
| 4095 | RunABC South | New Swindon 10K Brings Closed Road Racing To Lydiard Park | other | 0.85 |
| 4086 | Canadian Running | Trail runner beats cyclist in epic mountain climb | news | 0.85 |
| 4065 | Athletics Weekly | Kirsty Longley runs through grief for age-group podium days after sister's sudden death | other | 0.85 |
| 4054 | iRunFar | This Week In Running: September 7, 2026 | other | 0.95 |
| 4028 | LetsRun | Why Italian distance star Nadia Battocletti is skipping Diamond League final & World Ultimate Championships | news | 0.85 |
| 4024 | Canadian Running | Canadian NCAA standout signs NIL deal with Hoka | news | 0.85 |
| 4029 | LetsRun | Update: Emmanuel Kiprono has a professional deal with adidas | news | 0.85 |
| 3960 | iRunFar | This Week In Running: August 31, 2026 | other | 0.95 |

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
| 0.8-0.9 | 5 | 3 | 1 |
| 0.9-1.0 | 119 | 5 | 2 |

## Confusion at other thresholds

### 0.85

| | Predicted news | Predicted not-news |
|---|---|---|
| Labelled news | 124 (true pass) | 11 (missed) |
| Labelled not-news | 2 (**false pass**) | 192 (true reject) |

### 0.95

| | Predicted news | Predicted not-news |
|---|---|---|
| Labelled news | 116 (true pass) | 19 (missed) |
| Labelled not-news | 0 (**false pass**) | 194 (true reject) |

## Unsure (excluded from the confusion table above)

| id | source | title | note | verdict type | confidence |
|---|---|---|---|---|---|
| 4311 | Canadian Running | Track and field sees record prize purses across a crowded 2028 calendar | prize purse figures announced; partly analysis, track and field | news | 0.95 |
| 4290 | Canadian Running | Hamilton runners and dogs will race for a good cause in November | local charity race listing, unclear if new | preview | 0.85 |
| 4254 | Trail Runner Magazine | “Your Brain Gets Very Fried.” How 6th-Grade Teacher Megan Eckert Shattered the 6-Day World Record | feature profile about a record already reported | other | 0.95 |
| 4169 | iRunFar | 2026 Run Rabbit Run Live Coverage | live coverage page, no story at publish | media | 0.95 |
| 4158 | Canadian Running | Olympians push back against Sydney Sweeney’s controversial Novig ad | reaction to betting ad, not a running event | news | 0.85 |
| 4146 | Athletics Weekly | Sheffield & Dearne and Chelmsford win NAL promotion battle at Horspath | league result; mixed track and field | news | 0.95 |
| 4099 | iRunFar | The End of the Beaverhead 100k | column about race ending; cancellation may be news | opinion | 0.95 |
| 4085 | Trail Runner Magazine | UTMB “Has Become Unbearable” Says Chamonix Mayor | mayor's statement on UTMB; quote story | other | 0.92 |
| 4034 | RunABC Scotland | Great Scottish Run Countdown: Five New Additions For 2026 | countdown promo listing event additions | preview | 0.95 |
| 4002 | Trail Runner Magazine | What Happened to Courtney Dauwalter, Zach Miller, and Other Favorites Who Did Not Finish UTMB? | report on favourites' DNFs; factual but feature-ish | other | 0.90 |
| 3956 | LetsRun | 2026 TCS Sydney Marathon Results, Live Leaderboard, and Tracking | results/live tracking page, likely pre-race | other | 0.95 |
| 3923 | Trail Runner Magazine | 2026 UTMB Mont-Blanc Live Race Updates and Results | live updates page | other | 0.85 |
