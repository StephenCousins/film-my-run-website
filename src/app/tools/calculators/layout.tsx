import { Metadata } from 'next';
import { DEFAULT_OG_IMAGES } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Running Calculators',
  alternates: { canonical: 'https://filmmyrun.com/tools/calculators' },
  description:
    'Free running calculators. Pace calculator, a race predictor built on 2.4 million real UK results, age grading, VO2 max estimator, and more.',
  keywords: [
    'pace calculator',
    'running calculator',
    'race predictor',
    'age grading calculator',
    'VO2 max calculator',
  ],
  openGraph: {
    title: 'Running Calculators | Film My Run',
    description:
      'Free running calculators. Calculate pace, predict race times, age-grade your results.',
    images: DEFAULT_OG_IMAGES,
  },
};

export default function CalculatorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
