import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop',
  alternates: { canonical: 'https://filmmyrun.com/shop' },
  description:
    'Technical running vests and running t-shirts in breathable Sports Airflow fabric, cut and sewn in London, plus casual cotton tees, hoodies, tote bags, mugs and posters from Film My Run. Made to order in the UK.',
  openGraph: {
    title: 'Shop | Film My Run',
    description: 'Technical running vests and tees, plus casual cotton tees, hoodies, totes, mugs and posters. Made to order in the UK.',
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
