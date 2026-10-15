# Architecture

Stack, site map, original schema, API routes, integrations, SEO/Sentry setup,
content workflow and open tasks. Moved from CLAUDE.md on 15 Oct 2026.

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

`(auth)` is the only route group; there are no `(marketing)` or `(dashboard)`
groups. There is no `lib/stripe.ts`.

## Database Schema

**`prisma/schema.prisma` is the source of truth.** The SQL below is the original
migration design and covers only the core tables; the schema has since grown to
43 models (Oct 2026). Everything not shown here (newsletter, news, shoes, parkrun, po10,
quiz, saved routes, analytics, YouTube stats) lives only in the Prisma schema.

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

## API Routes

Taken from the build output. **There is no `/api/posts`**: blog pages query
Prisma directly. The iOS app's `/api/app/v1/*` routes are in `docs/app-api.md`.

### Content & media
- `GET /api/films`: `films` rows plus Ultra races that have a `video_url`
- `GET /api/featured-video`: rotates daily by day-of-year
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
- `/api/auth/[...nextauth]`: NextAuth, Google + Credentials providers
- `/api/auth/register`, `/api/sso/adrian`
- `/api/contact`, `/api/track`, `/api/track/click`
- `/api/runner-quiz/results`

### Shop & club payments
- `/api/shop/checkout`, `/api/shop/webhook/stripe`, `/api/shop/cron`, `/api/shop/rate`, `/api/shop/runner-tee`
- `/api/club/webhook/stripe`

## External Integrations

| Service | Purpose | Env Variable |
|---------|---------|--------------|
| Railway PostgreSQL | Database | `DATABASE_URL` |
| Cloudflare R2 | Image storage | `R2_*` credentials |
| Stripe | Payments | `STRIPE_*` keys |
| Google Sheets | Race data sync | `GOOGLE_CREDENTIALS` |
| Strava | Activity widget, RaceScript OAuth | `STRAVA_*` tokens |
| YouTube Data API | Video embeds, live/upcoming streams, cached view + subscriber counts | `YOUTUBE_API_KEY` |
| OpenRouter | LLM calls (see `docs/llm.md`) | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` |
| Anthropic (prepaid credit) | WRITING_MODEL calls while the credit lasts (see `docs/llm.md`) | `ANTHROPIC_CREDIT_API_KEY` |
| Brave Search | Shoe Finder review/image search | `BRAVE_SEARCH_API_KEY` |
| NextAuth + Google | Sign-in | `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_*` |

## SEO
- **Page-level metadata** on all pages via layout.tsx files (title, description, keywords, OG tags)
- **Homepage** has explicit metadata export with canonical URL
- **Blog posts** have dynamic `generateMetadata` with canonical URLs (`alternates.canonical`)
- **Sitemap** (`src/app/sitemap.ts`) covers 25 static routes + all published blog posts, with per-page priorities
- **robots.txt** (`src/app/robots.ts`) disallows `/api/`, `/admin/`, `/_next/`, `/login`, `/register`
- **JSON-LD structured data** on all pages (Organization, WebSite, Article, BreadcrumbList)
- **Open Graph & Twitter Card** tags on all pages
- Root layout uses `metadataBase` and title template (`%s | Film My Run`)

## Sentry
- `@sentry/nextjs` v9 is installed for error monitoring
- Config in `next.config.ts` (wraps with `withSentryConfig`, source map upload disabled via `sourcemaps.disable`)
- Server-side init in `src/instrumentation.ts` (register function + `onRequestError` hook using `Sentry.captureRequestError`)
- Client-side init in `sentry.client.config.ts`
- Requires `SENTRY_DSN` (server) and `NEXT_PUBLIC_SENTRY_DSN` (client) env vars in Railway
- Sentry v9 removed `disableServerWebpackPlugin`/`disableClientWebpackPlugin`: use `sourcemaps.disable` instead

## Content Workflow

### Adding a Blog Post

For race posts written from video footage, follow `BLOG-WRITING-INSTRUCTIONS.md`.

For posts where Stephen provides content directly:
1. Stephen provides: Title, content (markdown), images
2. Claude:
   - Optimizes images and uploads to R2 (`docs/images-r2.md`)
   - Generates slug from title
   - Creates excerpt if not provided
   - Inserts into database via API
   - Confirms URL and preview

### Updating Race Results

1. Stephen adds race to Google Sheet
2. Sync API pulls new data
3. Dashboard automatically updates

## RaceScript: built but unfinished

`/tools/racescript` turns a Strava run into a race report, blog post or social
post. It was built in one commit and has **never worked in production**:

- The Strava app's Authorization Callback Domain is still `localhost`, so OAuth
  works on a dev machine and fails for every real visitor. Fix at
  strava.com/settings/api.
- The page is live but **linked from nowhere**: not in the nav, `/tools`, or
  the sitemap.
- `src/lib/racescript/store.ts` keeps the OAuth state and activity context in an
  in-process `Map`. A restart mid-flow, or a second instance, drops the user's
  session between the authorize redirect and the callback.

## Pending Tasks

### Content & Media
- [ ] Add photos and videos to numerous pages (services, about, homepage hero, etc.)
- [ ] Source/create hero images for each service page
- [ ] Add video backgrounds where appropriate

### Shop & Merch
- [ ] Create product photography

### Other
- [ ] RaceScript (`/tools/racescript`) is built but unfinished (see above)
- [ ] Decide whether Route Comparison should stay behind the login wall
