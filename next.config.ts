import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    remotePatterns: [
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
    ],
  },

  // Redirects for old WordPress URLs
  async redirects() {
    return [
      // Old image paths
      {
        source: '/wp-content/uploads/:path*',
        destination: 'https://images.filmmyrun.co.uk/uploads/:path*',
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

export default nextConfig;
