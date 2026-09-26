import * as cheerio from 'cheerio';
import { prisma } from '@/lib/db';
import { fetchAndStoreArticles } from '@/lib/rss-fetcher';
import { NEWS_CONFIG } from './config';
import type { Candidate } from './types';

/** The article's words, main photo and photo credit from its page. */
export function extractPage(html: string, pageUrl: string, site: string) {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, aside, form, .comments, .related, .newsletter, .share, .sidebar').remove();
  const body = $('article').first().length ? $('article').first() : $('main').first();
  const paragraphs = body.find('p').map((_, p) => $(p).text().trim()).get().filter((t) => t.length > 40);
  const text = paragraphs.length >= 3 ? paragraphs.join('\n\n') : null;

  const og = $('meta[property="og:image"]').attr('content') ?? null;
  const first = body.find('img').first().attr('src') ?? null;
  const rawImage = og ?? first;
  const imageUrl = rawImage ? new URL(rawImage, pageUrl).toString() : null;

  // Credits live in a figure caption or a "Photo:" line; keep it short and plain.
  const caption = body.find('figcaption').first().text().trim();
  const match = (caption || body.text()).match(/(?:photo|image)(?:\s*credit)?\s*[:©]\s*([^|.\n]{3,60})/i);
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
      summary: a.description ?? '', text: page.text, imageUrl: page.imageUrl ?? a.image_url, photoCredit: page.photoCredit,
    });
  }
  return out;
}
