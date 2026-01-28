import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://filmmyrun.co.uk';

  // Static pages
  const staticPages = [
    '',
    '/about',
    '/blog',
    '/contact',
    '/films',
    '/races',
    '/shop',
    '/training',
    '/tools/calculators',
    '/tools/parkrun',
    '/tools/race-map',
  ];

  const staticRoutes = staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: (route === '/blog' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    priority: route === '' ? 1 : route === '/blog' ? 0.9 : 0.8,
  }));

  // TODO: Add dynamic blog posts from database
  // const posts = await prisma.posts.findMany({ select: { slug: true, updated_at: true } });
  // const blogRoutes = posts.map((post) => ({
  //   url: `${baseUrl}/blog/${post.slug}`,
  //   lastModified: post.updated_at,
  //   changeFrequency: 'monthly' as const,
  //   priority: 0.7,
  // }));

  // TODO: Add dynamic shop products from database
  // const products = await prisma.products.findMany({ select: { slug: true, updated_at: true } });
  // const shopRoutes = products.map((product) => ({
  //   url: `${baseUrl}/shop/${product.slug}`,
  //   lastModified: product.updated_at,
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.6,
  // }));

  return [
    ...staticRoutes,
    // ...blogRoutes,
    // ...shopRoutes,
  ];
}
