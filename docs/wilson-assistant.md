# Wilson assistant (Ask Wilson)

Built 25 Oct 2026. The chat in the Wilson Index iPhone app (`~/Developer/parkrun-planner`). Same engine as the
site assistant (`docs/assistant.md`), with its own pack, rules and limits.

## How it works

- **Knowledge pack:** `content/wilson-assistant/pack.md`, hand-maintained. The Q&A and glossary are copied from
  `App/AskWilson.swift` and `App/SettingsView.swift` in parkrun-planner, so refresh the pack when those change, then
  commit it and push. The whole pack is the cached system prompt on every turn, under the rules.
- **Rules:** `RULES` in `src/lib/wilson-assistant/chat.ts`: parkrun, the Wilson index and the challenges only; no
  invented numbers; personal answers only from the runner's facts; links only from the pack's list; under 120 words.
- **Runner's facts:** the app sends a `context` JSON object (worked out on the phone: Wilson index, home event,
  challenge progress). It becomes a second system block. `parseContext` rejects anything that isn't an object or is
  over 8,000 characters. Name, athlete ID, barcode, email and location are never sent.
- **Links:** `cleanLinks` keeps markdown links to `wilson://` app pages and `https://filmmyrun.com/wilson` pages; any
  other link becomes its label and bare off-list URLs are dropped.
- **Model:** the site assistant's `ASSISTANT_MODEL` (default `anthropic/claude-haiku-5.5`) via OpenRouter, using
  the shared `complete()` in `src/lib/assistant/chat.ts`.
- **API:** `POST /api/wilson/assistant` `{ sessionId, installId, messages: [{ role, content }], context }` →
  `{ reply }` or `{ error }`. Messages are validated by the shared `parseMessages`.
  Limits (in memory, reset on deploy): per install id (a v4 UUID) 15 per 10 minutes and 60 a day; with no valid
  install id, per IP 5 per 10 minutes and 20 a day. Plus a daily spend cap.
- **Log:** every question and reply goes in `assistant_messages` with `source = 'wilson'` and the reply's cost. Read
  them at `/admin/assistant?source=wilson`. If the model fails, the question is still logged.
- **Purge:** `src/lib/wilson-assistant/purge.ts` deletes `source = 'wilson'` rows older than 90 days. A timer in
  `src/instrumentation.ts` runs it at start-up and then daily (production only). The privacy page promises 90 days.

## Switches (Railway env vars)

| Var | Effect |
|---|---|
| `WILSON_ASSISTANT_ENABLED=true` | API answers. Unset = 503 with the "can't answer right now" message. |
| `WILSON_ASSISTANT_DAILY_USD` | Spend cap per UTC day for Wilson rows, default 1. Over it, same 503 message. |
| `ASSISTANT_MODEL` | Shared with the site assistant. |

## Privacy

`/wilson/privacy` section 8 describes this feature. If what is sent, where it goes or how long it is kept changes,
change that section and its "last updated" date in the same commit.
