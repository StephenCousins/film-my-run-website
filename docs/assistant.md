# Site assistant

Built 22 Oct 2026. A chat bubble that answers visitors' questions about Stephen and filmmyrun.com.

## How it works

- **Knowledge pack:** `content/assistant/pack.md`, built by `npm run assistant:pack` from
  `content/assistant/facts.md` (hand-written by Stephen, wins over everything else) plus every page in the live
  sitemap, plus every race result from `/api/races` (the race dashboard renders in the browser, so the page scrape never saw his times; until 5 Nov 2026 the assistant repeated an invented 4:45:32 London time from the About page), plus the YouTube channel's 40 most-viewed videos, sorted from every upload's real count (search's order=viewCount skipped 81 Yards) (needs `YOUTUBE_API_KEY` in `.env`): core pages in full (trimmed to 4,000 characters), blog and films as title plus description, news and runners as titles only. About 214 KB
  (95k Sonnet tokens on 10 Nov 2026). Read it to see exactly what the assistant knows. Rebuild after editing facts.md or when the site has moved
  on (new posts, news), then commit the pack and push.
- **Core + search (since 10 Nov 2026).** `splitPack()` in `src/lib/assistant/search.ts` keeps the pack's facts,
  YouTube figures, every race result, films and a list of page titles as the prompt-cached system prompt (~36k
  characters, ~20k tokens). Page text, blog, news and runner profiles become ~900 passages; each question carries the
  best 6 to 8 (BM25 keyword search, ported from zwift.run). The whole pack in every prompt cost ~$0.24 per uncached
  question on Sonnet; now ~$0.05 uncached, under 1p cached. Section headings in the pack decide what is core (`CORE`
  in search.ts), so keep them when changing the pack builder.
- **Model:** Claude Sonnet 5.5 direct on the Max plan's API credit when `ANTHROPIC_CREDIT_API_KEY` is set; any
  failure falls back to `ASSISTANT_MODEL` (default `anthropic/claude-haiku-5.5`) via OpenRouter (`docs/llm.md`).
- **API:** `POST /api/assistant` `{ sessionId, messages: [{ role, content }] }` → `{ reply }` or `{ error }`.
  Limits: 1,000 characters a message, last 20 messages kept, 15 messages per IP per 10 minutes and 60 a day
  (in memory, reset on deploy), and a daily spend cap.
- **Log:** every question and reply goes in `assistant_messages` with the reply's OpenRouter cost. Read them at
  `/admin/assistant` (same gate as the Ask Stephen inbox: `CHAT_ADMIN_EMAIL`).

## Switches (Railway env vars)

| Var | Effect |
|---|---|
| `ASSISTANT_ENABLED=true` | API answers and the bubble is rendered. Unset = off everywhere. |
| `ASSISTANT_PUBLIC=true` | Bubble shows for every visitor. Unset = only in a browser that has opened any page with `?assistant=1`. |
| `ASSISTANT_DAILY_USD` | Spend cap per UTC day, default 1. Over it, the bubble says it's unavailable and points to /contact. |
| `ASSISTANT_MODEL` | OpenRouter model id. |

The bubble's visibility is read when the page is built, so changing `ASSISTANT_ENABLED` or `ASSISTANT_PUBLIC` needs a
redeploy (Railway redeploys on a variable change anyway).

## The "can I help?" nudge

One short line beside the bubble, worded for the page (`greetingFor()` in `SiteAssistant.tsx`): shown after 25
seconds on the site, or half-way down a page after 8 seconds, whichever comes first. Never on /contact, /account,
/admin, checkout, login or the games. It hides after 15 seconds and then doesn't appear again for 7 days in that
browser (`fmr-assistant-teased` in localStorage). Opening any page with `?assistant=1` clears that, so the nudge shows
again for testing. Tune the numbers in `TEASE`.
