import prisma from './db';
import Parser from 'rss-parser';

// Custom parser with media extensions
type CustomFeed = {
  title: string;
  link: string;
  description: string;
};

type CustomItem = {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  guid: string;
  isoDate: string;
  // Media extensions - various ways feeds include images
  'media:content'?: { $: { url: string } };
  'media:thumbnail'?: { $: { url: string } };
  enclosure?: { url: string; type?: string };
  'content:encoded'?: string;
};

const parser: Parser<CustomFeed, CustomItem> = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content'],
      ['media:thumbnail', 'media:thumbnail'],
      ['content:encoded', 'content:encoded'],
    ],
  },
});

// RSS Feed sources
const RSS_FEEDS = [
  // Trail & Ultra
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
  // General Running
  {
    name: 'Canadian Running',
    url: 'https://runningmagazine.ca/feed/',
    category: 'running',
  },
  {
    name: 'LetsRun',
    url: 'https://www.letsrun.com/feed/',
    category: 'running',
  },
  {
    name: "Runner's World UK",
    url: 'https://www.runnersworld.com/uk/rss/all.xml/',
    category: 'running',
  },
  // UK-specific
  {
    name: 'Athletics Weekly',
    url: 'https://athleticsweekly.com/feed/',
    category: 'athletics',
  },
  {
    name: 'RunABC South',
    url: 'https://runabc.co.uk/feeds/south-news',
    category: 'running',
  },
  {
    name: 'RunABC Scotland',
    url: 'https://runabc.co.uk/feeds/scotland-news',
    category: 'running',
  },
  // Podcasts (show notes)
  {
    name: 'Trail Runner Nation',
    url: 'https://trailrunnernation.libsyn.com/rss',
    category: 'podcast',
  },
  {
    name: 'Some Work All Play',
    url: 'https://anchor.fm/s/9abbbe4/podcast/rss',
    category: 'podcast',
  },
];

/**
 * Check if URL is a valid image (not a video embed)
 */
function isValidImageUrl(url: string): boolean {
  if (!url) return false;

  const invalidPatterns = [
    /youtube\.com\/embed/i,
    /youtube\.com\/watch/i,
    /youtu\.be\//i,
    /vimeo\.com\/\d/i,
    /player\./i,
    /\.mp4$/i,
    /\.webm$/i,
    /\.mov$/i,
  ];

  return !invalidPatterns.some(pattern => pattern.test(url));
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(content: string): string | null {
  const patterns = [
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Extract image URL from RSS item using various methods
 */
function extractImageUrl(item: CustomItem): string | null {
  // Method 1: media:content (most common)
  if (item['media:content']?.$?.url && isValidImageUrl(item['media:content'].$.url)) {
    return item['media:content'].$.url;
  }

  // Method 2: media:thumbnail
  if (item['media:thumbnail']?.$?.url && isValidImageUrl(item['media:thumbnail'].$.url)) {
    return item['media:thumbnail'].$.url;
  }

  // Method 3: enclosure (for podcasts/media feeds)
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/') && isValidImageUrl(item.enclosure.url)) {
    return item.enclosure.url;
  }

  // Method 4: Extract first image from content:encoded or content
  const contentToSearch = item['content:encoded'] || item.content || '';
  const imgMatches = contentToSearch.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);

  for (const match of imgMatches) {
    if (match[1] && isValidImageUrl(match[1])) {
      return match[1];
    }
  }

  // Method 5: If content has YouTube embed, use YouTube thumbnail
  const youtubeId = extractYouTubeId(contentToSearch);
  if (youtubeId) {
    return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  return null;
}

/**
 * Clean description text - remove HTML tags and truncate
 */
function cleanDescription(text: string | undefined, maxLength = 300): string | undefined {
  if (!text) return undefined;

  // Remove HTML tags
  const cleaned = text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= maxLength) return cleaned;

  // Truncate at word boundary
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

export async function fetchAndStoreArticles(): Promise<{
  fetched: number;
  stored: number;
  errors: string[];
}> {
  let totalFetched = 0;
  let totalStored = 0;
  const errors: string[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const feedData = await parser.parseURL(feed.url);
      totalFetched += feedData.items.length;

      for (const item of feedData.items) {
        try {
          const pubDate = item.isoDate ? new Date(item.isoDate) : new Date(item.pubDate);

          // Skip articles older than 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (pubDate < thirtyDaysAgo) continue;

          // Skip if missing required fields
          if (!item.title || !item.link) continue;

          const imageUrl = extractImageUrl(item);
          const description = cleanDescription(item.contentSnippet || item.content);

          await prisma.articles.upsert({
            where: { guid: item.guid || item.link },
            update: {
              title: item.title,
              description,
              image_url: imageUrl,
              pub_date: pubDate,
            },
            create: {
              guid: item.guid || item.link,
              title: item.title,
              link: item.link,
              description,
              image_url: imageUrl,
              pub_date: pubDate,
              source: feed.name,
              category: feed.category,
            },
          });
          totalStored++;
        } catch (err) {
          // Log individual item errors but continue processing
          console.error(`Error storing article from ${feed.name}:`, err);
        }
      }
    } catch (err) {
      const errorMsg = `${feed.name}: ${err instanceof Error ? err.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('Feed fetch error:', errorMsg);
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
