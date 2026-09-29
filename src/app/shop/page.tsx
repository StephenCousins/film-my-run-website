import Image from 'next/image';
import { ShoppingBag, Truck, Shirt, ExternalLink } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ShopGrid from '@/components/shop/ShopGrid';
import WelcomeOffer from '@/components/shop/WelcomeOffer';
import Link from 'next/link';
import { shopItems, shopCategories, etsyShopUrl } from '@/lib/shop';
import { typeById } from '@/lib/runner-quiz';
import { SHIRT_COLOURS, frontArt, teeMock } from '@/lib/runner-quiz/shirt-art';
import '@/styles/runner-quiz-fonts.css';

// Three fronts from the runner quiz, for the Runner Type Tee card.
const runnerTeeFronts = (['fell', 'lab', 'parkrun'] as const).map((id, i) => {
  const colour = (['Forest', 'Black', 'Navy'] as const)[i];
  return teeMock(SHIRT_COLOURS[colour], frontArt(typeById(id)!, colour));
});

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://filmmyrun.com' },
    { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://filmmyrun.com/shop' },
  ],
};

export default function ShopPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />

      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <section className="relative py-16 lg:py-24 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/films/utmb.jpg"
              alt="Trail runner on a mountain path"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-[rgb(var(--color-background))]" />
          </div>
          <div className="container relative z-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
                <ShoppingBag className="w-4 h-4 text-orange-500" />
                <span className="text-orange-400 text-sm font-medium">{shopItems.length} things to run in, wear, carry and drink from</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-5">The Shop</h1>
              <p className="text-lg text-zinc-300 leading-relaxed">
                The running vests and running t-shirts are technical kit: Sports Airflow fabric, breathable and
                quick-drying, cut and sewn to order in London. Everything after them is casual cotton. Every
                phrase was said out loud, on camera, somewhere between a start line and a finish line.
              </p>
            </div>
          </div>
        </section>

        <section className="py-10 lg:py-16">
          <div className="container">
            <Link
              href="/tools/runner-quiz"
              className="group mb-10 grid md:grid-cols-[1fr_auto] items-center gap-6 rounded-2xl border border-border bg-surface-secondary p-6 hover:border-brand transition-colors"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand mb-2">New · Runner Type Tee</p>
                <p className="font-display text-2xl lg:text-3xl font-bold text-foreground">A shirt with your Runner DNA on the back</p>
                <p className="text-secondary mt-2 max-w-xl">
                  Take the two-minute quiz. Your runner type goes on the front, your own four scores on the back. From £29.99.
                </p>
                <p className="mt-4 text-sm font-bold uppercase tracking-widest text-brand">Take the quiz to get yours →</p>
              </div>
              <div className="grid grid-cols-3 gap-2 w-full md:w-96" aria-hidden>
                {runnerTeeFronts.map((svg, i) => (
                  <div key={i} dangerouslySetInnerHTML={{ __html: svg }} />
                ))}
              </div>
            </Link>
            <ShopGrid items={shopItems} categories={shopCategories} />
            <WelcomeOffer />
          </div>
        </section>

        <section className="py-12 lg:py-16 border-t border-border bg-surface">
          <div className="container">
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-sm">
              <div className="flex gap-3">
                <Shirt className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <p className="text-secondary">
                  <span className="text-foreground font-semibold">Made to order.</span> Nothing sits in a
                  warehouse. Running vests are cut and sewn in London; tees, hoodies and totes are printed in the UK; caps in the US; mugs and posters in the EU.
                </p>
              </div>
              <div className="flex gap-3">
                <Truck className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <p className="text-secondary">
                  <span className="text-foreground font-semibold">Free UK delivery over £45.</span> Under that,
                  postage is worked out at checkout, from £3.59. Outside the UK, order through the Etsy shop.
                </p>
              </div>
              <div className="flex gap-3">
                <ExternalLink className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <p className="text-secondary">
                  <span className="text-foreground font-semibold">Pay securely with Stripe.</span> Every product is
                  also on the{' '}
                  <a href={etsyShopUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                    Film My Run Etsy shop
                  </a>
                  {' '}if you&apos;d rather buy there.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
