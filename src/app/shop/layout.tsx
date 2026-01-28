import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Gear designed by runners, for runners. Quality equipment tested on trails and roads around the world. Running caps, vests, apparel, and accessories.',
  keywords: [
    'running gear',
    'running cap',
    'running vest',
    'trail running equipment',
    'running accessories',
  ],
  openGraph: {
    title: 'Shop | Film My Run',
    description: 'Gear designed by runners, for runners.',
    images: ['https://images.filmmyrun.co.uk/og/shop-og.jpg'],
  },
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
