import { Metadata } from 'next';
import { DEFAULT_OG_IMAGES } from '@/lib/og';

export const metadata: Metadata = {
  title: 'parkrun Statistics',
  alternates: { canonical: 'https://filmmyrun.com/tools/parkrun' },
  description:
    "Every parkrun Stephen Cousins has run: the times, the venues and how his 5K has changed over the years.",
  keywords: [
    'parkrun',
    'parkrun stats',
    'parkrun history',
    'parkrun athlete',
    '5K running',
  ],
  openGraph: {
    title: 'parkrun Statistics | Film My Run',
    description: 'Every parkrun Stephen has run, with times and venues.',
    images: DEFAULT_OG_IMAGES,
  },
};

export default function ParkrunLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
