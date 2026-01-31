import prisma from './db';

// RSS Feed sources
const RSS_FEEDS = [
  {
    name: 'iRunFar',
    url: 'https://www.irunfar.com/feed',
    category: 'trail',
  },
  {
    name: 'UltraRunning Magazine',
    url: 'https://www.ultrarunning.com/feed/',
    category: 'ultra',
  },
  {
    name: 'Trail Runner Magazine',
    url: 'https://www.trailrunnermag.com/feed/',
    category: 'trail',
  },
  {
    name: 'Canadian Running',
    url: 'https://runningmagazine.ca/feed/',
    category: 'running',
  },
  {
    name: 'Trail Running Magazine',
    url: 'https://www.trailrunningmag.co.uk/feed/',
    category: 'trail',
  },
];

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate: string;
  guid?: string;
}

// Simple XML parser for RSS feeds
function parseRSS(xml: string): RSSItem[] {
  const items: RSSItem[] = [];

  // Extract all <item> blocks
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi);
  if (!itemMatches) return items;

  for (const itemXml of itemMatches) {
    const getTag = (tag: string): string => {
      // Handle CDATA sections
      const cdataMatch = itemXml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
      if (cdataMatch) return cdataMatch[1].trim();

      // Handle regular content
      const match = itemXml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return match ? match[1].trim() : '';
    };

    const title = getTag('title');
    const link = getTag('link');
    const pubDate = getTag('pubDate');

    if (title && link && pubDate) {
      items.push({
        title,
        link,
        description: getTag('description')?.replace(/<[^>]*>/g, '').substring(0, 500) || undefined,
        pubDate,
        guid: getTag('guid') || link,
      });
    }
  }

  return items;
}

export async function fetchAndStoreArticles(): Promise<{
  fetched: number;
  stored: number;
  errors: string[]
}> {
  let totalFetched = 0;
  let totalStored = 0;
  const errors: string[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'FilmMyRun/1.0 (News Aggregator)',
        },
      });

      if (!response.ok) {
        errors.push(`${feed.name}: HTTP ${response.status}`);
        continue;
      }

      const xml = await response.text();
      const items = parseRSS(xml);
      totalFetched += items.length;

      // Store each article (upsert to avoid duplicates)
      for (const item of items) {
        try {
          const pubDate = new Date(item.pubDate);

          // Skip articles older than 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (pubDate < thirtyDaysAgo) continue;

          await prisma.articles.upsert({
            where: { guid: item.guid || item.link },
            update: {
              title: item.title,
              description: item.description,
              pub_date: pubDate,
            },
            create: {
              guid: item.guid || item.link,
              title: item.title,
              link: item.link,
              description: item.description,
              pub_date: pubDate,
              source: feed.name,
              category: feed.category,
            },
          });
          totalStored++;
        } catch (err) {
          // Duplicate or other error - skip
        }
      }
    } catch (err) {
      errors.push(`${feed.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Clean up old articles (older than 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  await prisma.articles.deleteMany({
    where: {
      pub_date: { lt: thirtyDaysAgo },
    },
  });

  return { fetched: totalFetched, stored: totalStored, errors };
}

export async function getArticles(days: number = 14, limit: number = 50) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.articles.findMany({
    where: {
      pub_date: { gte: since },
    },
    orderBy: {
      pub_date: 'desc',
    },
    take: limit,
  });
}
