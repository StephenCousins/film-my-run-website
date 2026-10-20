import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/shop/ProductCard';
import ChristmasBanner from '@/components/shop/ChristmasBanner';
import { getShopItem, type ShopItem } from '@/lib/shop';
import { GUIDE_SECTIONS, LAST_ORDER_ABROAD, LAST_ORDER_UK, orderByLabel } from '@/lib/shop/christmas';

export const revalidate = 3600; // the banner and dates hide themselves after the last order date

export const metadata: Metadata = {
  title: 'Christmas Gifts for Runners: Funny Running T-Shirts',
  description: 'Funny running t-shirts, hoodies, mugs and totes for the ultra runner, the marathon runner, the parkrunner and the one who is mostly there for the cake. Made to order in the UK.',
  alternates: { canonical: 'https://filmmyrun.com/shop/christmas' },
  openGraph: {
    title: 'Christmas Gifts for Runners | Film My Run',
    description: 'Funny running t-shirts for every kind of runner. Every phrase was said out loud, on camera, mid-race.',
  },
};

export default function ChristmasGuidePage() {
  const sections = GUIDE_SECTIONS.map((s) => ({ ...s, items: s.slugs.map(getShopItem).filter((i): i is ShopItem => !!i) }));
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <ChristmasBanner guideLink={false} />
        <section className="py-12 lg:py-16">
          <div className="container max-w-3xl">
            <nav className="text-sm text-secondary mb-6"><Link href="/shop" className="hover:text-[#f88c00]">Shop</Link> / Christmas gift guide</nav>
            <h1 className="font-display text-4xl lg:text-5xl font-bold text-foreground">Christmas gifts for runners</h1>
            <p className="text-lg text-secondary mt-5 leading-relaxed">
              Buying for a runner is hard. They already have the watch. They have far too many medals. So get them
              something that says what they actually said at mile 20. Every phrase on these shirts was said out loud,
              on camera, somewhere between a start line and a finish line.
            </p>
            <p className="text-secondary mt-4">
              Free UK delivery over £45. Order tees, hoodies and totes by {orderByLabel(LAST_ORDER_UK)}, and caps,
              mugs and posters by {orderByLabel(LAST_ORDER_ABROAD)}, for delivery before Christmas.
            </p>
          </div>
        </section>
        {sections.map((s) => (
          <section key={s.title} className="pb-14">
            <div className="container">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground">{s.title}</h2>
              <p className="text-secondary mt-2 mb-6 max-w-2xl">{s.blurb}</p>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {s.items.map((item) => <ProductCard key={item.slug} item={item} />)}
              </div>
            </div>
          </section>
        ))}
        <section className="pb-20">
          <div className="container text-center">
            <Link href="/shop" className="inline-block px-6 py-3 rounded-full bg-[#f88c00] text-black font-semibold hover:opacity-90">See everything in the shop</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
