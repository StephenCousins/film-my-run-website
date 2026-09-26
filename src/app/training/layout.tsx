import { Metadata } from 'next';

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
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/og/training-og.jpg'],
  },
};

export default function TrainingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
