import { Metadata } from 'next';
import { DEFAULT_OG_IMAGES } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Race Map',
  alternates: { canonical: 'https://filmmyrun.com/tools/race-map' },
  description:
    'Visualize race routes with elevation profiles, distance markers, and key waypoints. Upload a GPX file or explore sample routes from famous races.',
  keywords: [
    'race map',
    'GPX viewer',
    'elevation profile',
    'running route',
    'race visualization',
  ],
  openGraph: {
    title: 'Race Map | Film My Run',
    description: 'Visualize race routes with elevation profiles and markers.',
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
