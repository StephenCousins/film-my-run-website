# Site assistant

Built 22 Oct 2026. A chat bubble that answers visitors' questions about Stephen and filmmyrun.com.

## How it works

- **Knowledge pack:** `content/assistant/pack.md`, built by `npm run assistant:pack` from
  `content/assistant/facts.md` (hand-written by Stephen, wins over everything else) plus every page in the live
  sitemap: core pages in full (trimmed to 4,000 characters), blog/films/news/runners as one line each. About 58k
  tokens. Read it to see exactly what the assistant knows. Rebuild after editing facts.md or when the site has moved
  on (new posts, news), then commit the pack and push.
- **No retrieval.** The whole pack is the system prompt on every turn (`src/lib/assistant/chat.ts`), with the rules
  above it. The provider's prompt cache makes the repeated part cheap.
- **Model:** `ASSISTANT_MODEL` env var, default `google/gemini-2.5-flash` via OpenRouter (`docs/llm.md`).
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
