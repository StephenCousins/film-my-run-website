import * as cheerio from 'cheerio';
import { prisma } from '@/lib/db';
import { fetchAndStoreArticles, SOURCE_PLACEHOLDERS } from '@/lib/rss-fetcher';
import { NEWS_CONFIG } from './config';
import type { Candidate } from './types';

const PLACEHOLDER_IMAGE_URLS = new Set(Object.values(SOURCE_PLACEHOLDERS));

/**
 * A feed image is untrustworthy as a fallback when it's one of the stock
 * Unsplash placeholders rss-fetcher fills in for feeds without their own
 * images: that photo has nothing to do with the story, so crediting it (via
 * the image step's source-image heuristics) would be a false credit.
 */
function isPlaceholderImage(url: string): boolean {
  return url.includes('images.unsplash.com') || PLACEHOLDER_IMAGE_URLS.has(url);
}

/** The page's own image if it found one; otherwise the feed's image, unless that's a stock placeholder. */
export function pickImageUrl(pageImageUrl: string | null, feedImageUrl: string | null): string | null {
  if (pageImageUrl) return pageImageUrl;
  if (feedImageUrl && !isPlaceholderImage(feedImageUrl)) return feedImageUrl;
  return null;
}

/** The article's words, main photo and photo credit from its page. */
export function extractPage(html: string, pageUrl: string, site: string) {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, aside, form, .comments, .related, .newsletter, .share, .sidebar').remove();
  const body = $('article').first().length ? $('article').first() : $('main').first();

  // Read the caption before excluding its paragraph below, so its "Photo: ..." credit
  // isn't lost along with it. WordPress captions land as a <p class="wp-caption-text">
  // inside a <div class="wp-caption">, not always inside a <figcaption>.
  const caption = body.find('figcaption, .wp-caption-text, .wp-element-caption').first().text().trim();

  // Caption paragraphs are credit lines, not article prose — keep them out of the text.
  const paragraphs = body.find('p')
    .filter((_, p) => $(p).closest('figcaption, .wp-caption, .wp-caption-text, figure').length === 0)
    .map((_, p) => $(p).text().trim())
    .get()
    .filter((t) => t.length > 40);
  const text = paragraphs.length >= 3 ? paragraphs.join('\n\n') : null;

  const og = $('meta[property="og:image"]').attr('content') ?? null;
  const first = body.find('img').first().attr('src') ?? null;
  const rawImage = og ?? first;
  const imageUrl = rawImage ? new URL(rawImage, pageUrl).toString() : null;

  // Credits live in a figure caption or a "Photo:" line; keep it short and plain.
  // A dot may sit inside a handle or domain (@rising.story, irunfar.com) so it's only
  // a boundary when followed by whitespace, same as a sentence ending would be.
  const match = (caption || body.text()).match(/(?:photo|image)(?:\s*credit)?\s*[:©]\s*((?:[^|.\n]|\.(?=\S)){3,60})/i);
  const photoCredit = match ? match[1].trim() : null;
  void site;
  return { text, imageUrl, photoCredit };
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'FilmMyRun-News/1.0 (+https://filmmyrun.com)' }, signal: AbortSignal.timeout(15000) });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** Refresh the feeds, then every item of the last 14 days not yet looked at, with its page read. */
export async function gatherCandidates(now: Date): Promise<Candidate[]> {
  await fetchAndStoreArticles();
  const since = new Date(now.getTime() - NEWS_CONFIG.windowDays * 86_400_000);
  const seen = new Set((await prisma.news_items.findMany({ select: { article_id: true } })).map((r) => r.article_id));
  const articles = await prisma.articles.findMany({ where: { pub_date: { gte: since } }, orderBy: { pub_date: 'desc' } });
  const out: Candidate[] = [];
  for (const a of articles.filter((a) => !seen.has(a.id))) {
    const html = await fetchHtml(a.link);
    const page = html ? extractPage(html, a.link, a.source) : { text: null, imageUrl: null, photoCredit: null };
    out.push({
      articleId: a.id, url: a.link, source: a.source, title: a.title, pubDate: a.pub_date,
      summary: a.description ?? '', text: page.text, imageUrl: pickImageUrl(page.imageUrl, a.image_url), photoCredit: page.photoCredit,
    });
  }
  return out;
}
