# Runner Quiz Rewrite + Personalised Shirt: Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Each task is one dispatch; the controller reviews between tasks.

**Goal:** Replace /tools/runner-quiz with the approved 12-situation, 12-type quiz; make the result sell a personalised shirt (phrase on the front, the buyer's Runner DNA on the back) and a film; serve the same quiz to the iOS app.

**Spec:** the approved content and decisions are `docs/runner-quiz/quiz.json` and the memory of the 29 Sep 2026 session, summarised here:
- 12 questions × 4 answers; each answer has axis deltas on S (road +/trail −), M (data +/feel −), D (short +/long −), R (racer +/social −).
- Score per axis: raw sum mapped to 0–100 between the min and max possible, then calibrated: `clamp(0,100, round(50 + spread * (s - mean[k]) / sd[k]))` with `calibration` from quiz.json. Type = nearest `target` (Euclidean); second = next nearest.
- Each type has `name, colour, line, profile, traits, famous, race, mantra, film{id,title}, filmAlt, shirt (the phrase), shirtLines (hand-set breaks), phrases`.
- The result screen headline is the SHIRT PHRASE, type name small underneath; then two BIG calls to action: "Get the shirt" and "Watch: <film>"; then DNA bars, "with a streak of <second>", profile, traits, mantra.
- Shirt: Printify blueprint 12, provider 72 (same shirt as Bonus Miles, `bonus-miles` in data/shop-catalog.json: colours Black, Dark Grey, Forest, Navy, White offered; sizes as Bonus Miles; price £29.99). Front = phrase (+ coloured rule + type name). Back = Film My Run logo top centre, "RUNNER DNA", type name, four scale rows with the buyer's scores, "with a streak of <second>", "FILMMYRUN.COM/QUIZ · <DD.MM.YYYY>".
- Buyer checks out normally. AFTER payment, the server renders front and back PNGs from the order's stored {type, scores, date}, uploads them to R2, and creates the Printify order with custom `print_areas`. The on-page preview and the print use the SAME art code, so they match.

## Global constraints
- Next.js 15 App Router, Prisma snake_case (see CLAUDE.md). DB-backed pages `force-dynamic`.
- Copy: British English, no em dashes, no semicolons in user-facing text.
- Never trust the client for print content: only a type id from the 12 and four integers 0–100 plus a date the server stamps. The server builds all text.
- No new paid services. New npm dependency allowed: `@resvg/resvg-js` (SVG → PNG with bundled fonts). Fonts (OFL) bundled under `assets/fonts/`: Space Grotesk Bold, JetBrains Mono Medium/Bold, Inter Regular/Medium.
- Text measurement must be identical on client and server: use a static advance-width table for the fonts actually used (generated once from the TTFs into `src/lib/runner-quiz/metrics.json`), not canvas or DOM measurement.
- Tests: vitest, colocated. Run only the tests for the area touched (`npx vitest run src/lib/runner-quiz` etc.), plus `npm run typecheck`.
- Do not push. The controller pushes (a push to main deploys).

## Task 1: Quiz content + scoring module
Files: `src/lib/runner-quiz/content.json` (copy of docs/runner-quiz/quiz.json), `src/lib/runner-quiz/index.ts`, `index.test.ts`.
Produces: `QUIZ` (typed content), `type Scores = [number,number,number,number]`, `scoreAnswers(answers: number[]): Scores`, `rankTypes(s: Scores): QuizType[]`, `result(answers) → { scores, type, second }`, `parseScores("18-29-45-64") → Scores | null`, `typeById(id)`.
Tests: every type is returned for its own persona answers (for each type pick, per question, the answer whose deltas best align with (target−50)); 20k seeded random answer sets give every type ≥ 1% and none > 25%; scoreAnswers rejects wrong length/out-of-range; parseScores rejects junk.

## Task 2: Shirt art (shared preview + print)
Files: `src/lib/runner-quiz/metrics.json` (+ the one-off script that made it, `scripts/runner-quiz-metrics.mjs`), `src/lib/runner-quiz/shirt-art.ts`, `shirt-art.test.ts`, `assets/fonts/*.ttf`, `src/lib/runner-quiz/render.ts` (server only, resvg).
Produces:
- `frontArt(type, ink): string` and `backArt(type, second, scores, date: Date, ink, logoHref): string`: art-only SVG strings, viewBox `0 0 3709 4203` (the Printify print area), transparent background. Layout as the approved mock-up (https://claude.ai/artifact/BrdGxquZR45uue57YzLGus, file scratchpad quiz/shirt-body.html): phrase uses `shirtLines`, one size for all lines, widest line ≤ ~64% of width, size capped; sits in the chest area (top ~30% of the print area). Back: logo top centre, then the DNA block.
- `inkFor(colour)`: dark ink on White, light ink (#f5f4ef) otherwise.
- `teeMock(colourHex, artSvg): string` for on-page previews (garment silhouette with the art placed like Printify's placeholder).
- `renderPng(svg): Promise<Buffer>` (render.ts) via resvg with the bundled fonts, 3709×4203.
Tests: every type's front fits (no line wider than the limit per metrics); back renders for scores 0 and 100 without overflow; renderPng returns a PNG of the right size with non-transparent pixels; SVG escapes text.

## Task 3: New quiz UI on /tools/runner-quiz
Files: replace `src/app/tools/runner-quiz/QuizClient.tsx` (and remove the old quiz-data usage), update `og/route.tsx` to show the phrase + type, update `src/app/api/runner-quiz/results/route.ts` + `email/route.ts` to the new types (store `tribe` = new type name; keep old rows). Keep the URL and page metadata.
Behaviour: one question per screen, four big answer buttons, progress bar, back; short "Checking your splits…" beat; result as the spec (phrase headline, BIG shirt + film CTAs linking to `/shop/runner-type-tee?type=<id>&s=<scores>` and `https://youtu.be/<film.id>`); share button (Web Share / copy link with `?r=<type>` so the OG card shows the type); "Take it again". Post the result to the results API. Tailwind, site design system, dark mode, reduced motion.

## Task 4: Personalised shirt product page + basket + checkout
Files: `src/app/shop/runner-type-tee/page.tsx` (+ client component), `src/lib/shop/runner-tee.ts` (+ test), changes to `src/lib/shop/orders.ts` / basket / checkout route.
Behaviour: reads `type` and `s` from the URL (validated; without them, shows "Take the quiz first" linking to the quiz); live front and back previews with `teeMock`; colour and size pickers (the five colours, Bonus Miles sizes and Printify variant ids, price £29.99); "Add to basket" stores a basket line `{ slug: 'runner-type-tee', variantId, quantity, personal: { type, scores } }`. `buildOrderLines` validates `personal` for this slug only (rejects it elsewhere, rejects missing/invalid) and carries it into the OrderLine (+ date stamped server-side at checkout). Shipping quote uses a blueprint line item. Basket UI shows the phrase for such lines. The shop index lists the product (card links to the quiz).

## Task 5: Fulfilment after payment
Files: `src/lib/shop/fulfil.ts`, `src/lib/shop/printify.ts` (+ tests), email.
Behaviour: when the Stripe webhook fulfils an order containing runner-tee lines, for each such line render front + back PNGs (`renderPng`), upload to R2 at `quiz-shirts/<orderId>-<lineIndex>-{front,back}.png`, and add a Printify line item `{ blueprint_id: 12, print_provider_id: 72, variant_id, quantity, print_areas: { front: url, back: url } }` to the same Printify order as the other Printify lines. Idempotent on webhook retry (don't re-upload/re-order). Failure → the existing failure path (order flagged, owner emailed), never a silent drop. The confirmation email shows the back preview image.
Tests: order with one normal tee + one runner tee builds the right Printify payload (mock fetch/upload); retry does not double-order.

## Task 6: App API
File: `src/app/api/app/v1/quiz/route.ts` → content.json (cached, `force-dynamic` not needed: static JSON import is fine) plus `shirtUrl` template. Test the route shape.

## Task 7 (iOS): FMRCore quiz model + scoring
Repo ~/Developer/filmmyrun-ios. `Packages/FMRCore/Sources/FMRCore/Quiz/` model decoding the same JSON, scoring identical to Task 1; tests use a fixture copy of content.json and 3 answer sets whose expected scores/types come from the TS implementation (controller supplies them).

## Task 8 (iOS): Quiz UI + entry points
Native SwiftUI quiz (one question per screen, big buttons, progress, reveal with phrase headline, DNA bars, second type, BIG "Get the shirt" (opens the website shirt page in the in-app Safari view with type & scores) and "Watch" (YouTube)). Today card "What kind of runner are you? 2 minutes" until taken; after taking, the type shows in Settings with Retake. Tools list entry. Result stored locally; posted to the results API. Content from `/api/app/v1/quiz` cached, bundled fallback.
