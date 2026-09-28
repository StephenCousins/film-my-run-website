import { prisma } from '@/lib/db';
import { buildNewsSitemap } from '@/lib/news/news-sitemap';

// Built at request time: the database isn't reachable from the build
// container, and Google News wants a fresh, request-time view anyway.
export const dynamic = 'force-dynamic';

export async function GET() {
  let stories: { slug: string; title: string; published_at: Date | null }[] = [];
  try {
    stories = await prisma.news_stories.findMany({
      where: { status: 'published', published_at: { not: null } },
      select: { slug: true, title: true, published_at: true },
    });
  } catch (error) {
    console.error('news-sitemap: failed to load stories', error);
  }

  const xml = buildNewsSitemap(
    stories.map((s) => ({ slug: s.slug, title: s.title, publishedAt: s.published_at as Date })),
    new Date()
  );

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
