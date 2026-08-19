import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Runner Discounts',
  alternates: { canonical: 'https://filmmyrun.com/discounts' },
  description:
    'Exclusive discount codes for runners. Save on race entries, running gear, nutrition, and accessories from top brands and event organisers.',
  keywords: [
    'running discounts',
    'race entry codes',
    'runner deals',
    'running gear discounts',
    'race discount codes',
  ],
  openGraph: {
    title: 'Runner Discounts | Film My Run',
    description:
      'Exclusive discount codes for race entries, running gear, nutrition, and accessories.',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/og/discounts-og.jpg'],
  },
};

export default function DiscountsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
