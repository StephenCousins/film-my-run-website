# Blog Post Writing Instructions for Claude Code

**STOP. READ THIS ENTIRE DOCUMENT BEFORE WRITING ANYTHING.**

This document provides mandatory instructions for writing blog posts for Film My Run. Previous attempts failed because Claude Code did not follow these instructions. Do not repeat those mistakes.

---

## Step-by-Step Workflow for Each Blog Post

Follow this exact sequence for every blog post:

### 1. Gather All Resources (Run These Commands)

```bash
# Set working directory
cd /Users/stephencousins/Documents/GitHub/Film-My-Run-Website/new-site

# 1. Read the transcript (filename format: DD-MM-YYYY_race-name.txt or YouTube-ID.txt)
# Use Read tool on: /new-site/transcripts/[filename].txt

# 2. Get race data from races-data.json
# Use Grep to search for the race name or date

# 3. Get Strava embed code
# Use Grep to search strava-embeds.json for the activity ID

# 4. Check for race research files
# Use Glob on: /new-site/data/race-research/*race-name*

# 5. Check for Centurion reports (for Centurion races only)
# Use Glob on: /new-site/data/centurion-reports/*

# 6. Check for screenshots
# Use Glob on: /screenshots/*race-name*
```

### 2. Extract Key IDs from Transcript Header

Every transcript file starts with metadata. Extract:

```
Race: Three Forts Challenge
Date: 03/05/2015
Distance: 27.2 miles
Time: 04:27:23
Type: Marathon
Terrain: Trail
Video: https://www.youtube.com/watch?v=ztMRWugGKBE  ← YouTube ID is "ztMRWugGKBE"
Strava: https://www.strava.com/activities/297445792  ← Strava ID is "297445792"
```

### 3. Fetch Additional Context

```bash
# WebFetch the Strava activity for photos and details
WebFetch: https://www.strava.com/activities/[STRAVA_ID]

# WebSearch for race background/history
WebSearch: "[Race Name] marathon trail race history route"
```

### 4. Find the Existing Post ID (if updating)

```bash
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const post = await prisma.posts.findFirst({
    where: {
      OR: [
        { slug: { contains: 'race-name-keyword' } },
        { title: { contains: 'Race Name' } }
      ]
    },
    select: { id: true, title: true, slug: true }
  });
  console.log(JSON.stringify(post, null, 2));
}
main().finally(() => prisma.\$disconnect());
"
```

### 5. Write the HTML Content

Use the HTML template from below. Include:
- TL;DR box with race summary
- Stats grid with distance, time, elevation, position
- 3-5 narrative sections with evocative headers
- At least one pull quote
- Photos throughout (if available)
- YouTube embed at the end
- Strava embed at the end

### 6. Update the Database

```bash
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const newContent = \`[YOUR HTML CONTENT HERE]\`;
const newTitle = 'Your Title Here';
const newExcerpt = 'Brief excerpt...';

async function main() {
  const result = await prisma.posts.update({
    where: { id: [POST_ID] },
    data: {
      title: newTitle,
      content: newContent,
      excerpt: newExcerpt,
      updated_at: new Date()
    }
  });
  console.log('Updated:', result.id, result.title);
}
main().finally(() => prisma.\$disconnect());
"
```

### 7. Verify the Live Post

Check: `https://film-my-run-website-production.up.railway.app/blog/[slug]`

---

## The Golden Rule

**THE TRANSCRIPT IS NOT THE BLOG POST.**

The transcript tells you what happened. Your job is to WRITE about it in Stephen's voice, using ALL available resources. Think of yourself as a ghostwriter who has been given interview recordings, photos, data, and research - you must synthesize all of this into polished, original prose.

---

## Mandatory Pre-Writing Steps

Before writing a single word of any blog post, you MUST complete ALL of these steps in order:

### Step 1: Study Stephen's Writing Style

Read AT LEAST 2-3 existing blog posts written by Stephen to understand his voice:

**Where to find them:**
- Database: Query the blog posts table for existing posts
- Example files: `/new-site/content/blog/` contains markdown drafts
- Key posts to study:
  - Val D'Aran 100 (2021) - epic suffering, reflective tone
  - Any post with "Running Without a Watch" - conversational, philosophical
  - TDS 2022 - vivid scene-setting

**What to note:**
- How he opens posts (hooks, not "This is my race report from...")
- His use of self-deprecating humour
- How he handles time/distance references (woven naturally, not checkpoint-by-checkpoint)
- His reflective, looking-back perspective (past tense, NOT live commentary)
- Specific phrases and expressions he uses

### Step 2: Gather ALL Available Resources

For EVERY blog post, you must gather and read these resources BEFORE writing:

| Resource | Location | What to Extract |
|----------|----------|-----------------|
| **Transcript** | `/new-site/transcripts/` | Timeline, key moments, feelings, struggles, quotes (use sparingly) |
| **Strava Activity** | WebFetch the Strava URL | Photos (3-5 minimum), description, pace data, elevation, kudos/comments |
| **Strava Embed Code** | `/new-site/data/strava-embeds.json` | The iframe code for the route map |
| **Race Screenshot** | `/screenshots/` folder | Pace chart, elevation profile, splits visualization |
| **Centurion RD Reports** | `/new-site/data/centurion-reports/` | Weather conditions, field stats, notable runners, race context |
| **Race Research** | `/new-site/data/race-research/` | Course details, history, conditions, notable events |
| **Race Data** | `/new-site/public/races-data.json` | Official time, position, elevation gain |

**YOU MUST USE MULTIPLE SOURCES. A blog post that only uses the transcript is WRONG and will be rejected.**

### Step 3: Plan the Narrative Structure

Before writing, outline:
- The opening hook (a vivid moment, NOT "This is my race report")
- 3-5 key moments/turning points from the race
- Which photos to use and where
- Section headers that tell a story (evocative, NOT "Miles 0-25")
- The reflective conclusion

---

## Writing Rules

### Voice and Tone

| DO | DON'T |
|----|-------|
| Write in first person, past tense, REFLECTIVE | Write present tense live commentary |
| Use conversational but polished prose | Copy transcript speech patterns |
| Include self-deprecating humour | Be melodramatic about suffering |
| Be specific with details (times, places, feelings) | Be vague or generic |
| Write as if looking back on the experience | Write as if it's happening now |

### Opening Hooks

**GOOD examples (use these patterns):**
- "That was the hardest race I have ever, ever done."
- "Have you ever considered running without a watch?"
- "The moment I crossed the finish line at 3am, I knew something had changed."

**BAD examples (NEVER use these patterns):**
- "So this is the video from my race at..."
- "Okay so I'm going to tell you about..."
- "This is my race report from the 2022..."
- "Right, so basically what happened was..."

### What to NEVER Include

- Transcript speech patterns: "okay so", "right", "um", "basically", "you know"
- Present tense live commentary: "I'm now at mile 50 and feeling..."
- Every single checkpoint in sequence
- Direct quotes except at truly dramatic moments
- YouTube-speak or vlog language

### Section Headers

**GOOD:** "The Wheels Come Off", "Into the Mountains", "Sunrise and Suffering", "When the Quads Give Up"

**BAD:** "Miles 0-25", "The Middle Section", "Part 2", "Checkpoint Updates"

---

## Content Structure Template

Every race report blog post should follow this structure:

```
[OPENING HOOK - 1-2 paragraphs, vivid, memorable, NOT "This is my race report"]

## The Race
[Context: what is this race, distance, elevation, why it matters to Stephen]

## Training & Preparation
[What training looked like, any issues, goals going in]

[STRAVA EMBED - iframe from strava-embeds.json]

## [Evocative Section Title - e.g., "Into the Mountains"]
[Narrative of key race moments with photos interspersed]

[PHOTO - from Strava activity]

## [Another Evocative Section - e.g., "The Wheels Come Off"]
[Continue narrative...]

[PHOTO]

## [Another Section if needed]

[RACE ANALYSIS SCREENSHOT - if available in /screenshots/]

## Results & Reflection
[Final time, position, what it meant]

## What's Next
[Forward-looking conclusion]

[YOUTUBE VIDEO EMBED]
```

---

## ⚠️ CRITICAL: HTML Format Required (NOT Markdown)

**Blog posts MUST be written in HTML, not Markdown.** The site uses `dangerouslySetInnerHTML` to render content directly. Markdown will display as plain text and look broken.

### Required HTML Structure

Every blog post must include these HTML elements:

#### 1. TL;DR Summary Box (at the top)

```html
<!-- TL;DR Summary -->
<div class="tldr-box">
  <h4>In Brief</h4>
  <p>A 2-3 sentence summary of the race - distance, terrain, key highlight or challenge.</p>
</div>
```

#### 2. Stats Grid (after TL;DR)

```html
<div class="stats-grid">
  <div class="stat-item">
    <div class="value">27.2mi</div>
    <div class="label">Distance</div>
  </div>
  <div class="stat-item">
    <div class="value">4:27:23</div>
    <div class="label">Finish Time</div>
  </div>
  <div class="stat-item">
    <div class="value">1,016m</div>
    <div class="label">Elevation</div>
  </div>
  <div class="stat-item">
    <div class="value">86th</div>
    <div class="label">Position</div>
  </div>
</div>
```

#### 3. Body Content

```html
<p>Opening paragraph with the hook...</p>

<p>More paragraphs...</p>

<h2>Section Title</h2>

<p>Section content...</p>

<!-- For emphasis -->
<p>Text with <em>italics</em> and <strong>bold</strong>.</p>
```

#### 4. Pull Quotes (for impactful statements)

```html
<div class="pull-quote">
  <p>"The quote goes here - something memorable or impactful from the narrative."</p>
</div>
```

#### 5. Images with Captions

```html
<figure>
  <img src="/images/blog/2018/race-name-description.jpg" alt="Descriptive alt text" />
  <figcaption>Caption describing the moment</figcaption>
</figure>
```

#### 6. YouTube Video Embed

```html
<h2>Watch the Video</h2>

<div class="video-embed">
  <iframe width="100%" height="400" src="https://www.youtube.com/embed/VIDEO_ID_HERE" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
```

#### 7. Strava Activity Embed

```html
<h2>Strava Activity</h2>

<div class="strava-embed-placeholder" data-embed-type="activity" data-embed-id="ACTIVITY_ID_HERE" data-style="standard" data-from-embed="false"></div>
<script src="https://strava-embeds.com/embed.js"></script>
```

### Complete HTML Template

```html
<!-- TL;DR Summary -->
<div class="tldr-box">
  <h4>In Brief</h4>
  <p>Summary here...</p>
</div>

<div class="stats-grid">
  <div class="stat-item">
    <div class="value">DISTANCE</div>
    <div class="label">Distance</div>
  </div>
  <div class="stat-item">
    <div class="value">TIME</div>
    <div class="label">Finish Time</div>
  </div>
  <div class="stat-item">
    <div class="value">ELEVATION</div>
    <div class="label">Elevation</div>
  </div>
  <div class="stat-item">
    <div class="value">POSITION</div>
    <div class="label">Position</div>
  </div>
</div>

<p>Opening hook paragraph...</p>

<p>More context and introduction...</p>

<h2>First Section Title</h2>

<p>Content...</p>

<figure>
  <img src="/images/blog/YEAR/filename.jpg" alt="Alt text" />
  <figcaption>Caption</figcaption>
</figure>

<h2>Second Section Title</h2>

<p>Content...</p>

<div class="pull-quote">
  <p>"Memorable quote from the narrative."</p>
</div>

<p>More content...</p>

<h2>Watch the Video</h2>

<div class="video-embed">
  <iframe width="100%" height="400" src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

<h2>Strava Activity</h2>

<div class="strava-embed-placeholder" data-embed-type="activity" data-embed-id="STRAVA_ID" data-style="standard" data-from-embed="false"></div>
<script src="https://strava-embeds.com/embed.js"></script>
```

### HTML Escaping in Database Updates

When inserting HTML via the Prisma update script, escape these characters:
- Backticks: Use `\\\``
- Dollar signs: Use `\\$`
- Backslashes: Use `\\\\`

---

## How to Use Each Resource

### The Transcript (Primary Source for Story)

The transcript provides the raw material - what happened, when, how Stephen felt. Extract:
- Key moments and turning points
- Emotional states at different points
- Specific details (what he ate, who he met, what went wrong)
- The overall narrative arc

**BUT:** Do not copy phrases or sentences. Rewrite everything in polished prose.

#### ⚠️ Important: Transcripts Are From Video

The transcripts come from YouTube videos where Stephen is filming while running. This means:

1. **Visual references are unclear** - When Stephen says "this is Maureen" or "look at that view", he's pointing the camera at something you can't see in the transcript.

2. **Multiple people in quick succession** - Stephen often interviews several people in a row. Sentences may jump between different speakers without clear indication.

3. **Don't conflate people** - If the transcript mentions "my coach", then "it's her birthday", then "Mike wants to say hello" - these could be THREE different people, not one person.

4. **When in doubt, be vague** - If you're unsure who said what or what was being shown, write around it. "I chatted with several runners at the start line" is better than incorrectly attributing quotes.

5. **Watch for transcription errors** - Names are often misspelled (e.g., "Morin" instead of "Maureen"). Use common sense.

**Example transformation:**

TRANSCRIPT: "okay so I'm at mile 50 now and my legs are absolutely shot, I mean they're really hurting, and I'm thinking maybe I should drop but then I remember why I'm doing this and I just keep going"

BLOG POST: "By mile 50, my quads had staged a full rebellion. Every descent sent bolts of pain through my legs, and the thought of dropping crept into my mind more than once. But somewhere in the fog of exhaustion, I remembered the months of training, the 4am alarm clocks, the reason I'd signed up in the first place - and I kept moving forward."

### Strava Activity Data

WebFetch the Strava URL to get:
- **Photos**: Download 3-5 photos, use descriptive filenames, place throughout the narrative
- **Description**: Stephen often writes notes here - incorporate these
- **Stats**: Use pace, elevation, moving time to add specific details
- **Comments**: Sometimes contain useful context

### Race Research Files

These provide essential context:
- Weather conditions on the day
- Course changes or notable events
- How the field performed (finish rates, etc.)
- Winner times for comparison
- Historical context about the race

**Weave this information naturally into the narrative.** Don't info-dump.

### Centurion RD Reports

For Centurion races (SDW100, NDW100, TP100, Autumn 100), these reports from Race Director James Elson provide:
- Exact weather conditions
- Field statistics
- Notable runner stories
- Context about the day

### Screenshots

The Strava race analysis screenshots show:
- Pace distribution
- Elevation profile with effort overlay
- Split times

Include these with captions explaining what they show.

---

## Image Workflow

### Image Hosting on Cloudflare R2

**⚠️ CRITICAL: Always use the full R2 URL. Never use relative paths.**

**R2 Public URL:** `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev`

#### URL Patterns

| Image Type | URL Pattern |
|------------|-------------|
| **New blog images** | `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/blog/{year}/{filename}.jpg` |
| **Migrated WordPress images** | `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/wp-uploads/{year}/{month}/{filename}.jpg` |

### Getting Photos from Strava

1. WebFetch the Strava activity URL
2. Look for photo URLs in the response (often on `dgtzuqphqg23d.cloudfront.net` or similar CDN)
3. Note: Many Strava photos require authentication and may not be accessible via WebFetch

### Downloading and Uploading Photos

```bash
# Download photo from Strava CDN (if accessible)
curl -o /tmp/photo.jpg "https://dgtzuqphqg23d.cloudfront.net/[photo-path]"

# Upload to R2 using the migration script:
# 1. Place image in public/images/blog/{year}/ with descriptive filename
# 2. Run: node scripts/migrate-images-to-r2.mjs
# 3. Use the R2 URL in your content

# Or upload manually via Cloudflare dashboard
```

### Using Photos in Posts

```html
<!-- ✅ CORRECT - Full R2 URL -->
<figure>
  <img src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/blog/2025/race-name-photo.jpg" alt="Descriptive alt text" />
  <figcaption>Caption describing the moment</figcaption>
</figure>

<!-- ❌ WRONG - Relative path will break -->
<figure>
  <img src="/images/blog/2025/race-name-photo.jpg" alt="Alt text" />
</figure>
```

### Setting featured_image in Database

```typescript
// ✅ CORRECT
featured_image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/blog/2025/race-name-01.jpg'

// ❌ WRONG - relative paths break
featured_image: '/images/blog/2025/race-name-01.jpg'

// ❌ WRONG - old WordPress URL
featured_image: 'https://filmmyrun.co.uk/wp-content/uploads/...'
```

**Photo placement guidelines:**
- Place photos at key narrative moments, not bunched together
- 3-5 photos per post is ideal
- Every photo needs descriptive alt text for accessibility
- Captions should add context, not just describe the image

### If No Photos Are Available

For older races (2015-2017), Strava photos may not be available. In this case:
- Omit the `<figure>` elements
- The post can still work with just the YouTube embed and Strava activity map
- Note this limitation in the post metadata if needed

---

## Quality Checklist

Before submitting any blog post, verify:

### Format & Structure
- [ ] Is the content in **HTML format** (NOT Markdown)?
- [ ] Does it include the `<div class="tldr-box">` summary at the top?
- [ ] Does it include the `<div class="stats-grid">` with 4 stat items?
- [ ] Are all paragraphs wrapped in `<p>` tags?
- [ ] Are all section headers using `<h2>` tags?
- [ ] Did I include at least one `<div class="pull-quote">` for impact?

### Content & Style
- [ ] Did I read at least 2 existing blog posts to learn Stephen's style?
- [ ] Did I gather and use MULTIPLE resources (not just transcript)?
- [ ] Does it sound like Stephen wrote it, or does it sound like a transcript?
- [ ] Is it written in past tense, reflectively (not live commentary)?
- [ ] Does the opening hook grab attention (not "This is my race report")?
- [ ] Are section headers evocative (not "Miles 50-75")?
- [ ] Did I remove ALL transcript speech patterns ("okay so", "basically", "right")?
- [ ] Does a reader unfamiliar with the race understand the context?

### Media & Embeds
- [ ] Did I include 3-5 photos with `<figure>` tags (if available)?
- [ ] Did I include the Strava embed with correct activity ID?
- [ ] Did I include the YouTube video embed with correct video ID?
- [ ] Did I include the race analysis screenshot (if available in `/screenshots/`)?

---

## File Locations Reference

| Resource | Path |
|----------|------|
| Transcripts | `/new-site/transcripts/` |
| Strava Embeds | `/new-site/data/strava-embeds.json` |
| Race Research | `/new-site/data/race-research/` |
| Centurion Reports | `/new-site/data/centurion-reports/` |
| Screenshots | `/screenshots/` (project root) |
| Race Data | `/new-site/public/races-data.json` |
| Blog Images (R2) | `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/blog/{year}/` |
| WordPress Images (R2) | `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/wp-uploads/{year}/{month}/` |
| Local Image Drafts | `/new-site/public/images/blog/{year}/` |
| Existing Blog Posts | Database (query via Prisma) |

### Transcript File Naming Conventions

Transcripts use two naming patterns:

1. **Date-based (older races):** `DD-MM-YYYY_race-name.txt`
   - Example: `03-05-2015_three-forts-challenge.txt`

2. **YouTube ID (newer races):** `[VIDEO_ID].txt`
   - Example: `ztMRWugGKBE.txt`

3. **Named files (special cases):** `Race Name YYYY.txt`
   - Example: `Race to the King 2025.txt`

To find the right transcript:
- Check `/new-site/transcripts/` for the date or race name
- Cross-reference with `races-data.json` which has YouTube video URLs
- Extract YouTube ID from URL: `youtube.com/watch?v=ztMRWugGKBE` → ID is `ztMRWugGKBE`

---

## Project Scope: 76 Races Needing Blog Posts

The master list of races with videos but no race reports is in Stephen's Google Sheet.

**Screenshot references:** `/Screenshot 2026-01-28 at 15.00.42.png` and `/Screenshot 2026-01-28 at 15.00.48.png` (project root)

These races span 2015-2025. Work through them chronologically.

**Progress tracking:** Mark completed posts in `BLOG-POST-PROJECT.md` or create a tracking file.

---

## Updating Existing Blog Posts in the Database

Blog posts are stored in the **PostgreSQL database** (not markdown files). The markdown files in `/new-site/content/blog/` are drafts/references only. To update a live blog post:

### Step 1: Find the Post ID

```bash
cd /Users/stephencousins/Documents/GitHub/Film-My-Run-Website/new-site

npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const post = await prisma.posts.findUnique({
    where: { slug: 'your-post-slug-here' },
    select: { id: true, title: true, slug: true }
  });
  console.log(JSON.stringify(post, null, 2));
}
main().finally(() => prisma.\$disconnect());
"
```

### Step 2: Update the Post

**IMPORTANT: Content must be HTML, not Markdown!**

```bash
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const newContent = \`<!-- TL;DR Summary -->
<div class=\"tldr-box\">
  <h4>In Brief</h4>
  <p>Your summary here...</p>
</div>

<div class=\"stats-grid\">
  <!-- stats here -->
</div>

<p>Your HTML content here...</p>\`;

const newTitle = 'Your New Title Here';
const newExcerpt = 'Brief excerpt for previews...';

async function main() {
  const result = await prisma.posts.update({
    where: { id: YOUR_POST_ID },
    data: {
      title: newTitle,
      content: newContent,
      excerpt: newExcerpt,
      updated_at: new Date()
    }
  });
  console.log('Updated post:', result.id, result.title);
}
main().finally(() => prisma.\$disconnect());
"
```

### Step 3: Verify the Update

```bash
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const post = await prisma.posts.findUnique({
    where: { id: YOUR_POST_ID },
    select: { id: true, title: true, content: true, updated_at: true }
  });
  console.log('Title:', post.title);
  console.log('Updated at:', post.updated_at);
  console.log('Content starts with:', post.content.substring(0, 150));
}
main().finally(() => prisma.\$disconnect());
"
```

### Important Notes

- **Changes are immediate** - The blog pages use `force-dynamic`, so database updates appear instantly (no rebuild needed)
- **No commit required for content** - Database content is separate from code deployments
- **Always verify** - Check the live URL after updating to confirm changes
- **Escape special characters** - In the content string, escape backticks (\\\`) and dollar signs (\\$) properly

### Alternative: Use the update-post.ts Script

```bash
npx tsx scripts/update-post.ts '{"id": 193, "content": "Your content here..."}'
```

---

## Common Mistakes to Avoid

1. **Using Markdown instead of HTML** - The site renders HTML directly. Markdown will display as broken plain text.
2. **Copying transcript text** - The biggest content failure. Never copy, always rewrite.
3. **Only using the transcript** - You must use Strava, research, screenshots too.
4. **Present tense writing** - This is a reflective blog post, not live commentary.
5. **Generic section headers** - "Mile 50" is lazy. "When the Wheels Came Off" tells a story.
6. **Info-dumping** - Weave context naturally, don't list facts.
7. **Forgetting media** - Every post needs photos, Strava embed, and video embed.
8. **Not studying Stephen's style first** - Read existing posts BEFORE writing.
9. **Missing HTML structure** - Every post needs `tldr-box`, `stats-grid`, proper `<h2>` and `<p>` tags.

---

## Summary

You are a ghostwriter. You have been given:
- An interview transcript (the YouTube transcript)
- Photo gallery (Strava photos)
- Data and statistics (Strava, race data)
- Background research (race research files, Centurion reports)
- The author's previous work (existing blog posts)

Your job is to synthesize ALL of this into a polished, original blog post that sounds like Stephen wrote it himself. The transcript is your primary source for the STORY, but the words must be your own, written in Stephen's voice.

**If the final blog post reads anything like a transcript, you have failed.**
