# LLM calls

Moved from CLAUDE.md on 15 Oct 2026.

All LLM calls from the site go through **OpenRouter** by default.
`OPENROUTER_API_KEY` is required; `OPENROUTER_MODEL` optionally overrides the
default. `src/lib/llm.ts` exposes `completeText()` and `completeTextWithImage()`.

Two exceptions are tried first, each falling back to OpenRouter on any failure:

- **News writing and checking** (every `completeJson` call on `WRITE_MODEL` or
  `CHECK_MODEL`, so also the runner bios) is tried through Claude Code headless
  (`claude -p --model opus`) on the owner's subscription, when
  `CLAUDE_CODE_OAUTH_TOKEN` is set (a GitHub secret, made with
  `claude setup-token`). If the CLI is missing, fails, times out, hits a usage
  limit or returns something that isn't JSON, the call falls back to
  OpenRouter. A call served by the subscription counts as $0 against the news
  ceiling. See `completeJsonViaClaude()` in `src/lib/llm.ts`.
- **`WRITING_MODEL` calls (RaceScript)** go to `claude-opus-5-5` through the
  Anthropic SDK while Stephen's prepaid API credit lasts (from 12 Oct 2026),
  when `ANTHROPIC_CREDIT_API_KEY` is set. No key, credit used up (a 400), any
  other API error, or a reply that didn't finish means OpenRouter. The old
  `ANTHROPIC_API_KEY` on Railway is deliberately not used. See
  `completeTextViaClaude()` in `src/lib/llm.ts`. This is the only Anthropic SDK
  caller; don't add new ones without asking.

Models are chosen per job (news models live in `src/lib/news/models.ts`):

| Model | Used for | $/MTok in/out |
|---|---|---|
| `google/gemini-2.5-flash-lite` (default) | Extraction, scoring, yes/no checks, image verification | 0.10 / 0.40 |
| `deepseek/deepseek-v3.2` (`WRITING_MODEL`) | RaceScript generation (after the Anthropic credit path) | 0.269 / 0.400 |
| `WRITE_MODEL` / `CHECK_MODEL` | News writing and fact-checking (subscription first, see above) | n/a |

Extraction calls run at `temperature: 0` for parseable output; the writing calls
use 0.6–0.7.

## Jev (decision model)

`typesafe/jev-1.13` answers typed questions (yes/no, pick one, score) instead of
writing text. It is billed to the same OpenRouter key and credits (no TypeSafe
account) through `decide()` in `src/lib/jev.ts`. It reads text only, and it has
no fallback of its own, so every caller falls back to a chat model.

- **News sorter: Jev since 1 Oct 2026** (`sortItemJev`, falls back to
  `sortItem` on Gemini 3.7 Flash). On the 306 labelled stories it matched
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
