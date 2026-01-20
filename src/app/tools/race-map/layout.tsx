import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Race Map',
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
    images: ['/images/race-map-og.jpg'],
  },
};

export default function RaceMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
