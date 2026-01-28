import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Films',
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
    images: ['https://images.filmmyrun.co.uk/og/films-og.jpg'],
  },
};

export default function FilmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
