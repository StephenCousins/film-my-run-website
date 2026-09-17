import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Truck, Shield } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/shop/ProductCard';
import ProductPurchase from '@/components/shop/ProductPurchase';
import { shopItems, getShopItem } from '@/lib/shop';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return shopItems.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = getShopItem(slug);
  if (!item) return { title: 'Shop' };
  const description = item.description.split('\n')[0].slice(0, 160);
  return {
    title: `${item.name} | Shop`,
    description,
    alternates: { canonical: `https://filmmyrun.com/shop/${item.slug}` },
    openGraph: { title: `${item.name} | Film My Run Shop`, description, images: item.images[0] ? [item.images[0].src] : [] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const item = getShopItem(slug);
  if (!item) notFound();

  const related = shopItems.filter((i) => i.category === item.category && i.key !== item.key).slice(0, 4);
  const paragraphs = item.description.split('\n').map((s) => s.trim()).filter(Boolean);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.title,
    description: paragraphs[0],
    image: item.images.map((i) => i.src),
    brand: { '@type': 'Brand', name: 'Film My Run' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'GBP',
      lowPrice: item.priceFrom,
      highPrice: item.priceTo,
      availability: 'https://schema.org/InStock',
      url: `https://filmmyrun.com/shop/${item.slug}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <Header />

      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <div className="container py-8 lg:py-12">
          <nav className="flex items-center gap-2 text-sm text-muted mb-8" aria-label="Breadcrumb">
            <Link href="/shop" className="hover:text-foreground">Shop</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-secondary">{item.categoryLabel}</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground truncate">{item.name}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
            <ProductPurchase item={item}>
              <div className="mt-8 space-y-4 text-secondary leading-relaxed">
                {paragraphs.map((p, i) => (
                  <p key={i} className={i === 0 ? 'text-foreground' : ''}>{p}</p>
                ))}
              </div>

              <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex gap-3 p-4 rounded-xl bg-surface-secondary border border-border">
                  <Truck className="w-5 h-5 text-brand shrink-0" />
                  <span className="text-secondary">
                    {item.supplier === 'contrado'
                      ? 'Cut and sewn to order in London, dispatched tracked in about 2 days.'
                      : 'Printed to order, usually dispatched in 2 to 5 working days.'}
                  </span>
                </div>
                <div className="flex gap-3 p-4 rounded-xl bg-surface-secondary border border-border">
                  <Shield className="w-5 h-5 text-brand shrink-0" />
                  <span className="text-secondary">Paid securely with Stripe. Reply to your order email if anything's wrong.</span>
                </div>
              </div>
            </ProductPurchase>
          </div>

          {related.length > 0 && (
            <section className="mt-16 lg:mt-24">
              <h2 className="font-display text-2xl font-bold text-foreground mb-6">More {item.categoryLabel.toLowerCase()}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                {related.map((r) => (
                  <ProductCard key={r.key} item={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
