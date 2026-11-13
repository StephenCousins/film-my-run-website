# LLM calls

Moved from CLAUDE.md on 15 Oct 2026.

All LLM calls from the site go through **OpenRouter** by default.
`OPENROUTER_API_KEY` is required; `OPENROUTER_MODEL` optionally overrides the
default. `src/lib/llm.ts` exposes `completeText()` and `completeTextWithImage()`.

Two exceptions are tried first, each falling back to OpenRouter on any failure
(the news sort, group and search work the other way round, see
"News sort, group and search" below):

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

## News sort, group and search: OpenRouter first, Claude if it fails (13 Nov 2026)

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

- **News sorter: Jev since 1 Oct 2026** (`sortItemJev`, falls back to
  `sortItem` on Gemini 3.7 Flash, then to Claude when OpenRouter fails: see
  above). On the 306 labelled stories it matched
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
