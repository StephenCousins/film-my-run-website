import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/', '/login', '/register'],
      },
    ],
    sitemap: 'https://filmmyrun.com/sitemap.xml',
  };
}
