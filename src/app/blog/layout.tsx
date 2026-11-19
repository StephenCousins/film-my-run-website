import { Metadata } from 'next';
import { DEFAULT_OG_IMAGES } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Blog',
  alternates: { canonical: 'https://filmmyrun.com/blog' },
  description:
    'Race reports, training insights, gear reviews, and stories from 15 years of running. From marathons to ultras, trails to roads.',
  keywords: [
    'running blog',
    'race report',
    'marathon blog',
    'ultra running',
    'trail running blog',
    'running stories',
  ],
  openGraph: {
    title: 'Blog | Film My Run',
    description: 'Race reports, training insights, and stories from 15 years of running.',
    images: DEFAULT_OG_IMAGES,
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
