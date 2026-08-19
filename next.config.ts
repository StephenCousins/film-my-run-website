import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    remotePatterns: [
      // Cloudflare R2 - primary image hosting
      {
        protocol: 'https',
        hostname: 'pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev',
        pathname: '/**',
      },
      // Future custom domain for R2
      {
        protocol: 'https',
        hostname: 'images.filmmyrun.co.uk',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'filmmyrun.co.uk',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'www.filmmyrun.co.uk',
        pathname: '/wp-content/uploads/**',
      },
      // Google profile pictures (OAuth)
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      // Gravatar (for email-based avatars)
      {
        protocol: 'https',
        hostname: '*.gravatar.com',
        pathname: '/**',
      },
      // Strava photos (cloudfront CDN)
      {
        protocol: 'https',
        hostname: 'dgtzuqphqg23d.cloudfront.net',
        pathname: '/**',
      },
      // YouTube thumbnails (film cards)
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
      // Unsplash (RSS feed placeholder images)
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },

  // Redirects for old WordPress URLs
  async redirects() {
    return [
      // www -> apex. Both hosts serve the site, and while the canonical tags
      // already point search engines at the bare domain, a 301 keeps the two
      // from being crawled as separate copies.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.filmmyrun.com' }],
        destination: 'https://filmmyrun.com/:path*',
        permanent: true,
      },
      // Old WordPress image paths. These live in R2 under wp-uploads/ — the
      // previous destination (images.filmmyrun.co.uk) was a custom domain that
      // was never set up, so every legacy image URL redirected to a dead host.
      {
        source: '/wp-content/uploads/:path*',
        destination:
          'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/wp-uploads/:path*',
        permanent: true,
      },
      // Old WordPress date-based permalinks
      {
        source: '/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug',
        destination: '/blog/:slug',
        permanent: true,
      },
      {
        source: '/:year(\\d{4})/:month(\\d{2})/:slug',
        destination: '/blog/:slug',
        permanent: true,
      },
      // Category pages
      {
        source: '/category/:slug',
        destination: '/blog?category=:slug',
        permanent: true,
      },
      // Tag pages
      {
        source: '/tag/:slug',
        destination: '/blog?tag=:slug',
        permanent: true,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Experimental features
  experimental: {
    // Enable React 19 features
  },
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map upload logs during build
  silent: true,
  // Disable source map upload (no auth token needed)
  sourcemaps: {
    disable: true,
  },
});
