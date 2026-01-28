# CLAUDE.md - Film My Run Website

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Film My Run** is a complete rebuild of filmmyrun.co.uk - transforming from a WordPress blog into a modern, dynamic running platform with:
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
filmmyrun.co.uk/
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
| Strava | Activity widget | `STRAVA_*` tokens |
| YouTube/Vimeo | Video embeds | API keys |

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
featured_image: 'https://filmmyrun.co.uk/wp-content/uploads/2025/01/image.jpg'
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

When DNS is moved to Cloudflare, the R2 bucket can be connected to `images.filmmyrun.co.uk`. At that point, do a find/replace in the database and codebase to update URLs.

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
- Dynamic meta tags per page
- Open Graph images auto-generated
- Structured data for articles and products
- Sitemap auto-generated

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

## Migration Checklist

- [ ] Set up new Railway project
- [ ] Configure PostgreSQL database
- [ ] Set up Cloudflare R2 bucket
- [ ] Migrate 2.6GB of images to R2
- [ ] Extract posts from WordPress SQL
- [ ] Transform WordPress content to clean format
- [ ] Import posts to new database
- [ ] Migrate race results data
- [ ] Set up DNS for filmmyrun.co.uk
- [ ] Configure Stripe products
- [ ] Deploy to Railway
- [ ] Test all pages and features
- [ ] Switch DNS to new site

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
- [ ] Migrate WordPress blog content
- [ ] Set up Cloudflare R2 for image hosting
- [ ] Configure custom domain (filmmyrun.co.uk)

---

## Owner Context

Stephen is not a professional coder. When making changes:
- Always preserve working code before modifications
- Test changes incrementally
- Provide clear explanations of what each change does
- Document everything in this file
- Never delete features without explicit approval

---

*Last updated: January 28, 2026*
