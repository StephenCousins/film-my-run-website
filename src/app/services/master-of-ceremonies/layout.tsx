import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Master of Ceremonies',
  alternates: { canonical: 'https://filmmyrun.com/services/master-of-ceremonies' },
  description:
    'Experienced MC for trail races, ultra-marathons, and running events. Energetic commentary and event hosting from a runner who understands the sport inside out.',
  keywords: [
    'race MC',
    'master of ceremonies',
    'running event host',
    'trail race MC',
    'event commentary',
  ],
  openGraph: {
    title: 'Master of Ceremonies | Film My Run',
    description:
      'Experienced MC for trail races, ultra-marathons, and running events across the UK.',
    images: [
      'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/og/master-of-ceremonies-og.jpg',
    ],
  },
};

export default function MasterOfCeremoniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
