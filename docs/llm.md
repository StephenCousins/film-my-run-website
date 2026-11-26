# LLM calls

Moved from CLAUDE.md on 15 Oct 2026.

Since 19 Nov 2026 every LLM call tries **Claude first** and keeps
**OpenRouter as the backup** (Stephen's decision). `src/lib/llm.ts` exposes
`completeText()` and `completeTextWithImage()` for the web app, `completeJson()`
and `completeJsonClaudeFirst()` for the news pipeline, and `searchWeb()`.
`OPENROUTER_MODEL` optionally overrides the default OpenRouter model.

## Who answers each job, in order

| Job | 1st | 2nd | 3rd |
|---|---|---|---|
| Web app (`completeText`, `completeTextWithImage`: Shoe Finder, runner photo checks, RaceScript) | Claude API key: Opus 5.5 for `WRITING_MODEL`, Sonnet 5.5 for `JUDGE_MODEL`, Haiku 5.5 otherwise | OpenRouter, on the model the call names | |
| News sort (`sortItem`) | Claude API key, Sonnet 5.5 (low effort) | Claude Code `claude -p --model sonnet` | OpenRouter, `SORT_MODEL` (Gemini 3.7 Flash) |
| News group (`groupItems`) | Claude API key, Opus 5.5 | Claude Code `claude -p --model opus` | OpenRouter, `GROUP_MODEL` (Gemini 3.7 Flash) |
| News writing and fact-check, runner bios (`completeJson` on `WRITE_MODEL`/`CHECK_MODEL`) | Claude Code `claude -p --model opus` (free on the subscription) | Claude API key, Opus 5.5 | OpenRouter, `anthropic/claude-opus-5.5` |
| Social post copy (`writeSocialCopy`, `src/lib/social/copy.ts`, docs/social-posts.md) | Claude API key, Opus 5.5 | Claude Code `claude -p --model opus` | OpenRouter, `WRITE_MODEL` |
| Extra-coverage search (`searchWeb`, `moreCoverage`) | Claude API key, Haiku 5.5 with Anthropic's `web_search` tool | OpenRouter web plugin on `SORT_MODEL` | none: the story goes ahead on its own sources |

- **"Not set" includes empty.** GitHub passes a missing secret as an empty
  string, so a missing, empty or blank `ANTHROPIC_CREDIT_API_KEY` counts as no
  key (`claudeApiKey()`): that route is skipped with one log line per stage per
  run, e.g. `sort: Claude API key not set (ANTHROPIC_CREDIT_API_KEY), skipping
  to Claude Code CLI`. The same goes for an empty `CLAUDE_CODE_OAUTH_TOKEN`.
- **A Claude reply that isn't JSON** falls through to the next route.
  OpenRouter, as the last route, returns data null as it always has.
- **The news workflow** (`.github/workflows/news-daily.yml`) passes
  `ANTHROPIC_CREDIT_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` and `OPENROUTER_API_KEY`.
  Until the `ANTHROPIC_CREDIT_API_KEY` secret is added to the repo, sort, group
  and search start at their second route.
- **Jev is out of the daily run** (19 Nov 2026): it is OpenRouter-only.
  `sortItemJev` is kept for `scripts/news-sorter-check.ts --jev`.
- **Suggest-a-Shoe** (`/api/shoes/add`) runs when either the Claude key or
  `OPENROUTER_API_KEY` is set (`llmConfigured()`), and refuses only with neither.

## Spend: the £15 ceiling (OpenRouter) and the $100 Claude credit

Stephen, 19 Nov 2026: "I get a $100 free monthly spend on my Claude API key as
part of my Claude Subscription. We can use all of that before the fallback to
OpenRouter." So there are two separate monthly limits:

| Route | What it costs | Recorded in | Limit |
|---|---|---|---|
| OpenRouter | the real cost it reports (`usage.cost`) | `news_runs.cost_usd` (`RunLog.costUsd`) | **£15 ceiling** (`NEWS_CONFIG.monthlyCeilingGbp`, was £10) |
| Claude API key (`ANTHROPIC_CREDIT_API_KEY`) | worked out from `message.usage` (`src/lib/llm-prices.ts`) | `news_runs.claude_cost_usd` (`RunLog.claudeCostUsd`) | **$100 a month** (`NEWS_CONFIG.claudeCreditMonthlyUsd`) |
| Claude Code on the subscription | $0 | | the subscription's usage limit |

- **The £15 ceiling counts OpenRouter only.** Everything that budgets from it
  (`withinCeiling` / `STORY_ESTIMATE_USD` before each story, the runner-page
  budget in `run.ts`, the monthly bio refresh in `src/lib/runners/monthly.ts`)
  reads `cost_usd`, which no longer includes any Claude spend. With Claude
  doing nearly everything, those budgets rarely bind; the per-run caps and
  time limits do.
- **The Claude key's spend** is added up in `src/lib/llm.ts`
  (`claudeCreditSpentThisRun()`), not passed back through each call: every key
  call's `costUsd` is 0. `runNews()` copies it into `log.claudeCostUsd`, also
  when the run fails, and the scripts save it in `claude_cost_usd`
  (`newsRunRow()`; the monthly refresh row too). Prices (19 Nov 2026, $/MTok
  in/out): Haiku 5.5 0.10/0.50, Sonnet 5.5 2/10, Opus 5.5 4/20; cache writes and
  reads at the input price; web searches $10 per 1,000; an unknown model priced
  as Opus. A key reply that wasn't JSON, or a search that got only error
  results, was still billed and still counts.
- **The $100 budget.** At the start of a run (and of the monthly refresh) the
  month to date is the sum of `claude_cost_usd` since the 1st, UTC
  (`claudeMonthSpentUsd()`), handed to `setClaudeCreditBudget()`. When that plus
  this run's spend reaches $100, the key is skipped for the rest of the run, with
  one log line (`Claude API key switched off for the rest of this run (monthly
  Claude credit budget reached: $100.40 of $100), using the next route`), and
  each job goes to its next route (Claude Code, then OpenRouter). If the month to
  date can't be read the run goes on without the check.
- **The website shares the credit**, and the news run can't see what Railway
  spends (shoe checks, the assistant, Ask Wilson). So Anthropic's own answer
  counts too: a billing or credit-exhausted error (a 400 "credit balance is too
  low", 402, "billing", "usage limit") or a bad key (401/403) switches the key off
  for the rest of the run at once; a rate limit or overload (429, 529) falls
  through for that call only, and three in a row switch it off. A success resets
  the count. `resetOpenRouterHealth()` at the start of every run turns it back on
  and zeroes the run's spend. The web server never resets, so there a switched-off
  key comes back after an hour (`CLAUDE_KEY_OFF_MS`). The web app sets no
  budget, so only Anthropic's errors stop it using the key. Keys are never logged.
- **Reports.** The run email says `OpenRouter (paid, counts towards the £15 monthly
  ceiling): $X.` and `Claude API credit used this run: $Y (month so far $Z of
  $100).`; the weekly email totals both.

A rough guess, not measured: a sort call on the key is ~2k tokens in and a few
hundred out on Sonnet, about $0.005-0.01 an item.

## Notes from before 19 Nov 2026

Until 19 Nov 2026 OpenRouter came first for most jobs, with these exceptions:

- **News writing and checking** (every `completeJson` call on `WRITE_MODEL` or
  `CHECK_MODEL`, so also the runner bios) is tried through Claude Code headless
  (`claude -p --model opus`) on the owner's subscription, when
  `CLAUDE_CODE_OAUTH_TOKEN` is set (a GitHub secret, made with
  `claude setup-token`). If the CLI is missing, fails, times out, hits a usage
  limit or returns something that isn't JSON, the call falls back to
  OpenRouter. A call served by the subscription counts as $0 against the news
  ceiling. See `completeJsonViaClaude()` in `src/lib/llm.ts`. If that fails,
  the same call tries the Anthropic credit (below) on Opus 5.5 before OpenRouter.
- **Anthropic credit (from 10 Nov 2026).** When `ANTHROPIC_CREDIT_API_KEY` is
  set, `completeText` / `completeTextWithImage` calls go to Claude directly
  first, on the monthly API credit included with Stephen's Max plan
  ($100/month, expires unused): `WRITING_MODEL` on Opus 5.5, `JUDGE_MODEL`
  (Shoe Finder review checks and image verification) on Sonnet 5.5, everything
  else on Haiku 5.5. The site assistant and Ask Wilson use Sonnet 5.5
  (`src/lib/assistant/chat.ts`). No key, credit used up (a 400), any other API
  error, or a reply that didn't finish means OpenRouter, on the model the call
  names. The old `ANTHROPIC_API_KEY` on Railway is deliberately not used. See
  `completeViaClaude()` in `src/lib/llm.ts`.

Models are chosen per job (news models live in `src/lib/news/models.ts`):

| Model | Used for | $/MTok in/out |
|---|---|---|
| `google/gemini-2.5-flash-lite` (default) | Extraction, runner photo checks (Claude Haiku 5.5 first) | 0.10 / 0.40 |
| `google/gemini-3.7-flash` (`JUDGE_MODEL`) | Shoe review checks and image verification (Claude Sonnet 5.5 first) | Sonnet 2 / 10 |
| `deepseek/deepseek-v3.2` (`WRITING_MODEL`) | RaceScript generation (after the Anthropic credit path) | 0.269 / 0.400 |
| `ASSISTANT_MODEL` (default `anthropic/claude-haiku-5.5`) | Site chat assistant (`docs/assistant.md`) | 0.10 / 0.50, cached input 0.01 |
| `WRITE_MODEL` / `CHECK_MODEL` | News writing and fact-checking (subscription first, see above) | n/a |

## History: news sort, group and search OpenRouter first (13 to 19 Nov 2026)

**Replaced on 19 Nov 2026 by the Claude-first order above.** Kept for the
reasoning. The OpenRouter switch described here still applies whenever a job
reaches OpenRouter, and Claude now does the search (the "no Claude stand-in"
point below is out of date).

On 13 Nov 2026 the OpenRouter key died (HTTP 401 "User not found") and the daily
news run stopped at the sort, before any writing, because sorting and grouping
only knew OpenRouter. Stephen approved a fallback. The order is now:

| Stage | 1st | 2nd | 3rd | 4th | If all fail |
|---|---|---|---|---|---|
| Sort (`sortItemJev`) | Jev on OpenRouter | Gemini 3.7 Flash on OpenRouter (`SORT_MODEL`) | Claude Code `claude -p --model sonnet` | Anthropic credit, Sonnet 5.5 | the run stops with "sort: every provider failed ..." |
| Group (`groupItems`) | Gemini 3.7 Flash on OpenRouter (`GROUP_MODEL`) | Claude Code `claude -p --model opus` | Anthropic credit, Opus 5.5 | | the run stops with "group: every provider failed ..." |
| Extra-coverage search (`moreCoverage`) | OpenRouter web plugin | | | | skipped: the story goes ahead on the sources it has |

- **When OpenRouter works nothing changes**: Claude is not called for sort,
  group or search. The Claude stand-ins get the same prompt and JSON schema
  as Gemini (`completeJsonOpenRouterFirst()` in `src/lib/llm.ts`).
- **The OpenRouter switch.** A key or billing problem (401, 402, "User not
  found", key missing, out of credit) on the Gemini or search call switches
  OpenRouter off for the rest of the run, so the remaining items go straight
  to Claude without waiting on a dead key (Jev is skipped too). Any other
  failure (5xx, timeout, no connection) falls back for that item only; three
  OpenRouter failures in a row switch it off as well, and a success resets
  the count. A Jev failure on its own doesn't count, because Jev is on
  OpenRouter's alpha Decisions API and Gemini's chat call is the better test of
  the key. `runNews()` turns OpenRouter back on at the start of every run.
- **Search has no Claude stand-in, on purpose.** Claude Code can search the
  web, but only with its tools switched on and a free-text answer to dig links
  out of, which is new and untested in the GitHub workflow. Extra coverage is
  optional (the writer and checker still have the feed sources), so a failed
  search logs `search: skipped ...` and the run carries on.
- **Log lines** name the provider for each call: `sort: openrouter-jev`,
  `sort: openrouter-gemini`, `sort: claude-cli`, `sort: claude-credit`, the same
  for `group:`, and `search: openrouter-web` or `search: skipped (...)`. No keys
  are logged.
- **Cost and time.** Claude Code calls cost nothing extra on the subscription
  and count as $0 against the news ceiling; credit calls also count as $0
  (the ceiling tracks OpenRouter spend). With OpenRouter down, the sort is one
  `claude -p` call per item (Sonnet, to be quicker and lighter on usage limits
  than Opus); per item rather than batched, so each verdict is made exactly as
  Gemini makes it. A rough guess, not yet measured: 10-30 seconds per item, so 15 items is a few
  minutes, 50 could be 15-25, inside the workflow's 50-minute limit but with
  less room for writing. A busy day could also hit the subscription's usage
  limit; then the credit takes over if `ANTHROPIC_CREDIT_API_KEY` is set. It is
  **not** passed to the `news-daily` workflow today, so in GitHub Actions the
  chain is OpenRouter, then Claude Code, then a clear error.

Extraction calls run at `temperature: 0` for parseable output; the writing calls
use 0.6–0.7.

## Jev (decision model)

`typesafe/jev-1.13` answers typed questions (yes/no, pick one, score) instead of
writing text. It is billed to the same OpenRouter key and credits (no TypeSafe
account) through `decide()` in `src/lib/jev.ts`. It reads text only, and it has
no fallback of its own, so every caller falls back to a chat model.

- **News sorter: Jev from 1 Oct to 19 Nov 2026**, then taken out of the daily
  run when sorting went Claude first (it is OpenRouter-only). `sortItemJev` is
  kept for the sorter check script. On the 306 labelled stories it matched
  Gemini at the publish gate (0 false passes, 13 missed vs 15) at ~1/30th of
  the cost. Jev scores the size of an event, not this site's readers, so
  importance takes 3 off track and 1 off road (`JEV_TOPIC_OFFSET`, fitted on
  half the stories, checked on the other half). Re-check with
  `scripts/news-sorter-check.ts --jev`.
- **Shoe Finder: tried, rejected 1 Oct 2026.** Slightly worse than Flash Lite
  at both review checks, and Flash Lite already costs next to nothing
  (`docs/shoes/jev-check.md`).

Rule of thumb from both trials: Jev pays where the current model is a pricier
reasoning model. Against Flash Lite there is nothing to save.
