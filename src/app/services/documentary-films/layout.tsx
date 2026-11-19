import { Metadata } from 'next';
import { DEFAULT_OG_IMAGES } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Documentary Films',
  alternates: { canonical: 'https://filmmyrun.com/services/documentary-films' },
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
    images: DEFAULT_OG_IMAGES,
  },
};

export default function DocumentaryFilmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
