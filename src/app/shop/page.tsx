import Image from 'next/image';
import { ShoppingBag, Truck, Shirt, ExternalLink } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ShopGrid from '@/components/shop/ShopGrid';
import { shopItems, shopCategories, etsyShopUrl } from '@/lib/shop';

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
                <span className="text-orange-400 text-sm font-medium">{shopItems.length} things to wear, carry and drink from</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-5">The Shop</h1>
              <p className="text-lg text-zinc-300 leading-relaxed">
                Every phrase on these shirts was said out loud, on camera, somewhere between a start line and a
                finish line. Printed to order on Bella+Canvas tees and Gildan hoodies, plus caps, totes, mugs
                and posters for the rest of the day.
              </p>
            </div>
          </div>
        </section>

        <section className="py-10 lg:py-16">
          <div className="container">
            <ShopGrid items={shopItems} categories={shopCategories} />
          </div>
        </section>

        <section className="py-12 lg:py-16 border-t border-border bg-surface">
          <div className="container">
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-sm">
              <div className="flex gap-3">
                <Shirt className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <p className="text-secondary">
                  <span className="text-foreground font-semibold">Printed to order.</span> Nothing sits in a
                  warehouse. Tees, hoodies and totes are printed in the UK; caps in the US; mugs and posters in the EU.
                </p>
              </div>
              <div className="flex gap-3">
                <Truck className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <p className="text-secondary">
                  <span className="text-foreground font-semibold">UK and worldwide delivery.</span> Postage is
                  worked out at checkout and depends on where the item is printed.
                </p>
              </div>
              <div className="flex gap-3">
                <ExternalLink className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <p className="text-secondary">
                  <span className="text-foreground font-semibold">Checkout on Etsy.</span> Orders are placed
                  through the{' '}
                  <a href={etsyShopUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                    Film My Run Etsy shop
                  </a>
                  , with Etsy&apos;s buyer protection and returns.
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
