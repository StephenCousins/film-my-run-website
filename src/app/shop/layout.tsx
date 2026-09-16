import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop',
  alternates: { canonical: 'https://filmmyrun.com/shop' },
  description:
    'Funny running t-shirts, hoodies, tote bags, mugs and posters from Film My Run. Every phrase was said out loud, on camera, somewhere between a start line and a finish line. Printed to order in the UK.',
  openGraph: {
    title: 'Shop | Film My Run',
    description: 'Running t-shirts, hoodies, totes, mugs and posters. Printed to order in the UK.',
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
