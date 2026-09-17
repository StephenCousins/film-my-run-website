import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { shopItems, formatPrice, type ShopItem } from '@/lib/shop';

/**
 * Homepage shop section: a strip of film frames that scrolls continuously,
 * each frame a real product mockup, over a ticker of the phrases. All from the
 * exported Printify catalogue; the animation is CSS only.
 */

// Products whose primary mockup is a model shot lead the strip; flats fill in after.
function pickStrip(items: ShopItem[], count: number): ShopItem[] {
  const modelShots = items.filter((i) => /person|duo|lifestyle|context/.test(i.images[0]?.position ?? ''));
  const rest = items.filter((i) => !modelShots.includes(i));
  // Interleave categories so the strip is not 12 tees in a row
  const byCat = new Map<string, ShopItem[]>();
  for (const i of [...modelShots, ...rest]) byCat.set(i.category, [...(byCat.get(i.category) ?? []), i]);
  const out: ShopItem[] = [];
  const queues = [...byCat.values()];
  while (out.length < count && queues.some((q) => q.length)) {
    for (const q of queues) {
      const next = q.shift();
      if (next) out.push(next);
      if (out.length >= count) break;
    }
  }
  return out;
}

function FilmFrame({ item }: { item: ShopItem }) {
  const img = item.images[0];
  return (
    <Link
      href={`/shop/${item.slug}`}
      className="group relative shrink-0 w-44 sm:w-52 lg:w-60 aspect-[4/5] bg-white overflow-hidden rounded-sm ring-1 ring-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      tabIndex={-1}
      aria-label={`${item.name}, ${formatPrice(item)}`}
    >
      {img && (
        <Image
          src={img.src}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 176px, (max-width: 1024px) 208px, 240px"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <p className="font-display text-sm font-semibold text-white leading-tight line-clamp-1">{item.name}</p>
        <p className="font-mono text-xs text-orange-300">{formatPrice(item)}</p>
      </div>
    </Link>
  );
}

/** Rows of sprocket holes, like the strip on the mugs and logo. */
function Sprockets() {
  return (
    <div
      aria-hidden
      className="h-4 w-full bg-[radial-gradient(circle,transparent_0,transparent_100%)]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(90deg, transparent 0 14px, rgb(var(--color-background)) 14px 26px, transparent 26px 40px)',
        backgroundSize: '40px 10px',
        backgroundRepeat: 'repeat-x',
        backgroundPosition: 'center',
      }}
    />
  );
}

export default function ShopTeaser() {
  const strip = pickStrip(shopItems, 14);
  const phrases = shopItems.filter((i) => i.category === 'tees' && !i.key.startsWith('logo')).map((i) => i.name);
  const categories = [...new Set(shopItems.map((i) => i.categoryLabel))];

  return (
    <section className="relative overflow-hidden bg-background py-16 lg:py-24" aria-labelledby="shop-teaser-heading">
      <div className="container">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <span className="text-brand text-sm font-semibold uppercase tracking-wider">The Shop</span>
            <h2 id="shop-teaser-heading" className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mt-2">
              Things said out loud, now on a t-shirt
            </h2>
            <p className="text-secondary mt-3 text-lg">
              {shopItems.length} designs across {categories.join(', ').replace(/, ([^,]*)$/, ' and $1').toLowerCase()}.
              Every phrase came from a race video. Printed to order in the UK.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 self-start lg:self-auto px-6 py-3 rounded-xl bg-brand text-black font-semibold hover:bg-orange-400 transition-colors group"
          >
            <ShoppingBag className="w-5 h-5" />
            Browse the shop
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Film strip */}
      <div className="bg-brand py-1.5 [--marquee-gap:0.75rem]">
        <Sprockets />
        <div className="group/strip overflow-hidden py-2">
          <div className="flex w-max gap-[var(--marquee-gap)] animate-marquee motion-reduce:animate-none hover:[animation-play-state:paused] px-[calc(var(--marquee-gap)/2)]">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex gap-[var(--marquee-gap)]" aria-hidden={copy === 1}>
                {strip.map((item) => (
                  <FilmFrame key={`${copy}-${item.key}`} item={item} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <Sprockets />
      </div>

      {/* Phrase ticker */}
      <div className="overflow-hidden border-b border-border py-3">
        <div className="flex w-max animate-marquee-reverse motion-reduce:animate-none">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex" aria-hidden={copy === 1}>
              {phrases.map((p) => (
                <span key={`${copy}-${p}`} className="font-display text-sm sm:text-base font-semibold uppercase tracking-wide text-muted whitespace-nowrap px-5">
                  {p} <span className="text-brand">·</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="container mt-8">
        <p className="text-sm text-muted">
          Running vests, tees, hoodies, caps, totes, mugs and posters. Made to order in the UK, paid securely with Stripe.{' '}
          <Link href="/shop" className="text-brand hover:underline">See everything</Link>
        </p>
      </div>
    </section>
  );
}
