# Film My Run Website

**Film My Run** (filmmyrun.com; filmmyrun.co.uk 301s to it) is Stephen Cousins's running site, rebuilt from his
old WordPress blog: race blog and reports (2011 on), synthesised trail/ultra news, runner profiles, running tools,
race results dashboard, documentary film showcase, filmmaking services, and a shop. Next.js 15 App Router, Prisma on
Railway Postgres, NextAuth, Stripe, images on Cloudflare R2. Railway auto-deploys on push to `main`.

There is no CMS admin panel: Stephen writes content, Claude designs pages, uploads images and writes to the database.
Stephen is not a professional coder: explain each change plainly, and never delete a feature without his approval.

Dated session logs and handover history: `docs/HANDOVER.md` (read it before resuming work).

## Commands

```bash
npm install
npm run dev
npm run build            # check the route table: DB-backed pages must be ƒ, not ○ (see traps)
npm test                 # vitest, tests colocated as *.test.ts
npm run typecheck
npm run lint
npx prisma migrate dev   # local; production: npx prisma migrate deploy
npx prisma generate
npm run db:seed
npm run shoes -- <cmd>   # Shoe Finder CLI (docs/shoe-finder.md)
npm run news:daily | news:story | news:publish
```

After adding a dependency, run `npm install` so `package-lock.json` is in sync before pushing: Railway uses `npm ci`.

## Rules and traps

- **Prisma uses snake_case for every model and field**, and models are plural: `prisma.posts`, `post.featured_image`,
  relation `users` not `user`, compound key `provider_provider_account_id`. Check `prisma/schema.prisma` before
  writing DB code. Objects returned to the frontend use camelCase (`featuredImage: post.featured_image`). Getting this
  wrong breaks the build.
- **Images always use the full R2 public URL** (`https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/...`), never a
  relative path or an old WordPress URL. `images.filmmyrun.co.uk` was never set up and does not resolve. Patterns
  and upload script: `docs/images-r2.md`.
- **The database is unreachable from the build container.** Railway's `DATABASE_URL` points at
  `postgres.railway.internal`, which only resolves once the app is running. Any page that reads the database and gets
  statically prerendered silently ships whatever its error path produces, and the deploy still looks green (this
  shipped a sitemap with no posts, and stale film view counts). **Any DB-backed page needs
  `export const dynamic = 'force-dynamic'`** (`ƒ` in the build output is right, `○` is the trap), with
  `unstable_cache` if you want to avoid a query per request. To verify such a page after deploy, read the RSC payload
  (`curl -H "RSC: 1" <url>`), not the HTML: several pages don't put their body in the prerendered HTML.
- **Next.js metadata `alternates` does not deep-merge.** A page that sets its own `alternates` (for a canonical)
  replaces the parent's wholesale. Put document-wide `<link>` tags in the root layout's `<head>`.
- **YouTube `maxresdefault.jpg` only exists above 720p.** Older uploads 404. Probe maxres → sd → hq and check the
  response is a real image (>5KB; YouTube also serves a ~1KB grey placeholder).
- **Strava embeds need a per-activity `data-token`** on recent activities, else the iframe shows "Error code: EEE".
  Store it in the post's `meta.strava_embed_token`; `applyStravaEmbedToken()` injects it at render.
- **LLM calls go through `src/lib/llm.ts`** (OpenRouter by default; news via `claude -p` first; RaceScript via the
  Anthropic credit key first). Details and models: `docs/llm.md`.
- **Blog posts:** read `BLOG-WRITING-INSTRUCTIONS.md` first. The transcript says what happened; the post retells it
  in original prose in Stephen's voice, never copied from the transcript. Tracking: `BLOG-POST-PROJECT.md`.
- `/tools/racescript` is live but unlinked and has never worked in production (`docs/architecture.md`).

## Where to find more

- `docs/HANDOVER.md`: dated history and recent session state; read before resuming work.
- `docs/architecture.md`: tech stack, site map, original SQL schema, every API route, external services and env
  vars, SEO, Sentry, content workflow, RaceScript's problems, pending tasks. Read before adding a route or page.
- `docs/design-system.md`: brand colours, logo variants, typography, animation and dark-mode rules. Read before UI work.
- `docs/images-r2.md`: R2 URL patterns, upload script, R2 env vars. Read before adding or moving images.
- `docs/llm.md`: LLM routing, models per job, costs, Jev decision model. Read before adding or changing an LLM call.
- `docs/app-api.md`: the iOS app's `/api/app/v1/*` endpoints.
- `docs/shoe-finder.md`: Shoe Finder weekly pipeline, gate, images, CLI, data model (current). Older catalogue
  notes: `docs/shoes/catalogue-notes.md`.
- Runner profiles: `docs/runners/system.md` (how it works) and `docs/runners/HOW-TO.md` (recipe for adding runners).
- `docs/news/`: news sorter calibration checks.
- `docs/route-comparison.md`: GPX/FIT parsing, device vs GPS distance, zones, axes. Read before touching
  `src/lib/route-comparison/`.
- `docs/youtube-stats.md`: live view counts on `/services/documentary-films`, the cache, the two channel IDs.
- `docs/superpowers/`: specs and plans for past features.
