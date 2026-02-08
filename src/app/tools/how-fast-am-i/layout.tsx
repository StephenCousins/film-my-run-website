import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How Fast Am I?',
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
    images: [
      'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/og/how-fast-am-i-og.jpg',
    ],
  },
};

export default function HowFastAmILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
