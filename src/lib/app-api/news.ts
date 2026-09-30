import { orderForPage } from '@/lib/news/present';
import { prisma } from '@/lib/db';

export const APP_NEWS_LIMIT = 12;
const SITE = 'https://filmmyrun.com';

export interface AppNewsStory {
  slug: string;
  title: string;
  excerpt: string;
  imageUrl: string | null;
  publishedAt: string;
  url: string;
  topStory: boolean;
}

interface StoryRow {
  slug: string;
  title: string;
  excerpt: string;
  image_url: string | null;
  published_at: Date | null;
  created_at: Date;
  importance: number | null;
}

/** Published rows → the app's Running News feed, in the /news page order (top story first). */
export function appNewsFeed(rows: StoryRow[], now: Date): AppNewsStory[] {
  const stories = rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    imageUrl: r.image_url ? new URL(r.image_url, SITE).toString() : null,
    pubDate: (r.published_at ?? r.created_at).toISOString(),
    importance: r.importance ?? 0,
  }));
  return orderForPage(stories, now)
    .slice(0, APP_NEWS_LIMIT)
    .map((s) => ({
      slug: s.slug,
      title: s.title,
      excerpt: s.excerpt,
      imageUrl: s.imageUrl,
      publishedAt: s.pubDate,
      url: `${SITE}/news/${s.slug}`,
      topStory: s.topStory === true,
    }));
}

/** The latest published stories as the app feed (shared by the news route and the daily push). */
export async function latestPublishedStories(now = new Date()): Promise<AppNewsStory[]> {
  // The top story can be any story from the last three days, so fetch a little past the 12 shown.
  const rows = await prisma.news_stories.findMany({
    where: { status: 'published' },
    orderBy: { published_at: 'desc' },
    take: 40,
    select: { slug: true, title: true, excerpt: true, image_url: true, published_at: true, created_at: true, importance: true },
  });
  return appNewsFeed(rows, now);
}
