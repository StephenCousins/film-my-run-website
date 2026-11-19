import { Metadata } from 'next';
import { DEFAULT_OG_IMAGES } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Training Plans, 5K to 100 Miles',
  alternates: { canonical: 'https://filmmyrun.com/training' },
  description:
    'Free training plans from 5K to 100 miles in the Film My Run app, built to the 80/20 method: safe build-ups, a proper taper, ultras counted in hours, and paces from your own racing.',
  keywords: [
    'training plan',
    'marathon training plan',
    'half marathon plan',
    'ultra training plan',
    '100 mile training plan',
    '80/20 running',
  ],
  openGraph: {
    title: 'Training Plans, 5K to 100 Miles | Film My Run',
    description: 'Free training plans from 5K to 100 miles in the Film My Run app, built to the 80/20 method.',
    images: DEFAULT_OG_IMAGES,
  },
};

export default function TrainingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
