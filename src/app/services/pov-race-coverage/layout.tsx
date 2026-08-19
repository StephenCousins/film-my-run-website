import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'POV Race Coverage',
  alternates: { canonical: 'https://filmmyrun.com/services/pov-race-coverage' },
  description:
    'Professional first-person race videography that puts viewers in the heart of the action. POV camera coverage for trail races, ultras, and running events across the UK.',
  keywords: [
    'POV race video',
    'race coverage',
    'running event filming',
    'trail race video',
    'first person race film',
  ],
  openGraph: {
    title: 'POV Race Coverage | Film My Run',
    description:
      'Professional first-person race videography for trail races, ultras, and running events.',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/og/pov-race-coverage-og.jpg'],
  },
};

export default function POVRaceCoverageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
