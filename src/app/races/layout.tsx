import { Metadata } from 'next';
import { DEFAULT_OG_IMAGES } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Race Dashboard',
  alternates: { canonical: 'https://filmmyrun.com/races' },
  description:
    'Track and analyze all race results. 182 races, 99 marathons, 83 ultras - explore the complete race history with times, positions, and analysis.',
  keywords: [
    'race results',
    'marathon times',
    'ultra marathon results',
    'running statistics',
    'race history',
  ],
  openGraph: {
    title: 'Race Dashboard | Film My Run',
    description: '182 races analyzed. Track times, positions, and progress.',
    images: DEFAULT_OG_IMAGES,
  },
};

export default function RacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
