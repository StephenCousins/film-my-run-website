# CLAUDE.md - Film My Run Website

This file provides guidance to Claude Code when working with this repository.

Dated session logs and handover history: docs/HANDOVER.md (read it before resuming work).

## Project Overview

**Film My Run** is a complete rebuild of the old WordPress blog into a modern, dynamic running platform. It serves from **filmmyrun.com**; filmmyrun.co.uk 301s to it. Features:
- Personal race blog & reports (15 years of content, 2011-2025)
- Running tools (calculators, parkrun stats, race visualization)
- Race results dashboard
- Marathon training app (paid feature)
- E-commerce shop
- Documentary film showcase

**Owner:** Stephen Cousins - Award-winning documentary filmmaker, runner, ultra-marathoner, MC at trail events.

**Workflow:** Stephen writes content locally, provides to Claude, Claude designs pages, uploads images, pushes to database. No traditional CMS admin panel needed.

---

## Blog posts

Before writing a blog post, read `BLOG-WRITING-INSTRUCTIONS.md`. It covers the
sources to gather, Stephen's style, the post structure and the quality checklist.
The transcript is one source of many: it says what happened, and the post retells
it in original prose in Stephen's voice, never copied from the transcript.

Related project tracking: `BLOG-POST-PROJECT.md`

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Next.js 15 (App Router) | Full-stack React, great DX, Vercel/Railway deploy |
| **Styling** | Tailwind CSS 3.4 | Utility-first, dark mode built-in, fast iteration |
| **Animations** | GSAP + ScrollTrigger | Industry standard for scroll animations, now free |
| **Motion** | Framer Motion | React-native animations, page transitions |
| **Database** | PostgreSQL (Railway) | Already in use, proven |
| **ORM** | Prisma | Type-safe, great DX |
| **Auth** | NextAuth (Google + Credentials) | `src/lib/auth.ts`; users live in this database, no external auth service |
| **Payments** | Stripe Checkout | Shop (`src/lib/shop/stripe.ts`, `/api/shop/*`) and club (`/api/club/webhook/stripe`) |
| **Images** | Cloudflare R2 + Image CDN | 2.6GB of images, free tier covers it |
| **Deployment** | Railway | Already using, Pro plan |

---

## Code Conventions

### Prisma / Database Naming

**CRITICAL: The Prisma schema uses snake_case for ALL model and field names.**

Before writing any database code, check `prisma/schema.prisma` for correct names.

| Type | Convention | Examples |
|------|------------|----------|
| **Models** | snake_case, plural | `users`, `posts`, `accounts`, `sessions`, `races` |
| **Fields** | snake_case | `user_id`, `access_tier`, `featured_image`, `published_at`, `created_at` |
| **Relations** | snake_case, matches model | `users` (not `user`), `post_terms` (not `terms`) |
| **Compound keys** | snake_case with underscores | `provider_provider_account_id` |

**When returning data to frontend:**
- Database access: use snake_case (`post.featured_image`)
- Returned object properties: use camelCase (`featuredImage: post.featured_image`)

```typescript
// CORRECT
const post = await prisma.posts.findUnique({ where: { slug } });
return {
  featuredImage: post.featured_image,  // snake_case from DB, camelCase in return
  publishedAt: post.published_at,
};

// WRONG - will cause build errors
const post = await prisma.post.findUnique({ where: { slug } });  // model is 'posts' not 'post'
return { featuredImage: post.featuredImage };  // field is 'featured_image'
```

---

## Design System

### Brand Colors

```css
/* Primary */
--orange-primary: #f88c00;      /* Main accent */
--orange-hover: #ff9f1c;        /* Hover state */
--orange-dark: #e07800;         /* Pressed state */

/* Neutrals - Light Mode */
--bg-primary: #fafafa;          /* Page background */
--bg-secondary: #ffffff;        /* Cards, elevated surfaces */
--bg-tertiary: #f4f4f5;         /* Subtle backgrounds */
--text-primary: #18181b;        /* Main text */
--text-secondary: #52525b;      /* Secondary text */
--text-muted: #a1a1aa;          /* Muted text */
--border: #e4e4e7;              /* Borders */

/* Neutrals - Dark Mode */
--dark-bg-primary: #09090b;     /* Page background */
--dark-bg-secondary: #18181b;   /* Cards, elevated surfaces */
--dark-bg-tertiary: #27272a;    /* Subtle backgrounds */
--dark-text-primary: #fafafa;   /* Main text */
--dark-text-secondary: #a1a1aa; /* Secondary text */
--dark-text-muted: #71717a;     /* Muted text */
--dark-border: #27272a;         /* Borders */

/* Semantic */
--success: #22c55e;
--warning: #eab308;
--error: #ef4444;
--info: #3b82f6;
```

### Logo

The brand lockup is a transparent PNG rendered via `next/image` in
`src/components/ui/FilmMyRunLogo.tsx`. Two variants ship in
`public/images/logo/`:

| File | Use on | Content |
|------|--------|---------|
| `fmr-logo-light.png` | Light backgrounds | Dark runner silhouettes |
| `fmr-logo-dark.png` | Dark backgrounds | White runner silhouettes |

Both are 1000 × 444 px (aspect ≈ 2.25). The wordmark ("Film My Run") is
baked into the artwork — no separate text is rendered. The component
auto-switches between variants based on the active theme.

### Typography

```css
/* Font Family */
--font-sans: 'Inter', system-ui, sans-serif;
--font-display: 'Space Grotesk', sans-serif;  /* Headlines */
--font-mono: 'JetBrains Mono', monospace;     /* Code, stats */

/* Scale */
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */
--text-5xl: 3rem;       /* 48px */
--text-6xl: 3.75rem;    /* 60px */
--text-7xl: 4.5rem;     /* 72px */
```

### Animation Principles

1. **Scroll-triggered reveals** - Content fades/slides in as user scrolls
2. **Staggered animations** - Lists animate one item at a time
3. **Parallax depth** - Background layers move slower than foreground
4. **Smooth transitions** - 0.3s ease for interactions, 0.6s for reveals
5. **Custom cursor** - Context-aware (play button on videos, etc.)
6. **Respect reduced motion** - Honor `prefers-reduced-motion`

---

## Site Structure

```
filmmyrun.com/
├── /                           # Homepage - Hero, featured content, stats
├── /about                      # About Stephen
├── /contact                    # Contact form
├── /blog                       # Blog listing with filters
│   └── /blog/[slug]
├── /news                       # Synthesised trail/ultra news
│   └── /news/[slug]
├── /runners                    # Runner profiles (bio, best finishes, UTMB index)
│   └── /runners/[slug]
├── /races                      # Race results dashboard
│   └── /races/years
├── /films                      # Documentary showcase
│   └── /films/[slug]
├── /services                   # Filmmaking services
│   ├── /services/documentary-films
│   ├── /services/pov-race-coverage
│   ├── /services/master-of-ceremonies
│   ├── /services/event-live-streaming
│   └── /services/social-media-coverage
├── /tools                      # Tools landing page
│   ├── /tools/calculators      # Running calculators
│   ├── /tools/parkrun          # Parkrun stats
│   ├── /tools/race-map         # Race visualisation
│   ├── /tools/route-comparison # GPX/FIT overlay (login-gated)
│   ├── /tools/how-fast-am-i
│   ├── /tools/shoe-finder
│   ├── /tools/stone-tracker
│   ├── /tools/runner-quiz
│   └── /tools/racescript       # Built but unfinished - see below
├── /training                   # The iOS app's training plans (replaced Adrian, 26 Sep 2026)
├── /shop                       # Catalogue from data/shop-catalog.json (film-my-run-merch export-catalog)
│   ├── /shop/[slug]            # BuyBox → localStorage basket → /shop/basket → Stripe Checkout
│   └── /api/shop/*             # checkout + Stripe/Printify webhooks; logic in src/lib/shop/
├── /live                       # YouTube live/upcoming streams
├── /discounts
├── /login, /register           # Route group (auth)
├── /privacy, /terms
└── /admin/newsletter/[token]   # Newsletter approval
```

---

## Database Schema

**`prisma/schema.prisma` is the source of truth.** The SQL below is the original
migration design and covers only the core tables; the schema has since grown to
33 models. Everything not shown here — newsletter, news, shoes, parkrun, po10,
quiz, saved routes, analytics, YouTube stats — lives only in the Prisma schema.

### Core Tables

```sql
-- Blog posts (migrated from WordPress)
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image VARCHAR(500),
    status VARCHAR(20) DEFAULT 'published',
    post_type VARCHAR(50) DEFAULT 'post',
    author_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP,
    meta JSONB DEFAULT '{}'
);

-- Post categories and tags
CREATE TABLE terms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    taxonomy VARCHAR(50) NOT NULL,  -- 'category' or 'tag'
    description TEXT
);

CREATE TABLE post_terms (
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    term_id INTEGER REFERENCES terms(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, term_id)
);

-- Media library
CREATE TABLE media (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    alt_text VARCHAR(500),
    mime_type VARCHAR(100),
    size_bytes INTEGER,
    width INTEGER,
    height INTEGER,
    post_id INTEGER REFERENCES posts(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Race results (existing dashboard data)
CREATE TABLE races (
    id SERIAL PRIMARY KEY,
    date DATE,
    event VARCHAR(500) NOT NULL,
    type VARCHAR(50),
    distance_km DECIMAL(10, 3),
    time_hms VARCHAR(20),
    time_seconds INTEGER,
    elevation INTEGER,
    position VARCHAR(50),
    terrain VARCHAR(50),
    video_url TEXT,
    strava_url TEXT,
    results_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Films/documentaries
CREATE TABLE films (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    description TEXT,
    youtube_id VARCHAR(50),
    vimeo_id VARCHAR(50),
    thumbnail_url VARCHAR(500),
    duration_seconds INTEGER,
    year INTEGER,
    awards TEXT[],
    featured BOOLEAN DEFAULT false,
    meta JSONB DEFAULT '{}',        -- synopsis, credits, filmmaker_bio, behind_the_scenes_youtube_id
    created_at TIMESTAMP DEFAULT NOW()
);

-- Shop products
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    compare_price_cents INTEGER,
    currency VARCHAR(3) DEFAULT 'GBP',
    images TEXT[],
    category VARCHAR(100),
    inventory_count INTEGER DEFAULT 0,
    is_digital BOOLEAN DEFAULT false,
    stripe_price_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    stripe_session_id VARCHAR(200),
    status VARCHAR(50) DEFAULT 'pending',
    total_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    shipping_address JSONB,
    items JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (extends Marathon Plan App)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255),
    google_id VARCHAR(100),
    profile_picture VARCHAR(500),
    subscription_tier VARCHAR(50) DEFAULT 'free',
    stripe_customer_id VARCHAR(100),
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Site settings
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Routes

Taken from the build output. **There is no `/api/posts`** — blog pages query
Prisma directly.

### Content & media
- `GET /api/films` — `films` rows plus Ultra races that have a `video_url`
- `GET /api/featured-video` — rotates daily by day-of-year
- `GET /api/news/stories`, `/api/news/sync`, `/api/news/stories/publish`

### Races & stats
- `GET /api/races`, `POST /api/races/sync` (Google Sheets)
- `GET /api/stats`, `GET /api/race-map`, `GET /api/age-grading`
- `GET /api/parkrun`, `GET /api/parkrun/rankings`
- `/api/how-fast/parkrun`, `/api/how-fast/po10` (each with a `/refresh`)
- `/api/stone-tracker/runner`, `/api/stone-tracker/search`

### Shoes
- `GET /api/shoes`, `/api/shoes/add`, `/api/shoes/rate`, `/api/shoes/weekly-update`

### Newsletter
- `/api/newsletter/subscribe`, `/unsubscribe`, `/edit/[token]`, `/preview`,
  `/approve`, `/send`, `/view/[id]`

### RaceScript
- `/api/racescript/authorize`, `/callback`, `/activity`, `/generate`

### Auth & misc
- `/api/auth/[...nextauth]` — NextAuth, Google + Credentials providers
- `/api/auth/register`, `/api/sso/adrian`
- `/api/contact`, `/api/track`, `/api/track/click`
- `/api/runner-quiz/results`

### Shop & club payments
- `/api/shop/checkout`, `/api/shop/webhook/stripe`, `/api/shop/cron`, `/api/shop/rate`, `/api/shop/runner-tee`
- `/api/club/webhook/stripe`

---

## External Integrations

| Service | Purpose | Env Variable |
|---------|---------|--------------|
| Railway PostgreSQL | Database | `DATABASE_URL` |
| Cloudflare R2 | Image storage | `R2_*` credentials |
| Stripe | Payments | `STRIPE_*` keys |
| Google Sheets | Race data sync | `GOOGLE_CREDENTIALS` |
| Strava | Activity widget, RaceScript OAuth | `STRAVA_*` tokens |
| YouTube Data API | Video embeds, live/upcoming streams, cached view + subscriber counts | `YOUTUBE_API_KEY` |
| OpenRouter | All LLM calls (see "LLM calls") | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` |
| Brave Search | Shoe Finder review/image search | `BRAVE_SEARCH_API_KEY` |
| NextAuth + Google | Sign-in | `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_*` |

---

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Database migrations
npx prisma migrate dev
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed database (migrate WordPress content)
npm run db:seed

# Tests (vitest)
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## Content Workflow

### Adding a Blog Post (Claude Workflow)

For race posts written from video footage, follow `BLOG-WRITING-INSTRUCTIONS.md`
(see "Blog posts" above).

For posts where Stephen provides content directly:
1. Stephen provides: Title, content (markdown), images
2. Claude:
   - Optimizes images and uploads to R2
   - Generates slug from title
   - Creates excerpt if not provided
   - Inserts into database via API
   - Confirms URL and preview

### Updating Race Results

1. Stephen adds race to Google Sheet
2. Sync API pulls new data
3. Dashboard automatically updates

---

## Key Technical Notes

### Image Handling - Cloudflare R2

**⚠️ CRITICAL: All images must use the R2 public URL. Never use relative paths or the old WordPress URL.**

**R2 Public URL:** `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev`

#### URL Patterns

| Image Type | URL Pattern | Example |
|------------|-------------|---------|
| **New blog images** | `{R2_URL}/blog/{year}/{filename}` | `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/blog/2025/race-name-01.jpg` |
| **Migrated WordPress images** | `{R2_URL}/wp-uploads/{year}/{month}/{filename}` | `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/wp-uploads/2021/01/arms-out.jpg` |
| **Site assets** | `{R2_URL}/{path}` | `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/about/stephen.jpg` |

#### Setting Image Paths for Blog Posts

When creating or updating blog posts in the database:

```typescript
// ✅ CORRECT - Full R2 URL
featured_image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/blog/2025/race-name-01.jpg'

// ❌ WRONG - Relative path (will break)
featured_image: '/images/blog/2025/race-name-01.jpg'

// ❌ WRONG - Old WordPress URL (will break when old site is removed)
featured_image: 'https://filmmyrun.com/wp-content/uploads/2025/01/image.jpg'
```

#### In HTML Content

```html
<!-- ✅ CORRECT -->
<figure>
  <img src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/blog/2025/race-photo.jpg" alt="Description" />
  <figcaption>Caption here</figcaption>
</figure>

<!-- ❌ WRONG -->
<img src="/images/blog/2025/race-photo.jpg" />
```

#### Uploading New Images to R2

1. Place images in `public/images/` locally with proper folder structure
2. Run the migration script: `node scripts/migrate-images-to-r2.mjs`
3. Use the R2 URL in your database/content

Or upload manually via Cloudflare dashboard and use the resulting URL.

#### Environment Variables (for scripts)

```
R2_ACCOUNT_ID=b98afe6a570b46e01a6352f32c02d035
R2_ACCESS_KEY_ID=<from Cloudflare>
R2_SECRET_ACCESS_KEY=<from Cloudflare>
R2_BUCKET_NAME=filmmyrun-images
R2_PUBLIC_URL=https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev
```

#### Future: Custom Domain

`images.filmmyrun.co.uk` was planned as a custom domain for R2 but **was never set up — the host does not resolve**. Images serve from the `pub-…r2.dev` URL directly. If you do set the subdomain up, find/replace in the database and codebase.

### Animation Performance
- Use GSAP for scroll animations (hardware accelerated)
- Lazy load heavy animations below fold
- Respect `prefers-reduced-motion`
- Target 60fps on all animations

### Dark Mode
- System preference detection on first visit
- Manual toggle saved to localStorage
- Smooth transition between modes
- All components must support both modes

### SEO
- **Page-level metadata** on all pages via layout.tsx files (title, description, keywords, OG tags)
- **Homepage** has explicit metadata export with canonical URL
- **Blog posts** have dynamic `generateMetadata` with canonical URLs (`alternates.canonical`)
- **Sitemap** (`src/app/sitemap.ts`) covers 25 static routes + all published blog posts, with per-page priorities
- **robots.txt** (`src/app/robots.ts`) disallows `/api/`, `/admin/`, `/_next/`, `/login`, `/register`
- **JSON-LD structured data** on all pages (Organization, WebSite, Article, BreadcrumbList)
- **Open Graph & Twitter Card** tags on all pages
- Root layout uses `metadataBase` and title template (`%s | Film My Run`)

### Sentry
- `@sentry/nextjs` v9 is installed for error monitoring
- Config in `next.config.ts` (wraps with `withSentryConfig`, source map upload disabled via `sourcemaps.disable`)
- Server-side init in `src/instrumentation.ts` (register function + `onRequestError` hook using `Sentry.captureRequestError`)
- Client-side init in `sentry.client.config.ts`
- Requires `SENTRY_DSN` (server) and `NEXT_PUBLIC_SENTRY_DSN` (client) env vars in Railway
- **Note:** Sentry v9 removed `disableServerWebpackPlugin`/`disableClientWebpackPlugin` — use `sourcemaps.disable` instead

### Deployment
- Railway auto-deploys on push to main
- **Important:** After adding dependencies, always run `npm install` to regenerate `package-lock.json` before pushing — Railway uses `npm ci` which requires the lock file to be in sync

---

## File Organization

```
/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # login, register
│   │   ├── admin/             # newsletter approval
│   │   ├── api/               # API routes
│   │   ├── blog/ films/ news/ races/ services/ shop/ tools/ training/
│   │   ├── layout.tsx
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   ├── components/
│   │   ├── ui/                # Base UI components
│   │   ├── sections/          # Page sections
│   │   ├── newsletter/
│   │   └── layout/            # Header, Footer, etc.
│   ├── contexts/
│   ├── data/
│   ├── hooks/
│   ├── lib/
│   │   ├── db.ts              # Prisma client
│   │   ├── auth.ts            # NextAuth config
│   │   ├── llm.ts             # OpenRouter wrapper
│   │   ├── r2.ts              # Cloudflare R2 utilities
│   │   ├── youtube-stats.ts   # Cached YouTube view/subscriber counts
│   │   ├── route-comparison/  # GPX/FIT analysis
│   │   ├── racescript/ race-map/ how-fast/ stone-tracker/
│   │   └── *.test.ts          # Vitest, colocated
│   ├── styles/
│   ├── instrumentation.ts     # Sentry server init
│   └── middleware.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── data/                       # Seed and reference JSON
├── content/
└── scripts/                    # Standalone .mjs/.ts maintenance scripts
```

There are **no `(marketing)` or `(dashboard)` route groups** — `(auth)` is the
only one. There is no `lib/stripe.ts`.

---

## Pending Tasks

### Content & Media
- [ ] Add photos and videos to numerous pages (services, about, homepage hero, etc.)
- [ ] Source/create hero images for each service page
- [ ] Add video backgrounds where appropriate

### Shop & Merch
- [ ] Create product photography

### Other
- [ ] RaceScript (`/tools/racescript`) is built but unfinished — see its section below
- [ ] Decide whether Route Comparison should stay behind the login wall

---

## Running Shoe Finder

**Page:** `/tools/shoe-finder`
**API:** `GET /api/shoes` — supports filters: `terrain`, `category`, `brand`, `sort`, `minDrop`, `maxDrop`, `search`

### Database Tables
- `shoes` — brand, model, slug, terrain, category, drop_mm, weight_g, stack_height_mm, price_gbp, release_year, description, image_url, buy_url, avg_score, review_count, last_reviewed
- `shoe_reviews` — shoe_id, source, source_url, expert_score, user_score, user_count, summary, fetched_at
- Unique constraint on `shoe_reviews`: `(shoe_id, source)`

### Scripts

Shoe maintenance is one CLI over `src/lib/shoes/`: `npm run shoes -- <command>`
(`scripts/shoes.ts`; its header lists every command and flag). It needs
`DATABASE_URL`, plus `BRAVE_SEARCH_API_KEY`, `OPENROUTER_API_KEY` and the `R2_*`
credentials for anything that searches or verifies.

| Command | Purpose |
|---------|---------|
| `enrich --slug S` | Fetch review scores for one shoe and recompute its score |
| `image --slug S [--force]` | Find, verify and store an image for one shoe |
| `backfill-images` | Image pass over the catalogue (`--clear-hotlinks` nulls non-R2 images) |
| `run-weekly [--dry-run] [--max-publish N]` | The weekly discovery/publish job, in-process |
| `candidates`, `audit-images`, `add --brand X --model Y` | Inspect holds, prune dead images, owner-curated add |

`node --env-file=.env scripts/seed-shoes.mjs` still imports `data/shoes-seed.json`.

### Image Matching Notes
- Uses two-pass search: quoted exact query first, broader fallback second
- `fetchPageData` collects images from og:image, twitter:image and JSON-LD.
  **JSON-LD is filtered to `Product` entities** — retailer pages embed
  related-product carousels in their structured data, and without that filter a
  page genuinely about the Hoka Mafate X served up a Mafate hiking boot.
- Vision then checks the candidate. It judges **photo quality and legible brand
  or model names only** — it is explicitly told not to guess version numbers.
  Asked to verify the model, it invents them (it called a Brooks Ghost 18 a
  "Ghost 15" from a shoe with no version printed on it). Model identity is the
  job of the page/URL match, not the vision call.
- Only an explicit YES passes. An API failure counts as unverified, not a pass —
  a wrong image is worse than none, and a null `image_url` renders a placeholder.
- `NON_CATALOGUE_HOSTS` rejects eBay, Bazaarvoice, Outside Online and similar
  before spending a vision call; every bad image in the Aug 2026 audit came from
  one of those.
- Verified images are stored on R2 (`src/lib/shoes/images/store.ts`).
- To fix a specific mismatched shoe: `npm run shoes -- image --slug <slug> --force`

### Review Score Notes
- Brave Search finds review pages, regex extracts explicit scores (e.g. 9.2/10)
- Where no explicit score exists, the LLM reads the review text and infers a score
- Scores are normalised to 0–10 (5-star ratings doubled, percentages divided by 10)
- Results filtered to only include pages that mention the exact shoe model name
- Sources: runrepeat, runners_world, irunfar, believe_in_run, the_run_testers

### Seed Data
`data/shoes-seed.json` — 123 curated road and trail shoes across all major brands.
To add more shoes: append entries to the JSON and re-run `seed-shoes.mjs` (skips existing slugs).

---

---

## Route Comparison

**Page:** `/tools/route-comparison` — upload N GPX or FIT files and compare them.
Gated behind `hasAccess('FREE')`, which still requires an authenticated session,
so signed-out visitors see nothing but the `LoginPrompt`.

Six tabs: Overview (stats + full-width map), Charts, Splits, Time Gaps,
Segments, Insights.

### Map
The Overview map is **Google Maps** (`@react-google-maps/api`), sharing the
race map's loader id and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. It was Leaflet on
Carto's free basemap until Sep 2026, when Carto started watermarking those
tiles "API KEY REQUIRED". `parkrun/VenueMapClient.tsx` moved to Google Maps
for the same reason.

### Library layout (`src/lib/route-comparison/`)
| File | Holds |
|---|---|
| `types.ts` | `RouteData` — the per-point series and stats |
| `file-parser.ts` | GPX (DOMParser) and FIT (`fit-file-parser`) |
| `fit-battery.ts` | Raw binary scan for battery (see below) |
| `analysis.ts` | Splits, best efforts, zones, time gaps, grades, steep sections, effort score |
| `stats.ts` / `gps.ts` | Distance, elevation stats, smoothing, GPS cleaning, device distance channel |
| `axis.ts` | Chart Y-axis scaling |
| `persistence.ts` | localStorage save/restore |

### Metrics parsed
Always: elevation, speed, pace, heart rate, cadence, power.
From FIT where present: **temperature, battery, GPS accuracy, GPS altitude**.
These four are optional on `RouteData` and attached **only when the file
actually carried a value** — an all-null array would light up a chart option
with nothing behind it. `availableMetrics()` drives which metric buttons show.

- **Battery** is not on the FIT record messages, and the `device_info` fields
  are INVALID on most Garmins. `fit-battery.ts` walks the raw binary for
  message type 104 ("pad"): field 2 is the percentage, field 253 the timestamp
  (Garmin epoch, 31 Dec 1989). Snapshots are sparse and step-interpolated onto
  trackpoint timestamps.
- **Dual elevation**: `enhanced_altitude` is barometric and goes to
  `elevations`; plain `altitude` is GPS-derived and goes to `gpsElevations`,
  kept only when it differs by >0.1m on at least 10% of points. Without a
  barometer the two are identical and the overlay would draw the same line twice.
- **Temperature is the one metric where 0 and below are real readings.** Every
  other metric treats 0 as "no data" and filters it out; temperature has to opt
  out of that or sub-zero readings vanish from the smoothing average.

### Chart axes (`axis.ts`)
`niceAxisBounds()` rounds Y bounds out to whole multiples of a nice step, so a
103–178bpm trace labels 100/120/140/160/180 rather than 103/118/133. Per-metric
rules live in `AXIS_OPTIONS`: speed, power, cadence and GPS error snap to zero;
heart rate, pace and temperature do not (zero is meaningless and squashes the
useful range); battery caps at 100 and prefers it as the top. Pace and time-gap
axes use second-based step ladders.

### Distance and duration
`stats.distance` comes from **the device, not the GPS track**. A Haversine sum
over the track is the worst distance available for a FIT file: it accumulates
positional jitter as real distance, and records with no lat/lng are dropped at
parse time, so a lost-fix stretch gets chorded straight across. Measured over
18 real Garmin files the track over-reads by up to **3.97% — 4.1 km on a 103 km
ultra**.

Precedence is `session.total_distance` → the `record.distance` odometer →
Haversine, recorded in `stats.distanceSource`. Duration follows the same shape
from `total_elapsed_time`, and `stats.movingTime` carries `total_timer_time`.
`stats.gpsDistance`/`gpsDuration` keep the purely track-derived figures, because
anything measuring the device against the track needs both.

**Ascent and descent stay recomputed on purpose.** Device ascent is barometric
and calibrated per-device, so comparing two watches on their own numbers
compares their barometers rather than the route.

Two guards matter:
- `isUsableDistanceChannel()` rejects a per-point channel that has holes, goes
  backwards, or doesn't match the track length. `findIndexAtDistance` binary-
  searches this array, so a single null or backward step *corrupts a search*
  rather than merely looking wrong. **4 of 18 real Garmin files have a
  non-monotonic odometer** — this is not a theoretical case. Such files keep
  the session total as the headline and fall back to Haversine for plotting.
- If the odometer and the session total disagree by more than 25%, the channel
  is dropped, as insurance against the parser's units shifting underneath us.

Everything that slices by distance — splits, best efforts, segments, time gaps —
goes through `buildCumulativeDistances(coords, route.distances)` so it agrees
with the headline number. `calculateSplitPace` measures over that same array:
pricing a 1 device-km split over the Haversine length of those points reported
a pace several percent faster than the watch did.

### Zones
`calculateZones` uses **the device's own zone boundaries** when the file carries
them, via `buildHrZoneBoundaries()`: `time_in_zone` high boundaries first, then
explicit `hr_zone` messages, then computed from `zones_target` + `user_profile`
(percent-of-HRR where the device works that way, else percent of max).

Anchoring to the activity's observed maximum — the previous behaviour, kept as
the fallback for GPX and any file without zone data — makes every easy run look
hard. On a 103 km easy ultra whose HR never passed 152 against a true max of
178, it reported **15.9% at Threshold and 3.3% at Maximum for a run the device
scored 0% and 0%**.

### Persistence
Routes are saved to localStorage (`fmr:route-comparison:v1`) and restored after
mount, so a refresh doesn't discard loaded files. Timestamps need reviving —
JSON turns Dates into strings. Payloads over ~3.5MB are skipped rather than
risking `QuotaExceededError`, and blocked storage (private browsing) is handled
silently. "Clear All" clears storage too.

### Not ported from the standalone app
The standalone Route Overlay app (`~/Developer/route-comparison`) also has a
hardware-tester suite — cross-track deviation, auto-align, distance drift,
session self-check, HR/cadence validation, dropout diagnostics, fault report —
plus photos, ZIP export, playback animation and Firebase sessions. **That suite
is deliberately not here**: it exists to file Garmin firmware bugs, not to serve
runners. Auto-align is the one piece worth porting eventually.

The FIT parser now also reads `data.sessions`, `zones_target`, `user_profile`
and `time_in_zone` (see "Distance and duration" and "Zones" above), so
device-reported totals *are* available. The session self-check itself is still
not ported, but `stats.gpsDistance`/`gpsDuration` exist so it could be.

**`fit-file-parser` is pinned at 2.2.5 here and 4.1.0 in the standalone.** That
is deliberate, not drift: verified against real files, 2.2.5 returns identical
`total_distance`, `total_elapsed_time`, `total_timer_time` and odometer values,
and already exposes `zones_target`/`user_profile`. Upgrading buys nothing these
features need.

---

## Documentary film stats — live from YouTube

The view counts on `/services/documentary-films` are fetched from the YouTube
Data API rather than hand-maintained. They had drifted badly when they were
hardcoded: the UTMB film read 21K+ against an actual 48.8K, Making Marks 7K+
against 28.4K.

### How it works
`src/lib/youtube-stats.ts` owns it:

| Export | Does |
|---|---|
| `getVideoViewCounts(ids)` | View counts keyed by YouTube ID |
| `getChannelStats()` | Subscriber and lifetime-view totals |
| `formatCount(n)` | `48827` → `48K+`, `1573` → `1.5K+`, `8022632` → `8M+` |
| `selectStaleIds(...)` | Which IDs are missing or older than `STATS_MAX_AGE_MS` |

Counts are cached in `youtube_video_stats` (keyed by `youtube_id`) and
`youtube_channel_stats` (keyed by `channel_id`). Any row older than **7 days**
is refetched on the next request, all stale IDs in one batched `videos.list`
call. That costs **one quota unit** against a daily 10,000, so the cache is
about page speed, not rationing quota.

The cache is keyed by YouTube ID rather than hung off the `films` table because
**only 2 of the 8 showcased films have `films` rows** — 81 Yards, Sub 40 and the
rest exist only as hardcoded entries in `films.ts`.

### Page structure
- `films.ts` — plain film data (titles, descriptions, awards, `fallbackViews`)
- `page.tsx` — server component, fetches stats, wrapped in `unstable_cache`
- `DocumentaryFilmsClient.tsx` — all the JSX

### Things that will bite you
- **`formatCount` always rounds down.** A page that overstates a film's reach to
  a prospective sponsor is worse than one that understates it.
- **The page must stay `force-dynamic`** — see the build-container gotcha below.
- **Watch time is not available here.** It needs the YouTube *Analytics* API and
  OAuth, not the public Data API. Those figures stay hand-maintained in
  `films.ts`. The `~/Developer/youtube-analytics` CLI already has that auth if
  it is ever worth wiring up.
- **`YOUTUBE_API_KEY` is server-side** and set in Railway. Without it the page
  serves the cache, then the `films.ts` fallbacks — it never breaks, it just
  stops refreshing. Everything here fails soft the same way: a YouTube outage
  serves stale numbers rather than an error.
- **The main channel is `UCjphxoB7x0A_VhB1CUz3AwA`.** The ID hardcoded in
  `src/app/live/page.tsx` is a *different* channel ("Virtual FMR", ~2K subs).
  That page also ships the API key to the browser, and the key has no referrer
  restriction.

---

## Runner profiles

`/runners` and `/runners/[slug]` show a page per runner. Each page has a bio, up
to two photos, best finishes, a live UTMB index and "In the news". The spec is
`docs/superpowers/specs/2026-09-27-runner-profiles-design.md`. **The recipe for
adding runners is `docs/runners/HOW-TO.md`.**

- **Table:** `runners`. `photos`, `best_finishes` and `sources` are jsonb, and
  `written_by` is `session` or `auto`. The code lives in `src/lib/runners/`.
- **Links:** `linkRunners` links runner names in news stories when the page is
  shown. The stored story HTML is never changed. "In the news" uses the same
  matcher (`mentionedSlugs`), so the two directions always agree.
- **The news writer reads our runner file.**
  - `RUNNER_FILE_SOURCE` joins the bundle's sources for the writer and the
    fact-checker.
  - It is left out of the published sources, the near-copy check and the
    "second report" count.
  - Sentences marked `*` in a bio are dropped from it.
- **Monday:** `news:daily` refreshes every runner's UTMB index before the
  weekly email. It has a 5-minute limit and a guard for UTMB changing its page
  shape.
- **Automatic pages:** `src/lib/runners/auto.ts` writes pages for runners new
  stories are about.
  - At most 6 attempts a day and $1.50 per run, inside the £10 ceiling.
  - An 8-minute limit.
  - It never overwrites an existing slug and skips names that failed in the
    last 14 days.
  - Pages use the runner's UTMB profile picture as a portrait when they have
    one, otherwise no photo until a session adds one.
- **Monthly refresh:** on the first Monday of the month `news:daily` runs
  `src/lib/runners/monthly.ts` after the UTMB index refresh: new UTMB podiums into
  best finishes (no AI), then up to 20 bios with a new podium or newer story
  revised through the same fix loop as auto pages (`checkedBio`). $3, results
  5 minutes, no bio started after 10; photos and `written_by` are kept; its spend
  is recorded after every bio. Runs after the weekly email, with its own email. `--monthly-refresh` runs it
  by hand.
- **Photos:** only free-licence Commons photos or others with a named
  photographer. `AGENCY_CREDITS` refuses agency credits.
- **ITRA is out of scope:** itra.run blocks automated requests.

## LLM calls

All LLM calls from the site go through **OpenRouter**, not the Anthropic API.
`OPENROUTER_API_KEY` is required; `OPENROUTER_MODEL` optionally overrides the
default.

The one exception: news writing and checking (every `completeJson` call on
`WRITE_MODEL` or `CHECK_MODEL`, so also the runner bios) is tried first
through Claude Code headless (`claude -p --model opus`) on the owner's
subscription, when `CLAUDE_CODE_OAUTH_TOKEN` is set (a GitHub secret, made with
`claude setup-token`). If the CLI is missing, fails, times out, hits a usage
limit or returns something that isn't JSON, the call falls back to OpenRouter.
A call served by the subscription counts as $0 against the news ceiling. See
`completeJsonViaClaude()` in `src/lib/llm.ts`.

`src/lib/llm.ts` exposes `completeText()` and `completeTextWithImage()`. Models
are chosen per job (news models live in `src/lib/news/models.ts`):

| Model | Used for | $/MTok in/out |
|---|---|---|
| `google/gemini-2.5-flash-lite` (default) | Extraction, scoring, yes/no checks, image verification | 0.10 / 0.40 |
| `deepseek/deepseek-v3.2` (`WRITING_MODEL`) | RaceScript generation | 0.269 / 0.400 |
| `WRITE_MODEL` / `CHECK_MODEL` | News writing and fact-checking (subscription first, see above) | — |

Extraction calls run at `temperature: 0` for parseable output; the writing calls
use 0.6–0.7. Nothing in `src/` or `scripts/` calls the Anthropic SDK.

### Jev (decision model)

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

---

## RaceScript — built but unfinished

`/tools/racescript` turns a Strava run into a race report, blog post or social
post. It was built in one commit and has **never worked in production**:

- The Strava app's Authorization Callback Domain is still `localhost`, so OAuth
  works on a dev machine and fails for every real visitor. Fix at
  strava.com/settings/api.
- The page is live but **linked from nowhere** — not in the nav, `/tools`, or
  the sitemap.
- `src/lib/racescript/store.ts` keeps the OAuth state and activity context in an
  in-process `Map`. A restart mid-flow, or a second instance, drops the user's
  session between the authorize redirect and the callback.

---

## Gotchas worth knowing

- **YouTube `maxresdefault.jpg` only exists above 720p.** Older uploads 404.
  Probe maxres → sd → hq and check the response is a real image (>5KB — YouTube
  also serves a ~1KB grey placeholder). This broke 12 film thumbnails.
- **Strava embeds need a per-activity `data-token`** on recent activities;
  without it the iframe renders "Error code: EEE". Store it in the post's
  `meta.strava_embed_token` — `applyStravaEmbedToken()` injects it at render, so
  the token stays data rather than markup. Older activities still embed fine
  without one.
- **The database is unreachable from the build container.** Railway's
  `DATABASE_URL` points at `postgres.railway.internal`, which only resolves once
  the app is running. Any page that reads the database and gets statically
  prerendered will silently ship whatever its error path produces, and the
  deploy still looks green. This has bitten twice: `sitemap.ts` shipped the 25
  hard-coded paths and no posts, and `/services/documentary-films` deployed
  still showing its hardcoded fallback view counts. **Any DB-backed page needs
  `export const dynamic = 'force-dynamic'`** — check the build output, `ƒ` is
  right and `○` is the trap — with `unstable_cache` if you want to avoid a query
  per request. To verify such a page after deploy, read the RSC payload
  (`curl -H "RSC: 1" <url>`), not the HTML: several pages don't put their body
  in the prerendered HTML, so grepping it always looks empty.
- **Next.js metadata `alternates` does not deep-merge.** A page that sets its
  own `alternates` (for a canonical) replaces the parent's wholesale. Put
  document-wide `<link>` tags in the root layout's `<head>`, not in
  `metadata.alternates`.


## Owner Context

Stephen is not a professional coder. When making changes:
- Always preserve working code before modifications
- Test changes incrementally
- Provide clear explanations of what each change does
- Document everything in this file
- Never delete features without explicit approval
