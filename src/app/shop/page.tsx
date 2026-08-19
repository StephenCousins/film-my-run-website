import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Bell, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsletterForm from '@/components/newsletter/NewsletterForm';

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />

      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        {/* Hero */}
        <section className="relative py-24 lg:py-40 overflow-hidden">
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
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-8">
                <ShoppingBag className="w-4 h-4 text-orange-500" />
                <span className="text-orange-400 text-sm font-medium">Coming Soon</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                The Shop
              </h1>
              <p className="text-lg lg:text-xl text-zinc-300 leading-relaxed mb-4">
                We're putting together a collection of running gear, apparel, and
                accessories — designed by runners, tested on trails and roads across the world.
              </p>
              <p className="text-zinc-400">
                Sign up below and we'll let you know as soon as we launch.
              </p>
            </div>
          </div>
        </section>

        {/* What to expect */}
        <section className="py-16 lg:py-24 bg-background">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground text-center mb-12">
                What to Expect
              </h2>

              <div className="grid sm:grid-cols-3 gap-8">
                {[
                  {
                    title: 'Apparel',
                    description: 'Performance tees, hoodies, and caps with the Film My Run badge of quality.',
                  },
                  {
                    title: 'Gear',
                    description: 'Race vests, hydration belts, and accessories we actually use on the trails.',
                  },
                  {
                    title: 'Digital',
                    description: 'Training plans, route guides, and resources to help you go further.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="text-center p-6 bg-surface-secondary rounded-2xl border border-border"
                  >
                    <h3 className="font-display text-lg font-semibold text-foreground mb-3">
                      {item.title}
                    </h3>
                    <p className="text-sm text-secondary leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter signup */}
        <section className="relative py-16 lg:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-surface via-surface to-surface-secondary" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(248,140,0,0.08),_transparent_60%)]" />
          <div className="container relative">
            <div className="max-w-xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/15 text-brand text-xs font-semibold rounded-full uppercase tracking-wider mb-6">
                <Bell className="w-3.5 h-3.5" />
                Get Notified
              </div>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
                Be the First to Know
              </h2>
              <p className="text-secondary mb-8 leading-relaxed">
                Drop your email and we'll send you a heads-up when the shop goes live —
                plus early access to any launch offers.
              </p>
              <NewsletterForm
                variant="inline"
                theme="glass"
                className="max-w-md mx-auto"
              />
            </div>
          </div>
        </section>

        {/* CTA to explore other content */}
        <section className="py-12 bg-background border-t border-border">
          <div className="container">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
              <p className="text-secondary">While you wait, explore what we've been up to:</p>
              <div className="flex gap-3">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-secondary border border-border rounded-full text-sm font-medium text-foreground hover:border-brand hover:text-brand transition-colors"
                >
                  Blog
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/films"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-secondary border border-border rounded-full text-sm font-medium text-foreground hover:border-brand hover:text-brand transition-colors"
                >
                  Films
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
