import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Race Dashboard',
  description:
    'Track and analyze all race results. 174 races, 94 marathons, 80 ultras - explore the complete race history with times, positions, and analysis.',
  keywords: [
    'race results',
    'marathon times',
    'ultra marathon results',
    'running statistics',
    'race history',
  ],
  openGraph: {
    title: 'Race Dashboard | Film My Run',
    description: '174 races analyzed. Track times, positions, and progress.',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/og/races-og.jpg'],
  },
};

export default function RacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
