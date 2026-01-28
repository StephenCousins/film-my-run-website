import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Running Calculators',
  description:
    'Free running calculators used by 250,000+ runners every week. Pace calculator, race predictor, splits calculator, age grading, VO2 max estimator, and more.',
  keywords: [
    'pace calculator',
    'running calculator',
    'race predictor',
    'splits calculator',
    'age grading calculator',
    'VO2 max calculator',
  ],
  openGraph: {
    title: 'Running Calculators | Film My Run',
    description:
      'Free tools used by 250,000+ runners weekly. Calculate pace, predict times, plan splits.',
    images: ['https://images.filmmyrun.co.uk/og/calculators-og.jpg'],
  },
};

export default function CalculatorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
