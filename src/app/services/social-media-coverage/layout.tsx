import { Metadata } from 'next';
import { DEFAULT_OG_IMAGES } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Social Media Coverage',
  alternates: { canonical: 'https://filmmyrun.com/services/social-media-coverage' },
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
    images: DEFAULT_OG_IMAGES,
  },
};

export default function SocialMediaCoverageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
