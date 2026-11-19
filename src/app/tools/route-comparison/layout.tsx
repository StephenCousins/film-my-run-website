import { Metadata } from 'next';
import { DEFAULT_OG_IMAGES } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Route Comparison Tool',
  alternates: { canonical: 'https://filmmyrun.com/tools/route-comparison' },
  description:
    'Compare two running routes side by side with elevation profiles and distance overlays. Upload GPX files to visualise and analyse route differences.',
  keywords: [
    'route comparison',
    'GPX compare',
    'running route tool',
    'elevation profile',
    'route analysis',
  ],
  openGraph: {
    title: 'Route Comparison Tool | Film My Run',
    description:
      'Compare running routes side by side with elevation profiles. Upload GPX files to analyse differences.',
    images: DEFAULT_OG_IMAGES,
  },
};

export default function RouteComparisonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
