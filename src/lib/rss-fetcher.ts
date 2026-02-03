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
  'media:content'?: {
    $: { url: string };
    'media:thumbnail'?: [{ $: { url: string } }];
  };
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

// Placeholder images for sources without images in their RSS
// TODO: Replace with custom branded images in R2
const SOURCE_PLACEHOLDERS: Record<string, string> = {
'Athletics Weekly': 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80', // Track athletics
  'RunABC South': 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80', // Running
  'RunABC Scotland': 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80', // Scottish landscape run
  'LetsRun': 'https://images.unsplash.com/photo-1461896836934-bd45ba4d36e1?w=800&q=80', // Track running
};

// Keywords for filtering broad feeds (matched case-insensitively against title + description)
const RUNNING_KEYWORDS = [
  'marathon', 'running', 'runner', 'run ', 'runs ', 'ran ',
  'ultra', 'trail', 'cross country', 'cross-country',
  'parkrun', 'half marathon', 'half-marathon',
  '5k', '10k', '5,000m', '10,000m', '5000m', '10000m',
  'steeplechase', 'mile ', 'miler', '1500m', '800m', '3000m',
  'relay', 'distance', 'endurance',
  'london marathon', 'boston marathon', 'chicago marathon',
  'great north run', 'comrades',
];

/**
 * Check if an article matches keyword filters.
 * Returns true if no keywords are configured (no filtering needed)
 * or if any keyword is found in the title or description.
 */
function matchesKeywords(title: string, description: string, keywords?: string[]): boolean {
  if (!keywords) return true;
  const text = `${title} ${description}`.toLowerCase();
  return keywords.some((kw) => text.includes(kw.toLowerCase()));
}

// RSS Feed sources
const RSS_FEEDS = [
  // Trail & Ultra
  {
    name: 'iRunFar',
    url: 'https://www.irunfar.com/feed',
    category: 'trail',
  },
  {
    name: 'Trail Runner Magazine',
    url: 'https://www.trailrunnermag.com/feed/',
    category: 'trail',
  },
  {
    name: 'Freetrail',
    url: 'https://freetrail.com/feed/',
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
    category: 'athletics',
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
  // Athletics (keyword-filtered — BBC's feed is broad)
  {
    name: 'BBC Sport',
    url: 'https://feeds.bbci.co.uk/sport/athletics/rss.xml',
    category: 'athletics',
    keywords: RUNNING_KEYWORDS,
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
  // Method 1: media:thumbnail nested inside media:content (LetsRun style)
  const nestedThumbnail = item['media:content']?.['media:thumbnail']?.[0]?.$?.url;
  if (nestedThumbnail && isValidImageUrl(nestedThumbnail)) {
    return nestedThumbnail;
  }

  // Method 2: media:content direct URL (if it's an image)
  if (item['media:content']?.$?.url && isValidImageUrl(item['media:content'].$.url)) {
    return item['media:content'].$.url;
  }

  // Method 3: media:thumbnail at root level
  if (item['media:thumbnail']?.$?.url && isValidImageUrl(item['media:thumbnail'].$.url)) {
    return item['media:thumbnail'].$.url;
  }

  // Method 4: enclosure (for podcasts/media feeds)
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/') && isValidImageUrl(item.enclosure.url)) {
    return item.enclosure.url;
  }

  // Method 5: Extract first image from content:encoded or content
  const contentToSearch = item['content:encoded'] || item.content || '';
  const imgMatches = contentToSearch.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);

  for (const match of imgMatches) {
    if (match[1] && isValidImageUrl(match[1])) {
      return match[1];
    }
  }

  // Method 6: If content has YouTube embed, use YouTube thumbnail
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

          // Skip articles that don't match keyword filters (for broad feeds like BBC)
          const snippetText = item.contentSnippet || item.content || '';
          if (!matchesKeywords(item.title, snippetText, feed.keywords)) continue;

          const imageUrl = extractImageUrl(item) || SOURCE_PLACEHOLDERS[feed.name] || null;
          const description = cleanDescription(item.contentSnippet || item.content);

          // Prefer the full permalink (item.link) over the short guid (item.guid)
          // Some feeds first return ?p=123 then later the full slug URL
          const articleLink = item.link || item.guid;
          const articleGuid = item.guid || item.link;

          // Check if an article with the same title+source already exists
          // This catches duplicates where the URL changed between syncs
          const existing = await prisma.articles.findFirst({
            where: {
              title: item.title,
              source: feed.name,
            },
          });

          if (existing) {
            // Update the existing record (prefer the full permalink URL)
            const bestLink = articleLink.includes('?p=') ? (existing.link.includes('?p=') ? articleLink : existing.link) : articleLink;
            const bestGuid = bestLink;
            await prisma.articles.update({
              where: { id: existing.id },
              data: {
                guid: bestGuid,
                link: bestLink,
                description,
                image_url: imageUrl,
                pub_date: pubDate,
              },
            });
          } else {
            // New article - insert it
            await prisma.articles.create({
              data: {
                guid: articleGuid,
                title: item.title,
                link: articleLink,
                description,
                image_url: imageUrl,
                pub_date: pubDate,
                source: feed.name,
                category: feed.category,
              },
            });
          }
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

// Category priority for sorting (lower = higher priority)
const CATEGORY_PRIORITY: Record<string, number> = {
  trail: 1,
  ultra: 1,
  running: 2,
  athletics: 3,
};

export async function getArticles(days: number = 14, limit: number = 50) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const articles = await prisma.articles.findMany({
    where: {
      pub_date: { gte: since },
    },
    orderBy: {
      pub_date: 'desc',
    },
    take: limit * 2, // Fetch more to allow for sorting
  });

  // Sort by category priority first, then by date
  const sorted = articles.sort((a, b) => {
    const priorityA = CATEGORY_PRIORITY[a.category || 'running'] || 5;
    const priorityB = CATEGORY_PRIORITY[b.category || 'running'] || 5;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Same priority - sort by date (newest first)
    return new Date(b.pub_date).getTime() - new Date(a.pub_date).getTime();
  });

  return sorted.slice(0, limit);
}
