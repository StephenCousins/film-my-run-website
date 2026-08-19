import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Coverage',
  alternates: { canonical: 'https://filmmyrun.com/live' },
  description:
    'Watch live race coverage and real-time updates from trail races, ultra-marathons, and running events. Live streams, tracking, and commentary from Film My Run.',
  keywords: [
    'live race coverage',
    'race live stream',
    'running event live',
    'ultra marathon live',
    'race tracking',
  ],
  openGraph: {
    title: 'Live Coverage | Film My Run',
    description:
      'Watch live race coverage and real-time updates from trail races and ultra-marathons.',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/og/live-og.jpg'],
  },
};

export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
