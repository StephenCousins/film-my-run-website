import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Race Dashboard',
  alternates: { canonical: 'https://filmmyrun.com/races' },
  description:
    'Every race Stephen has run since 2012, marathons and ultras, with times, positions and analysis.',
  keywords: [
    'race results',
    'marathon times',
    'ultra marathon results',
    'running statistics',
    'race history',
  ],
  openGraph: {
    title: 'Race Dashboard | Film My Run',
    description: 'Every race since 2012: times, positions and progress.',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/og/races-og.jpg'],
  },
};

export default function RacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
