import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop',
  alternates: { canonical: 'https://filmmyrun.co.uk/shop' },
  description:
    'The Film My Run shop is coming soon. Running gear, apparel, and accessories designed by runners, for runners.',
  openGraph: {
    title: 'Shop | Film My Run',
    description: 'Gear designed by runners, for runners.',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/og/shop-og.jpg'],
  },
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
