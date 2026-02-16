import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Social Media Coverage',
  alternates: { canonical: 'https://filmmyrun.co.uk/services/social-media-coverage' },
  description:
    'Professional social media content creation for running events. Real-time race updates, stories, reels, and highlight clips to boost your event presence online.',
  keywords: [
    'race social media',
    'event content creation',
    'running event social media',
    'race highlights',
    'event reels',
  ],
  openGraph: {
    title: 'Social Media Coverage | Film My Run',
    description:
      'Professional social media content creation for running events and trail races.',
    images: [
      'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/og/social-media-coverage-og.jpg',
    ],
  },
};

export default function SocialMediaCoverageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
