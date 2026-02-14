import { prisma } from '@/lib/db';
import { getAllParkruns, getVenueCoordinates } from '@/lib/parkrun-db';
import type { NewsletterPayload } from '@/lib/newsletter-template';

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

async function autoPopulateNews(
  payload: NewsletterPayload
): Promise<void> {
  if (payload.news && payload.news.length > 0) return;

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

async function autoPopulateSession(
  payload: NewsletterPayload,
  dryRun: boolean
): Promise<void> {
  if (payload.sessionOfTheWeek) return;

  const item = await pickFromPool('session', dryRun);
  if (!item) return;

  payload.sessionOfTheWeek = {
    title: item.title,
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
    const daysSince = Math.round((Date.now() - runDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince > 9 || isNaN(runDate.getTime())) return;

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

    payload.parkrun = { text };
  } catch (e) {
    console.warn('Could not auto-populate parkrun:', e);
  }
}

function autoPopulateIntro(payload: NewsletterPayload): void {
  if (payload.intro) return;

  const parts: string[] = [];

  // Opening
  parts.push('Happy weekend, runners!');

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

/**
 * Auto-populate all missing sections of a newsletter payload.
 *
 * @param payload - The newsletter payload (sections already provided are preserved)
 * @param baseUrl - The site base URL (e.g. https://filmmyrun.co.uk)
 * @param dryRun - If true, don't update last_used_at in the content pool (for preview)
 */
export async function autoPopulateNewsletter(
  payload: NewsletterPayload,
  baseUrl: string,
  dryRun: boolean = false
): Promise<NewsletterPayload> {
  // Auto-populate all sections in parallel where possible
  await Promise.all([
    autoPopulateNews(payload),
    autoPopulateBlogPost(payload, baseUrl),
    autoPopulateVideo(payload),
    autoPopulateArchives(payload, baseUrl),
    autoPopulateAppOfTheWeek(payload, baseUrl, dryRun),
    autoPopulateSession(payload, dryRun),
    autoPopulateTrainingTip(payload, dryRun),
    autoPopulateScience(payload, dryRun),
    autoPopulateNutrition(payload, dryRun),
    autoPopulateParkrun(payload),
  ]);

  // Intro depends on other sections being populated, so run last
  autoPopulateIntro(payload);

  return payload;
}
