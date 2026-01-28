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
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/og/parkrun-og.jpg'],
  },
};

export default function ParkrunLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
