import { prisma } from '@/lib/db';
import { getAllParkruns, getVenueCoordinates, getMetadata, formatTime } from '@/lib/parkrun-db';
import { APP_STORE_URL, type NewsletterPayload, type NewsletterPromo } from '@/lib/newsletter-template';
import { shopItems, type ShopItem } from '@/lib/shop';
import { CLUB_MONTHLY_PENCE } from '@/lib/club/subscription';
import { FILM_MY_RUN_CHANNEL_ID } from '@/lib/youtube-stats';
import { NEWS_PAGE_OURS_ONLY } from '@/lib/news/present';

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'clear skies', 1: 'mostly clear skies', 2: 'partly cloudy skies',
  3: 'overcast skies', 45: 'foggy conditions', 48: 'foggy conditions',
  51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
  61: 'light rain', 63: 'rain', 65: 'heavy rain',
  71: 'light snow', 73: 'snow', 75: 'heavy snow',
  80: 'light rain showers', 81: 'rain showers', 82: 'heavy rain showers',
  95: 'thunderstorms',
};

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

async function fetchWeather(lat: number, lng: number, date: string): Promise<{ temp: number; description: string } | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,weathercode&timezone=Europe/London&start_date=${date}&end_date=${date}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const temp = Math.round(data.daily?.temperature_2m_max?.[0] ?? 0);
    const code = data.daily?.weathercode?.[0] ?? -1;
    const description = WMO_DESCRIPTIONS[code] || 'mixed conditions';
    return { temp, description };
  } catch {
    return null;
  }
}

export const DEFAULT_SUBJECT = 'Film My Run Weekly';

/** Weeks since the epoch: drives every weekly rotation, so a re-staged draft picks the same thing. */
export function weekIndex(now: Date = new Date()): number {
  return Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
}

/** Latest long-form upload from the channel's public RSS feed (no API key); Shorts are skipped. */
async function latestYouTubeVideo(): Promise<{ id: string; title: string } | null> {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${FILM_MY_RUN_CHANNEL_ID}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const xml = await res.text();
    for (const entry of xml.split('<entry>').slice(1)) {
      const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      const link = entry.match(/<link rel="alternate" href="([^"]+)"/)?.[1] ?? '';
      const title = entry.match(/<title>([^<]+)<\/title>/)?.[1];
      if (id && title && !link.includes('/shorts/')) return { id, title: decodeXml(title) };
    }
  } catch {
    // fall back to the races table
  }
  return null;
}

function decodeXml(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;

function shopPromo(item: ShopItem, baseUrl: string): NewsletterPromo {
  const image = item.images.find((i) => i.position === 'model') ?? item.images[0];
  return {
    kind: 'shop',
    label: 'From the Film My Run shop',
    title: item.name,
    text: `${item.subtitle}. From £${item.priceFrom.toFixed(2)}, and FMR Club members get 15% off.`,
    url: `${baseUrl}/shop/${item.slug}`,
    cta: 'Have a look',
    imageUrl: image?.src,
  };
}

/** Shop, Club, app, in turn, one a week. Exported for the test. */
export function promoForWeek(week: number, baseUrl: string, items: ShopItem[] = shopItems): NewsletterPromo {
  const slot = week % 3;
  if (slot === 0 && items.length) return shopPromo(items[Math.floor(week / 3) % items.length], baseUrl);
  if (slot === 1) {
    return {
      kind: 'club',
      label: 'FMR Club',
      title: 'Join the FMR Club',
      text: `${money(CLUB_MONTHLY_PENCE)} a month gets you 15% off everything in the shop, the ultra training plans, Ask Stephen and Ultra Race Pacing. It also keeps the films coming.`,
      url: `${baseUrl}/club`,
      cta: 'Join the Club',
    };
  }
  return {
    kind: 'app',
    label: 'The Film My Run app',
    title: 'Training plans in your pocket',
    text: 'Free training plans from 5K to 100 miles in the Film My Run app for iPhone, built to the 80/20 method.',
    url: APP_STORE_URL,
    cta: 'Get the app',
  };
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** Get article GUIDs/links that appeared in recent newsletter issues */
async function getRecentlyUsedArticleLinks(limit: number = 4): Promise<Set<string>> {
  const recentIssues = await prisma.newsletter_issues.findMany({
    orderBy: { sent_at: 'desc' },
    take: limit,
    select: { content: true },
  });

  const usedLinks = new Set<string>();
  for (const issue of recentIssues) {
    const content = issue.content as Record<string, unknown>;
    const news = content?.news as Array<{ url?: string }> | undefined;
    if (Array.isArray(news)) {
      for (const item of news) {
        if (item.url) usedLinks.add(item.url);
      }
    }
  }
  return usedLinks;
}

/** Get slugs/URLs used for a specific section in recent issues */
async function getRecentlyUsedUrls(sectionKey: string, urlField: string, limit: number = 8): Promise<Set<string>> {
  const recentIssues = await prisma.newsletter_issues.findMany({
    orderBy: { sent_at: 'desc' },
    take: limit,
    select: { content: true },
  });

  const usedUrls = new Set<string>();
  for (const issue of recentIssues) {
    const content = issue.content as Record<string, unknown>;
    const section = content?.[sectionKey] as Record<string, unknown> | undefined;
    if (section && typeof section[urlField] === 'string') {
      usedUrls.add(section[urlField] as string);
    }
  }
  return usedUrls;
}

/** Pick a content pool item by category, using least-recently-used rotation */
async function pickFromPool(
  category: string,
  dryRun: boolean
): Promise<{ title: string; body: string; url: string | null; citation: string | null } | null> {
  // Pick the item with oldest last_used_at (NULLs first = never used)
  const item = await prisma.newsletter_content_pool.findFirst({
    where: { category },
    orderBy: [
      { last_used_at: { sort: 'asc', nulls: 'first' } },
      { id: 'asc' },
    ],
  });

  if (!item) return null;

  if (!dryRun) {
    await prisma.newsletter_content_pool.update({
      where: { id: item.id },
      data: {
        last_used_at: new Date(),
        times_used: { increment: 1 },
      },
    });
  }

  return {
    title: item.title,
    body: item.body,
    url: item.url,
    citation: item.citation,
  };
}

/** Once true (go-live), pull the newsletter's news section from our own published stories. */
async function autoPopulateNewsFromOurStories(
  payload: NewsletterPayload,
  baseUrl: string
): Promise<void> {
  const usedLinks = await getRecentlyUsedArticleLinks(4);

  const stories = await prisma.news_stories.findMany({
    where: { status: 'published' },
    orderBy: { published_at: 'desc' },
    take: 20, // fetch extras so we can filter
    select: { title: true, slug: true, excerpt: true, image_url: true },
  });

  const toUrl = (slug: string) => `${baseUrl}/news/${slug}`;
  const fresh = stories.filter((s) => !usedLinks.has(toUrl(s.slug)));
  const selected = fresh.length >= 3 ? fresh.slice(0, 3) : stories.slice(0, 3);

  if (selected.length > 0) {
    payload.news = selected.map((s) => ({
      title: s.title,
      url: toUrl(s.slug),
      source: 'Film My Run',
      description: s.excerpt || undefined,
      imageUrl: s.image_url || undefined,
    }));
  }
}

async function autoPopulateNews(
  payload: NewsletterPayload,
  baseUrl: string
): Promise<void> {
  if (payload.news && payload.news.length > 0) return;

  if (NEWS_PAGE_OURS_ONLY) {
    await autoPopulateNewsFromOurStories(payload, baseUrl);
    return;
  }

  const usedLinks = await getRecentlyUsedArticleLinks(4);

  // Fetch recent articles, excluding previously sent ones
  const recentArticles = await prisma.articles.findMany({
    orderBy: { pub_date: 'desc' },
    take: 20, // fetch extras so we can filter
    select: { title: true, link: true, source: true, description: true, image_url: true },
  });

  const fresh = recentArticles.filter((a) => !usedLinks.has(a.link));
  const selected = fresh.length >= 3 ? fresh.slice(0, 3) : recentArticles.slice(0, 3);

  if (selected.length > 0) {
    payload.news = selected.map((a) => ({
      title: a.title,
      url: a.link,
      source: a.source,
      description: a.description || undefined,
      imageUrl: a.image_url || undefined,
    }));
  }
}

async function autoPopulateBlogPost(
  payload: NewsletterPayload,
  baseUrl: string
): Promise<void> {
  if (payload.blogPost) return;

  const usedUrls = await getRecentlyUsedUrls('blogPost', 'url', 8);

  const posts = await prisma.posts.findMany({
    where: {
      status: 'published',
      post_type: 'post',
    },
    orderBy: { published_at: 'desc' },
    take: 20,
    select: { title: true, slug: true, excerpt: true, featured_image: true },
  });

  const post = posts.find((p) => !usedUrls.has(`${baseUrl}/blog/${p.slug}`)) || posts[0];
  if (!post) return;

  payload.blogPost = {
    title: post.title,
    url: `${baseUrl}/blog/${post.slug}`,
    snippet: post.excerpt || post.title,
    imageUrl: post.featured_image || undefined,
  };
}

async function autoPopulateVideo(
  payload: NewsletterPayload
): Promise<void> {
  if (payload.videoOfTheWeek) return;

  const latest = await latestYouTubeVideo();
  if (latest) {
    payload.videoOfTheWeek = {
      title: latest.title,
      url: `https://youtu.be/${latest.id}`,
      description: 'The latest film on the Film My Run channel',
      thumbnailUrl: `https://img.youtube.com/vi/${latest.id}/hqdefault.jpg`,
    };
    return;
  }

  const usedUrls = await getRecentlyUsedUrls('videoOfTheWeek', 'url', 8);

  const races = await prisma.races.findMany({
    where: {
      video_url: { not: null },
    },
    orderBy: { date: 'desc' },
    take: 20,
    select: { event: true, video_url: true, type: true, distance_km: true },
  });

  const race = races.find((r) => r.video_url && !usedUrls.has(r.video_url)) || races[0];
  if (!race?.video_url) return;

  const youtubeId = extractYouTubeId(race.video_url);
  const thumbnailUrl = youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : '';

  if (!thumbnailUrl) return;

  const distanceText = race.distance_km ? `${race.distance_km}km` : '';
  const typeText = race.type || '';
  const description = [typeText, distanceText].filter(Boolean).join(' — ') || 'Watch the race video';

  payload.videoOfTheWeek = {
    title: race.event,
    url: race.video_url,
    description,
    thumbnailUrl,
  };
}

async function autoPopulateArchives(
  payload: NewsletterPayload,
  baseUrl: string
): Promise<void> {
  if (payload.fromTheArchives) return;

  const usedUrls = await getRecentlyUsedUrls('fromTheArchives', 'url', 12);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const posts = await prisma.posts.findMany({
    where: {
      status: 'published',
      post_type: 'post',
      published_at: { lt: sixMonthsAgo },
    },
    orderBy: { published_at: 'desc' },
    take: 30,
    select: { title: true, slug: true, excerpt: true, featured_image: true },
  });

  const post = posts.find((p) => !usedUrls.has(`${baseUrl}/blog/${p.slug}`)) || posts[0];
  if (!post) return;

  payload.fromTheArchives = {
    title: post.title,
    url: `${baseUrl}/blog/${post.slug}`,
    description: post.excerpt || post.title,
    imageUrl: post.featured_image || undefined,
  };
}

async function autoPopulateAppOfTheWeek(
  payload: NewsletterPayload,
  baseUrl: string,
  dryRun: boolean
): Promise<void> {
  if (payload.appOfTheWeek) return;

  const item = await pickFromPool('tool', dryRun);
  if (!item) return;

  payload.appOfTheWeek = {
    name: item.title,
    url: item.url ? `${baseUrl}${item.url}` : baseUrl,
    description: item.body,
  };
}

async function autoPopulateTrainingTip(
  payload: NewsletterPayload,
  dryRun: boolean
): Promise<void> {
  if (payload.trainingTip) return;

  const item = await pickFromPool('training_tip', dryRun);
  if (!item) return;

  payload.trainingTip = {
    text: item.body,
    citation: item.citation || undefined,
  };
}

async function autoPopulateScience(
  payload: NewsletterPayload,
  dryRun: boolean
): Promise<void> {
  if (payload.scienceSection) return;

  const item = await pickFromPool('science', dryRun);
  if (!item) return;

  payload.scienceSection = {
    text: item.body,
    citation: item.citation || undefined,
  };
}

async function autoPopulateNutrition(
  payload: NewsletterPayload,
  dryRun: boolean
): Promise<void> {
  if (payload.nutritionTip) return;

  const item = await pickFromPool('nutrition', dryRun);
  if (!item) return;

  payload.nutritionTip = {
    text: item.body,
    citation: item.citation || undefined,
  };
}

async function autoPopulateParkrun(
  payload: NewsletterPayload
): Promise<void> {
  if (payload.parkrun) return;

  try {
    const allRuns = await getAllParkruns();
    if (allRuns.length === 0) return;

    const latest = allRuns[0]; // sorted by date DESC
    const runDate = new Date(latest.date);
    if (isNaN(runDate.getTime())) return;
    const daysSince = Math.round((Date.now() - runDate.getTime()) / (1000 * 60 * 60 * 24));

    // Aggregate lifetime stats don't depend on having run this week —
    // gather them either way so the card still shows totals/venues/avg time.
    let totalRuns: number | undefined;
    let venues: number | undefined;
    let avgTime: string | undefined;
    try {
      const meta = await getMetadata();
      const avgSeconds = allRuns.length > 0
        ? Math.round(allRuns.reduce((sum, r) => sum + r.time_seconds, 0) / allRuns.length)
        : 0;

      if (meta.totalParkruns > 0) totalRuns = meta.totalParkruns;
      if (meta.uniqueVenues > 0) venues = meta.uniqueVenues;
      if (avgSeconds > 0) avgTime = formatTime(avgSeconds);
    } catch {
      // Stats are a nice-to-have — don't fail the whole section
    }

    // No parkrun this week: leave the section out rather than print filler.
    if (daysSince > 9) return;

    const timeParts = latest.time_formatted.split(':');
    const mins = parseInt(timeParts[0], 10);
    const secs = parseInt(timeParts[1], 10);
    const timeText = secs > 0 ? `${mins} minutes ${secs} seconds` : `${mins} minutes`;
    const dateStr = runDate.toISOString().split('T')[0];

    const venueCoords = await getVenueCoordinates().catch(() => []);
    const coords = venueCoords.find(v => v.event.toLowerCase() === latest.event.toLowerCase());
    const weather = coords ? await fetchWeather(coords.latitude, coords.longitude, dateStr) : null;

    let text = `This week I headed to ${latest.event} parkrun`;
    if (weather) {
      text += ` — ${weather.temp}°C with ${weather.description}`;
    }
    text += `. I finished in ${timeText}`;
    if (latest.position) {
      text += ` in ${latest.position}${ordinalSuffix(latest.position)} place`;
    }
    text += '. We\'ll get the video out soon!';

    payload.parkrun = { text, totalRuns, venues, avgTime };
  } catch (e) {
    console.warn('Could not auto-populate parkrun:', e);
  }
}

function autoPopulateIntro(payload: NewsletterPayload): void {
  if (payload.intro) return;

  const parts: string[] = [];

  // Opening
  parts.push('Morning, runners!');

  // Mention parkrun
  if (payload.parkrun) {
    const eventMatch = payload.parkrun.text.match(/headed to (.+?) parkrun/);
    if (eventMatch) {
      parts.push(`I was out at ${eventMatch[1]} parkrun this week.`);
    }
  }

  // Mention blog post
  if (payload.blogPost) {
    parts.push(`This week\'s blog post is "${payload.blogPost.title}" — have a read.`);
  } else if (payload.videoOfTheWeek) {
    parts.push(`We\'ve got a new video for you this week — "${payload.videoOfTheWeek.title}".`);
  }

  // Closing
  parts.push('Plenty to get stuck into below. Enjoy!');

  payload.intro = parts.join(' ');
}

/** One tip a week (training, science, nutrition in turn) instead of all three. Session of the Week is editor-only now. */
async function autoPopulateOneTip(payload: NewsletterPayload, dryRun: boolean): Promise<void> {
  if (payload.trainingTip || payload.scienceSection || payload.nutritionTip) return;
  const pick = [autoPopulateTrainingTip, autoPopulateScience, autoPopulateNutrition][weekIndex() % 3];
  await pick(payload, dryRun);
}

/**
 * Auto-populate all missing sections of a newsletter payload.
 *
 * @param payload - The newsletter payload (sections already provided are preserved)
 * @param baseUrl - The site base URL (e.g. https://filmmyrun.com)
 * @param dryRun - If true, don't update last_used_at in the content pool (for preview)
 */
export async function autoPopulateNewsletter(
  payload: NewsletterPayload,
  baseUrl: string,
  dryRun: boolean = false
): Promise<NewsletterPayload> {
  // Auto-populate all sections in parallel where possible
  await Promise.all([
    autoPopulateNews(payload, baseUrl),
    autoPopulateBlogPost(payload, baseUrl),
    autoPopulateVideo(payload),
    autoPopulateArchives(payload, baseUrl),
    autoPopulateAppOfTheWeek(payload, baseUrl, dryRun),
    autoPopulateOneTip(payload, dryRun),
    autoPopulateParkrun(payload),
  ]);

  if (!payload.promo) payload.promo = promoForWeek(weekIndex(), baseUrl);

  // A subject that says what's inside, not the same line every week. Stephen can still edit it.
  if (payload.subject === DEFAULT_SUBJECT) {
    const lead = payload.blogPost?.title ?? payload.videoOfTheWeek?.title;
    if (lead) payload.subject = lead;
  }

  // Intro depends on other sections being populated, so run last
  autoPopulateIntro(payload);

  return payload;
}
