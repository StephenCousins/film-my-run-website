# AI News Synthesis System

## Overview

Automated system to aggregate trail/ultra running news from multiple sources, extract facts, and generate original articles for Film My Run.

## Current State

- **News aggregator built** - 10 RSS feeds syncing daily via GitHub Actions cron
- **Proof of concept completed** - Successfully extracted facts from iRunFar article and rewrote as original content
- **No copyright infringement** - Facts are not copyrightable; we write original prose with proper attribution

## How It Works

### 1. Story Detection
- Monitor RSS feeds for new articles
- Use AI to detect when multiple sources cover the same story
- Group related articles by topic/event

### 2. Content Scraping
- Fetch full article content from each source URL
- Extract key facts: who, what, when, where, times, quotes, results
- Store raw facts in structured format

### 3. AI Synthesis
- Combine facts from multiple sources
- Write original article in Film My Run's voice
- Add proper attribution ("Sources: iRunFar, Trail Runner Magazine")
- Generate headline and excerpt

### 4. Image Sourcing
- Extract images from source articles (with attribution)
- Or use Unsplash/stock for generic images
- Store in R2

### 5. Publishing
- Store as posts in database
- News page links to our articles instead of external sites
- Include "Sources" section at bottom of each article

## Technical Implementation

### New Database Table
```sql
CREATE TABLE news_stories (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image VARCHAR(500),
  sources JSONB, -- Array of {name, url} objects
  status VARCHAR(20) DEFAULT 'draft', -- draft, review, published
  category VARCHAR(50),
  ai_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);
```

### New API Routes
- `POST /api/news/generate` - Trigger AI article generation for a topic
- `GET /api/news/stories` - List generated stories
- `PUT /api/news/stories/[id]` - Edit/approve story
- `POST /api/news/stories/[id]/publish` - Publish story

### New Components
- `/news/[slug]` - Individual news story page
- Admin review interface (optional)

## Workflow Options

### Option A: Fully Automated
1. Cron job detects new stories
2. AI generates articles automatically
3. Auto-publishes after generation

### Option B: Human Review
1. Cron job detects new stories
2. AI generates draft articles
3. Human reviews and approves before publishing

### Option C: Manual Trigger
1. Human identifies interesting story
2. Triggers AI generation
3. Reviews and publishes

**Recommendation:** Start with Option C (manual trigger), move to Option B once confident in quality.

## Proof of Concept Result

### Original Source
- iRunFar: "Erin Ton Sets New Women's FKTs on Aconcagua"

### Extracted Facts
- Athlete: Erin Ton (American)
- Event: Women's FKT on Aconcagua (22,841 ft)
- Date: January 28, 2025
- Record: 6:33 roundtrip (unsupported)
- Previous record: 8:17 (supported)
- FKT count: 180+ verified

### Rewritten Article
```
# Erin Ton Smashes Women's Aconcagua Record by Nearly Two Hours

American ultrarunner sets blistering 6:33 roundtrip time on South America's highest peak

Erin Ton has added another remarkable achievement to her already staggering FKT resume,
setting the women's fastest known time on Aconcagua with a roundtrip time of 6 hours
33 minutes on January 28th.

The 22,841-foot peak in Argentina - the highest in South America and the Western
Hemisphere - saw Ton demolish the previous women's record by nearly two hours...

Sources: iRunFar
```

## Next Steps

1. [ ] Create `news_stories` database table
2. [ ] Build fact extraction function (scrape + AI)
3. [ ] Build article generation function
4. [ ] Create news story page template
5. [ ] Update news listing to show our articles
6. [ ] Add manual trigger endpoint
7. [ ] Test with 5-10 real stories
8. [ ] Consider automation level

## Cost Estimate

- ~$0.01-0.05 per article (Claude API)
- 10 articles/day = ~$3-15/month
- Very manageable

---

*Created: February 1, 2026*
