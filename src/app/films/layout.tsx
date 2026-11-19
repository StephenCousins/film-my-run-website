import { Metadata } from 'next';
import { DEFAULT_OG_IMAGES } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Films',
  alternates: { canonical: 'https://filmmyrun.com/films' },
  description:
    'Award-winning running documentaries and race films. From ultra marathons to trail adventures, experience the stories behind the miles.',
  keywords: [
    'running documentary',
    'marathon film',
    'ultra running video',
    'trail running',
    'race film',
  ],
  openGraph: {
    title: 'Films | Film My Run',
    description: 'Award-winning running documentaries and race films.',
    images: DEFAULT_OG_IMAGES,
  },
};

export default function FilmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
