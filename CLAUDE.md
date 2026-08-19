# CLAUDE.md - Film My Run Website

This file provides guidance to Claude Code when working with this repository.

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

## ⚠️ MANDATORY: Blog Post Writing Instructions

**If you are asked to write a blog post, you MUST read the instructions file FIRST.**

```
BLOG-WRITING-INSTRUCTIONS.md (in this folder)
```

**DO NOT SKIP THIS STEP.** Previous Claude Code sessions failed because they did not read or follow these instructions. The instructions explain:

- How to use ALL available resources (transcripts, Strava data, photos, research, screenshots)
- How to learn and replicate Stephen's writing style
- Why you must NEVER copy transcripts verbatim
- The exact structure and format required for blog posts
- Quality checklist to verify before submitting

**The transcript is ONE source of many. It tells you what happened - your job is to WRITE about it in Stephen's voice using original prose.**

Related project tracking: `BLOG-POST-PROJECT.md`

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Next.js 15 (App Router) | Full-stack React, great DX, Vercel/Railway deploy |
| **Styling** | Tailwind CSS 4 | Utility-first, dark mode built-in, fast iteration |
| **Animations** | GSAP + ScrollTrigger | Industry standard for scroll animations, now free |
| **Motion** | Framer Motion | React-native animations, page transitions |
| **Database** | PostgreSQL (Railway) | Already in use, proven |
| **ORM** | Prisma | Type-safe, great DX |
| **Auth** | Existing Marathon Plan App system | Reuse FastAPI auth service |
| **Payments** | Stripe | Subscriptions + one-time purchases |
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
├── /blog                       # Blog listing with filters
├── /blog/[slug]               # Individual blog posts
├── /races                      # Race results dashboard
├── /races/[year]              # Year-specific results
├── /tools                      # Tools landing page
│   ├── /tools/calculators     # 7 running calculators
│   ├── /tools/parkrun         # Parkrun stats
│   └── /tools/race-map        # Race visualization
├── /films                      # Documentary showcase
├── /films/[slug]              # Individual film page
├── /services                   # Filmmaking services
├── /training                   # Marathon Plan App (paid)
│   ├── /training/login
│   ├── /training/dashboard
│   └── /training/plans
├── /shop                       # E-commerce
│   ├── /shop/[category]
│   ├── /shop/product/[slug]
│   └── /shop/cart
├── /about                      # About Stephen
└── /contact                    # Contact form
```

---

## Database Schema

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

### Content
- `GET /api/posts` - List posts with pagination, filters
- `GET /api/posts/[slug]` - Single post
- `POST /api/posts` - Create post (Claude workflow)
- `PUT /api/posts/[slug]` - Update post
- `DELETE /api/posts/[slug]` - Delete post

### Races
- `GET /api/races` - All race data with stats
- `GET /api/races/stats` - Quick stats
- `POST /api/races/sync` - Sync from Google Sheets

### Shop
- `GET /api/products` - List products
- `GET /api/products/[slug]` - Single product
- `POST /api/checkout` - Create Stripe session
- `POST /api/webhooks/stripe` - Handle Stripe events

### Auth
- Proxy to Marathon Plan App auth service
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

---

## External Integrations

| Service | Purpose | Env Variable |
|---------|---------|--------------|
| Railway PostgreSQL | Database | `DATABASE_URL` |
| Cloudflare R2 | Image storage | `R2_*` credentials |
| Stripe | Payments | `STRIPE_*` keys |
| Google Sheets | Race data sync | `GOOGLE_CREDENTIALS` |
| Strava | Activity widget, RaceScript OAuth | `STRAVA_*` tokens |
| YouTube/Vimeo | Video embeds | API keys |
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
npm run seed

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## Content Workflow

### Adding a Blog Post (Claude Workflow)

**⚠️ STOP: Read `BLOG-WRITING-INSTRUCTIONS.md` before writing any blog post.**

For races with video footage that need blog posts written:
1. Claude MUST first read the blog writing instructions
2. Claude MUST study 2-3 existing blog posts to learn Stephen's writing style
3. Claude MUST gather ALL available resources:
   - Transcript (`/transcripts/`)
   - Strava activity data (WebFetch the Strava URL)
   - Strava embed code (`/data/strava-embeds.json`)
   - Race screenshots (`/screenshots/` at project root)
   - Centurion RD reports (`/data/centurion-reports/`)
   - Race research (`/data/race-research/`)
4. Claude writes ORIGINAL prose in Stephen's voice - NEVER copying the transcript
5. Claude includes all required media (photos, Strava embed, screenshot, YouTube embed)
6. Claude verifies against the quality checklist before submitting

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
├── app/                        # Next.js App Router
│   ├── (marketing)/           # Public pages
│   │   ├── page.tsx           # Homepage
│   │   ├── blog/
│   │   ├── races/
│   │   ├── tools/
│   │   ├── films/
│   │   ├── shop/
│   │   └── about/
│   ├── (auth)/                # Auth pages
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/           # Protected pages
│   │   └── training/
│   ├── api/                   # API routes
│   └── layout.tsx
├── components/
│   ├── ui/                    # Base UI components
│   ├── sections/              # Page sections
│   ├── animations/            # GSAP/Framer components
│   └── layout/                # Header, Footer, etc.
├── lib/
│   ├── db.ts                  # Prisma client
│   ├── auth.ts                # Auth utilities
│   ├── stripe.ts              # Stripe utilities
│   └── r2.ts                  # Cloudflare R2 utilities
├── prisma/
│   └── schema.prisma
├── public/
│   └── fonts/
├── styles/
│   └── globals.css
└── scripts/
    └── migrate-wordpress.ts   # WordPress migration script
```

---

## Migration — complete

The WordPress migration is done: Railway project and Postgres live, R2 bucket
holding the 2.6GB of images, 212 posts and the race results imported, Stripe
configured, and DNS switched. The site serves from **filmmyrun.com**.

---

## Pending Tasks

### Content & Media
- [ ] Add photos and videos to numerous pages (services, about, homepage hero, etc.)
- [ ] Source/create hero images for each service page
- [ ] Add video backgrounds where appropriate

### Training Plan App
- [ ] Port over the existing Marathon Training Plan App
- [ ] Integrate with new auth system (NextAuth)
- [ ] Set up Stripe subscriptions for paid tiers

### Shop & Merch
- [ ] Design merchandise for the shop (apparel, accessories, etc.)
- [ ] Create product photography
- [ ] Set up Stripe products and inventory

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

All scripts require `.env` with `DATABASE_URL`, `BRAVE_SEARCH_API_KEY`, and `ANTHROPIC_API_KEY`.
**Note:** the standalone `scripts/*.mjs` still call Anthropic directly and will fail
while that account has no credit. The site itself (`src/`) uses OpenRouter — see
"LLM calls" below.
Run with: `node --env-file=.env scripts/<script>.mjs`

| Script | Purpose | Key flags |
|--------|---------|-----------|
| `seed-shoes.mjs` | Import 123 curated shoes from `data/shoes-seed.json` | — |
| `fetch-shoe-reviews.mjs` | Fetch review scores via Brave Search + Haiku (regex first, then text inference) | `--limit N`, `--slug <slug>`, `--stale-only` |
| `fetch-shoe-images.mjs` | Fetch product images via Brave Image Search, verified by Opus 4.8 vision | `--limit N`, `--slug <slug>`, `--force` |
| `cleanup-mismatched-reviews.mjs` | Remove review records where summary doesn't mention the exact shoe model | — |
| `fix-shoe.mjs` | Clear and re-fetch image + reviews for one specific shoe | `--slug <slug>` |

### Monthly Refresh Workflow
```bash
node --env-file=.env scripts/fetch-shoe-reviews.mjs --stale-only
node --env-file=.env scripts/fetch-shoe-images.mjs --force
node --env-file=.env scripts/cleanup-mismatched-reviews.mjs
```

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
- Images are hotlinked from external sources — future improvement: migrate to R2
- To fix a specific mismatched shoe: `node --env-file=.env scripts/fix-shoe.mjs --slug <slug>`

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

### Library layout (`src/lib/route-comparison/`)
| File | Holds |
|---|---|
| `types.ts` | `RouteData` — the per-point series and stats |
| `file-parser.ts` | GPX (DOMParser) and FIT (`fit-file-parser`) |
| `fit-battery.ts` | Raw binary scan for battery (see below) |
| `analysis.ts` | Splits, best efforts, zones, time gaps, grades, steep sections, effort score |
| `stats.ts` / `gps.ts` | Distance, elevation stats, smoothing, GPS cleaning |
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

### Zones
`calculateZones` anchors to a **fraction of the observed maximum** — 50/60/70/80/90%
for heart rate, percentage-of-threshold bands for power. It previously split the
range between the *minimum* and maximum into five equal parts, which reported
time in "Max" on easy runs and moved every boundary if one low reading appeared.

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

Note the FIT parser reads only `data.records` — no `session`, `lap` or
`device_info` — so device-reported totals aren't available and session
self-check can't be ported without extending it.

---

## LLM calls

All LLM calls from the site go through **OpenRouter**, not the Anthropic API.
`OPENROUTER_API_KEY` is required; `OPENROUTER_MODEL` optionally overrides the
default.

`src/lib/llm.ts` exposes `completeText()` and `completeTextWithImage()`. Two
models, chosen per job:

| Model | Used for | $/MTok in/out |
|---|---|---|
| `google/gemini-2.5-flash-lite` (default) | Extraction, scoring, yes/no checks, image verification | 0.10 / 0.40 |
| `deepseek/deepseek-v3.2` (`WRITING_MODEL`) | Race scripts, news stories — where the writing is the product | 0.269 / 0.400 |

Extraction calls run at `temperature: 0` for parseable output; the writing calls
use 0.6–0.7. Nothing in `src/` calls the Anthropic SDK any more. The standalone
`scripts/*.mjs` still do.

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
- **`sitemap.ts` must stay `force-dynamic`.** It queries the database, and the
  build container can't reach it — as a static route it silently shipped only
  the 25 hard-coded paths and no posts at all. The catch blocks log now.
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

---

*Last updated: 19 August 2026*
