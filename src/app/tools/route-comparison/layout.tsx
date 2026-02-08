import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Route Comparison Tool',
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
    images: [
      'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/og/route-comparison-og.jpg',
    ],
  },
};

export default function RouteComparisonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
