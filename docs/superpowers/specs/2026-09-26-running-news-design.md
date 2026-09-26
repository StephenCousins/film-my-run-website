# Running news: our own stories, written daily (design)

26 September 2026. Agreed with Stephen in conversation, section by section.

## Purpose

filmmyrun.com/news becomes Film My Run's newsroom: original stories about the
latest running news, in Stephen's voice as a reporter, published automatically
every day. Readers stay on the site. It replaces the iRunFar round-up pipeline
(`ai-news-synthesizer.ts`, `/api/news/generate`), which never produced a story
that stayed in the database, and the page's current list of other sites' links.

## Decisions

| Question | Decision |
|---|---|
| Sources | The 9 RSS feeds `src/lib/rss-fetcher.ts` already pulls, plus each item's full page text |
| "Latest" | Items from the last 14 days; newest stories at the top |
| Scope | All running, ranked with a strong lean to trail and ultra; British athletes and UK races boosted. Tom Evans winning UTMB outranks a track world record |
| Not news | Race previews, gear reviews, training, opinion, podcasts/video, sponsored |
| Same event, several sources | One original story combining all of them |
| Voice | Stephen's style, third person, a reporter in the newsroom (the `stephen-voice` measurements: short sentences, British, dry, specific numbers, no em dashes) |
| Publishing | Automatic, behind the gates below |
| Images | The source's own photo with its owner credited in the bottom corner (Stephen's choice, knowing the photos belong to their owners) |
| Page | Only our stories; links leave the site only for the sources credit |
| Cost | Daily, at most 4 stories, a £10 monthly ceiling |
| Where it runs | A script in this repo, `npm run news:daily`, run by GitHub Actions at 06:00 UK time |

## Pipeline

1. **Gather.** Fetch the feeds; keep items published in the last 14 days not
   already processed (item ids stored). Fetch each new item's full text and its
   main image and credit from the source page.
2. **Sort.** One decision per item: type (news, preview, race report, review,
   training, opinion, podcast/video, sponsored, other), running or not, topic
   (trail & ultra, road, track), UK-related (yes/no), importance 1-10 with the lean above. Only type
   = news at confidence >= 0.90 goes on. The sorter is Jev (TypeSafe) or Gemini
   Flash, decided by the bake-off below.
3. **Group** (Gemini Flash). Items about the same event become one bundle,
   across days. An event we have already written about gets a new story only
   when there is genuinely new news (results after a preview); otherwise it is
   skipped.
4. **Rank and cap.** Bundles by importance; the top 4 are written.
5. **Write** (Opus 5.5). One story per bundle from every source's full text:
   title, excerpt, 3-6 paragraphs, original wording (not paraphrase), sources
   credited at the foot. Opus may refuse ("not news") here: gate 2a.
6. **Check** (Opus 5.5). Every name, time, placing, record and date in the story
   must appear in a source: gate 2b.
7. **Image.** See Images.
8. **Publish** to `news_stories` (status published) with date, slug, topic,
   importance, sources.
9. **Log** the run: items seen, sorted out and why, held back and why, cost.

## Data

`news_stories` gains `topic`, `is_uk`, `importance`, `sources` (JSON: site, url,
photo credit) and `held_reason`; `source_heading` and `roundup_date` become
optional (they were the round-up's). A new `news_items` table records each feed
item processed (id, url, sorter verdict and confidence, bundle), so nothing is
sorted twice and the log can explain every decision. One Prisma migration.

## Gates (all must pass to publish)

| Gate | Fails when |
|---|---|
| 1. Sorter | Not news, or confidence below 0.90 |
| 2a. Opus before writing | It judges the bundle not genuine news of the last 14 days |
| 2b. Opus after writing | Any fact in the story is not found in a source |
| 3. Rules in code | Missing title/body, not 3-6 paragraphs, an em dash, a duplicate slug, or a long phrase shared with a source (near-copy) |

- A source older than 14 days never goes on, whatever the sorter says.
- A failing story is **held**, not published, with its reason; `npm run news:publish <id>` publishes one by hand.
- The threshold is a setting. For the first two weeks the log lists every item rejected at 0.50-0.90, to check real news is not being missed.

## Bake-off (before launch)

Label about 800 recent feed items by hand (Claude, reviewed where unsure). Jev
and Gemini Flash each sort them. The deciding measure is how often each would
have passed something that is not news at the 0.90 threshold; then how much real
news each misses. Jev needs a key (Vercel AI Gateway or TypeSafe's waitlist);
without one, Gemini is used and nothing else changes.

## Images

In order, the first that works:
1. The lead source's main image (its `og:image` or first article image), at least 800 px wide, not a logo or text graphic. Cropped to 1200x675, stamped bottom right, white on a dark strip: "Photo: <photographer> / <site>", or "Photo: <site>" when the page names nobody. Stored on R2 as WebP; never hotlinked.
2. Another source's image from the same bundle.
3. A Film My Run branded card: race and location over one of Stephen's trail photos.

The same credit is in text under the image on the story page. A story is never
held back for lack of an image. `npm run news:unimage <id>` swaps a story's image
for the branded card if an owner asks.

## Page

- `/news`: our stories only, newest first, 20 a page; topic chips All, Trail & Ultra, Road, Track, UK; the newest story as the large card.
- `/news/[slug]` (exists, kept): headline, date, image and credit, story, "Sources" in small print (the only outbound links), three more stories. NewsArticle structured data, canonical, sitemap entry (sitemap already lists stories).
- The RSS articles stay in the database as raw material and leave the page.
- The newsletter's auto-populate is checked; if it lists news, it switches to our stories.
- The page switches over only when publishing goes live, so it is never empty.

## Cost

About $0.09 a story (Opus writing and checking), sorting about $0.002 a day.
4 a day, about 120 a month, is about £8. Controls:
- Cap: 4 stories a run (setting).
- Ceiling: £10 a month. Each run adds its real OpenRouter cost (reported per call); if the month would pass the ceiling, the run sorts but writes nothing and says so.

## Testing and rollout

- Unit tests (vitest): grouping, the 14-day rule, the code-rule gate (paragraphs, em dash, near-copy), the credit stamp, cap and ceiling.
- The bake-off.
- `--dry-run`: everything but publishing; stories, images and log to a folder.
- Rollout: build and test; three days of dry runs that Stephen reads (about 12 stories) to tune voice, threshold and ranking; then publishing goes live and the page switches. A daily email for two weeks (published, held and why, cost), weekly after.

## Out of scope

- An admin page for held stories (a command for now).
- Sources beyond the 9 feeds.
- Social posting of stories.

## Retired

- `src/lib/ai-news-synthesizer.ts`, `/api/news/generate`, `.github/workflows/generate-news-stories.yml` (the iRunFar round-up pipeline).
