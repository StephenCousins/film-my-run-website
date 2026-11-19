import { Metadata } from 'next';
import { DEFAULT_OG_IMAGES } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Race Map',
  alternates: { canonical: 'https://filmmyrun.com/tools/race-map' },
  description:
    "Every marathon and ultra Stephen Cousins has run, on one map. Click any route to see the race details.",
  keywords: [
    'race map',
    'GPX viewer',
    'elevation profile',
    'running route',
    'race visualization',
  ],
  openGraph: {
    title: 'Race Map | Film My Run',
    description: 'Every marathon and ultra Stephen has run, on one map.',
    images: DEFAULT_OG_IMAGES,
  },
};

export default function RaceMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
