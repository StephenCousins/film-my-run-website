import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentary Films',
  description:
    'Award-winning documentary films capturing the stories behind running events, ultra-marathons, and the running community. Professional filmmaking for races and events.',
  keywords: [
    'running documentary',
    'race film',
    'ultra marathon documentary',
    'running event film',
    'documentary filmmaker',
  ],
  openGraph: {
    title: 'Documentary Films | Film My Run',
    description:
      'Award-winning documentary films capturing the stories behind running events and ultra-marathons.',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/og/documentary-films-og.jpg'],
  },
};

export default function DocumentaryFilmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
