import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'parkrun Statistics',
  description:
    'Track your parkrun history, compare performances, and visualize your progress over time. Enter your athlete ID to view all your parkrun runs.',
  keywords: [
    'parkrun',
    'parkrun stats',
    'parkrun history',
    'parkrun athlete',
    '5K running',
  ],
  openGraph: {
    title: 'parkrun Statistics | Film My Run',
    description: 'Track your parkrun history and visualize your progress.',
    images: ['https://images.filmmyrun.co.uk/og/parkrun-og.jpg'],
  },
};

export default function ParkrunLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
