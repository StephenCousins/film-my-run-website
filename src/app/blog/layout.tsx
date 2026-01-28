import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
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
    images: ['https://images.filmmyrun.co.uk/og/blog-og.jpg'],
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
