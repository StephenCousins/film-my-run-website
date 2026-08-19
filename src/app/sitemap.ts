import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://filmmyrun.com';

  // Static pages with individual priorities
  const staticPages: { route: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }[] = [
    { route: '', changeFrequency: 'weekly', priority: 1 },
    { route: '/blog', changeFrequency: 'daily', priority: 0.9 },
    { route: '/training', changeFrequency: 'weekly', priority: 0.9 },
    { route: '/services', changeFrequency: 'monthly', priority: 0.8 },
    { route: '/services/pov-race-coverage', changeFrequency: 'monthly', priority: 0.8 },
    { route: '/services/documentary-films', changeFrequency: 'monthly', priority: 0.8 },
    { route: '/services/master-of-ceremonies', changeFrequency: 'monthly', priority: 0.8 },
    { route: '/services/event-live-streaming', changeFrequency: 'monthly', priority: 0.8 },
    { route: '/services/social-media-coverage', changeFrequency: 'monthly', priority: 0.8 },
    { route: '/about', changeFrequency: 'monthly', priority: 0.8 },
    { route: '/contact', changeFrequency: 'monthly', priority: 0.8 },
    { route: '/films', changeFrequency: 'monthly', priority: 0.8 },
    { route: '/races', changeFrequency: 'weekly', priority: 0.8 },
    { route: '/shop', changeFrequency: 'weekly', priority: 0.8 },
    { route: '/tools', changeFrequency: 'monthly', priority: 0.7 },
    { route: '/tools/calculators', changeFrequency: 'monthly', priority: 0.7 },
    { route: '/tools/parkrun', changeFrequency: 'monthly', priority: 0.7 },
    { route: '/tools/race-map', changeFrequency: 'monthly', priority: 0.7 },
    { route: '/tools/route-comparison', changeFrequency: 'monthly', priority: 0.7 },
    { route: '/tools/how-fast-am-i', changeFrequency: 'monthly', priority: 0.7 },
    { route: '/discounts', changeFrequency: 'weekly', priority: 0.6 },
    { route: '/live', changeFrequency: 'weekly', priority: 0.6 },
    { route: '/news', changeFrequency: 'weekly', priority: 0.6 },
    { route: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
    { route: '/terms', changeFrequency: 'monthly', priority: 0.3 },
  ];

  const staticRoutes = staticPages.map((page) => ({
    url: `${baseUrl}${page.route}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  // Dynamic blog posts
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await prisma.posts.findMany({
      where: { status: 'published' },
      select: { slug: true, updated_at: true },
    });
    blogRoutes = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updated_at,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
  } catch {
    // Database may not be available during build
  }

  // Dynamic news stories
  let newsRoutes: MetadataRoute.Sitemap = [];
  try {
    const stories = await prisma.news_stories.findMany({
      where: { status: 'published' },
      select: { slug: true, updated_at: true },
    });
    newsRoutes = stories.map((story) => ({
      url: `${baseUrl}/news/${story.slug}`,
      lastModified: story.updated_at,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {
    // Database may not be available during build
  }

  // Dynamic film pages
  let filmRoutes: MetadataRoute.Sitemap = [];
  try {
    const films = await prisma.films.findMany({
      select: { slug: true, created_at: true },
    });
    filmRoutes = films.map((film) => ({
      url: `${baseUrl}/films/${film.slug}`,
      lastModified: film.created_at,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));
  } catch {
    // Database may not be available during build
  }

  return [
    ...staticRoutes,
    ...blogRoutes,
    ...newsRoutes,
    ...filmRoutes,
  ];
}
