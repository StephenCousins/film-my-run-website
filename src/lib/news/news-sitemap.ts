interface StoryForNewsSitemap {
  slug: string;
  title: string;
  publishedAt: Date;
}

const WINDOW_MS = 48 * 60 * 60 * 1000;
const MAX_URLS = 1000;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Google News sitemap XML for stories published within the last 48 hours of `now`, newest first, capped at 1000. */
export function buildNewsSitemap(stories: StoryForNewsSitemap[], now: Date): string {
  const cutoff = now.getTime() - WINDOW_MS;
  const recent = stories
    .filter((s) => s.publishedAt.getTime() >= cutoff)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, MAX_URLS);

  const urls = recent
    .map(
      (s) => `<url><loc>https://filmmyrun.com/news/${s.slug}</loc><news:news><news:publication><news:name>Film My Run</news:name><news:language>en</news:language></news:publication><news:publication_date>${s.publishedAt.toISOString()}</news:publication_date><news:title>${escapeXml(s.title)}</news:title></news:news></url>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls}</urlset>`;
}
