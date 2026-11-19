import { Metadata } from 'next';
import { DEFAULT_OG_IMAGES } from '@/lib/og';

export const metadata: Metadata = {
  title: 'How Fast Am I?',
  alternates: { canonical: 'https://filmmyrun.com/tools/how-fast-am-i' },
  description:
    'Find out how your running pace compares to other runners. Enter your race time to see your percentile ranking across 5K, 10K, half marathon, and marathon distances.',
  keywords: [
    'running percentile',
    'how fast am I',
    'pace comparison',
    'runner ranking',
    'race time percentile',
  ],
  openGraph: {
    title: 'How Fast Am I? | Film My Run',
    description:
      'See how your running pace compares to other runners. Enter a race time and find your percentile.',
    images: DEFAULT_OG_IMAGES,
  },
};

export default function HowFastAmILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
