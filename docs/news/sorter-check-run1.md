# News sorter check

Date: 2026-09-26
Model: google/gemini-3.7-flash
Threshold: 0.9
Items: 360 (12 unsure, 0 null verdicts)
Total cost: $0.5022

## Confusion at threshold 0.9

| | Predicted news | Predicted not-news |
|---|---|---|
| Labelled news | 146 (true pass) | 4 (missed) |
| Labelled not-news | 16 (**false pass**) | 182 (true reject) |

## False passes (auto-publish risk) — target 0

| id | source | title | verdict type | confidence |
|---|---|---|---|---|
| 4306 | RunABC Scotland | Stirling Half Marathon Reaches 50% Of Capacity In Two Weeks | news | 0.90 |
| 4260 | LetsRun | WTW: Andreas Almgren Makes History at World Half; US Women Stun for Team Silver; Jakob Shocked By Seare in 5K; Athlos Travels to London | news | 0.95 |
| 4229 | BBC Sport | Dramatic sprint finish - Hunter Bell second in Athlos mile | news | 0.95 |
| 4227 | BBC Sport | Hodgkinson dazzles to win Athlos 800m | news | 0.98 |
| 4137 | LetsRun | Melissa Jefferson-Wooden’s Historic 21.47 and 5 More Takeaways From World Ultimates | news | 0.95 |
| 4150 | BBC Sport | 'Superb' Kerr storms to 1500m win | news | 0.99 |
| 4133 | BBC Sport | Werro prevails over rivals in close 800m battle | news | 0.95 |
| 4117 | Athletics Weekly | Jazmin Sawyers caps stunning season with Ultimate silver in Budapest | news | 0.95 |
| 4121 | BBC Sport | Hodgkinson cruises into 800m final | news | 0.95 |
| 4106 | Athletics Weekly | Coe dismisses Grand Slam Track comparisons as he guarantees Ultimate athletes will be paid on time | news | 0.90 |
| 4111 | RunABC Scotland | Stirling Half Marathon 2027 Priority Entries Open | news | 0.95 |
| 4067 | Athletics Weekly | Eilish McColgan: "It was probably the least prepared I'd been for a half marathon" | news | 0.95 |
| 4047 | BBC Sport | Alfred wins 200m as Hunt finishes third in Brussels | news | 0.99 |
| 4004 | Canadian Running | Tara Davis-Woodhall injured in car crash | news | 0.95 |
| 4015 | Athletics Weekly | Tara Davis-Woodhall in doubt for Ultimate Championship after car accident | news | 0.95 |
| 3963 | Trail Runner Magazine | A 45-Year-Old Midwesterner Just Podiumed at UTMB. Why Are Locals Flipping Out? | news | 0.95 |

## Missed real news

| id | source | title | verdict type | confidence |
|---|---|---|---|---|
| 4296 | RunABC Scotland | Coigach Half Marathon Sells Out For 2026 | news | 0.85 |
| 4295 | RunABC South | Bonfire Burn 10K Changes Course For 2026 | news | 0.85 |
| 4283 | RunABC Scotland | Rubicer Fraserburgh Half Marathon Sells Out Again | preview | 0.90 |
| 4220 | Canadian Running | 16 Canadians are headed to Denmark for the World Athletics Road Running Championships | preview | 0.95 |

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
| 0.8-0.9 | 2 | 7 | 1 |
| 0.9-1.0 | 146 | 18 | 7 |

## Confusion at other thresholds

### 0.85

| | Predicted news | Predicted not-news |
|---|---|---|
| Labelled news | 148 (true pass) | 2 (missed) |
| Labelled not-news | 22 (**false pass**) | 176 (true reject) |

### 0.95

| | Predicted news | Predicted not-news |
|---|---|---|
| Labelled news | 142 (true pass) | 8 (missed) |
| Labelled not-news | 14 (**false pass**) | 184 (true reject) |

## Unsure (excluded from the confusion table above)

| id | source | title | note | verdict type | confidence |
|---|---|---|---|---|---|
| 4311 | Canadian Running | Track and field sees record prize purses across a crowded 2028 calendar | prize purse figures announced; partly analysis, track and field | news | 0.95 |
| 4290 | Canadian Running | Hamilton runners and dogs will race for a good cause in November | local charity race listing, unclear if new | preview | 0.85 |
| 4254 | Trail Runner Magazine | “Your Brain Gets Very Fried.” How 6th-Grade Teacher Megan Eckert Shattered the 6-Day World Record | feature profile about a record already reported | news | 0.90 |
| 4169 | iRunFar | 2026 Run Rabbit Run Live Coverage | live coverage page, no story at publish | preview | 0.95 |
| 4158 | Canadian Running | Olympians push back against Sydney Sweeney’s controversial Novig ad | reaction to betting ad, not a running event | news | 0.85 |
| 4146 | Athletics Weekly | Sheffield & Dearne and Chelmsford win NAL promotion battle at Horspath | league result; mixed track and field | news | 0.95 |
| 4099 | iRunFar | The End of the Beaverhead 100k | column about race ending; cancellation may be news | opinion | 0.95 |
| 4085 | Trail Runner Magazine | UTMB “Has Become Unbearable” Says Chamonix Mayor | mayor's statement on UTMB; quote story | news | 0.95 |
| 4034 | RunABC Scotland | Great Scottish Run Countdown: Five New Additions For 2026 | countdown promo listing event additions | preview | 0.95 |
| 4002 | Trail Runner Magazine | What Happened to Courtney Dauwalter, Zach Miller, and Other Favorites Who Did Not Finish UTMB? | report on favourites' DNFs; factual but feature-ish | news | 0.95 |
| 3956 | LetsRun | 2026 TCS Sydney Marathon Results, Live Leaderboard, and Tracking | results/live tracking page, likely pre-race | news | 0.95 |
| 3923 | Trail Runner Magazine | 2026 UTMB Mont-Blanc Live Race Updates and Results | live updates page | news | 0.95 |
