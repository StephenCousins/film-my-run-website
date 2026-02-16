import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marathon Training Plans',
  alternates: { canonical: 'https://filmmyrun.co.uk/training' },
  description:
    'Personalised marathon and half marathon training plans built around your schedule and fitness level. Structured programmes with pacing guidance from an experienced ultra-runner.',
  keywords: [
    'marathon training plan',
    'half marathon plan',
    'running training programme',
    'personalised training',
    'marathon preparation',
  ],
  openGraph: {
    title: 'Marathon Training Plans | Film My Run',
    description:
      'Personalised marathon and half marathon training plans built around your schedule and fitness.',
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
