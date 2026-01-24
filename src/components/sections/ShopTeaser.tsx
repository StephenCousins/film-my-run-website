'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, ArrowRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// PRODUCT DATA
// ============================================

const featuredProducts = [
  {
    id: '1',
    name: 'Film My Run Running Cap',
    price: 24.99,
    image: '/images/shop/cap.svg',
    rating: 4.9,
    reviews: 47,
    href: '/shop/running-cap',
    badge: 'Best Seller',
  },
  {
    id: '2',
    name: 'Ultra Lightweight Vest',
    price: 89.99,
    image: '/images/shop/vest.svg',
    rating: 4.8,
    reviews: 32,
    href: '/shop/ultra-vest',
    badge: null,
  },
  {
    id: '3',
    name: 'Race Day T-Shirt',
    price: 34.99,
    image: '/images/shop/placeholder.svg',
    rating: 4.7,
    reviews: 65,
    href: '/shop/race-day-tee',
    badge: 'New',
  },
  {
    id: '4',
    name: 'Trail Running Buff',
    price: 19.99,
    image: '/images/shop/placeholder.svg',
    rating: 4.9,
    reviews: 89,
    href: '/shop/trail-buff',
    badge: null,
  },
];

// ============================================
// PRODUCT CARD COMPONENT
// ============================================

interface ProductCardProps {
  product: typeof featuredProducts[0];
}

function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={product.href}
      className="product-card group block bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Image */}
      <div className="relative aspect-square bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badge */}
        {product.badge && (
          <div className="absolute top-3 left-3">
            <span className={cn(
              'px-3 py-1 text-xs font-semibold rounded-full',
              product.badge === 'Best Seller' && 'bg-orange-500 text-white',
              product.badge === 'New' && 'bg-emerald-500 text-white'
            )}>
              {product.badge}
            </span>
          </div>
        )}

        {/* Quick add button */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors shadow-lg">
            <ShoppingBag className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-sm font-medium text-zinc-900 dark:text-white">
            {product.rating}
          </span>
          <span className="text-sm text-zinc-500">
            ({product.reviews})
          </span>
        </div>

        {/* Name */}
        <h3 className="font-display font-semibold text-zinc-900 dark:text-white group-hover:text-orange-500 transition-colors line-clamp-1 mb-2">
          {product.name}
        </h3>

        {/* Price */}
        <div className="font-mono text-lg font-bold text-orange-500">
          £{product.price.toFixed(2)}
        </div>
      </div>
    </Link>
  );
}

// ============================================
// SHOP TEASER SECTION
// ============================================

export default function ShopTeaser() {
  const sectionRef = useRef<HTMLElement>(null);

  // Initialize GSAP animations
  useEffect(() => {
    let ctx: any;

    const initGSAP = async () => {
      try {
        const gsap = (await import('gsap')).default;
        const ScrollTrigger = (await import('gsap/ScrollTrigger')).default;
        gsap.registerPlugin(ScrollTrigger);

        const section = sectionRef.current;
        if (!section) return;

        ctx = gsap.context(() => {
          // Stagger animation for product cards
          gsap.fromTo(
            section.querySelectorAll('.product-card'),
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              stagger: 0.1,
              duration: 0.6,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 70%',
                once: true,
              },
            }
          );
        }, section);
      } catch (error) {
        console.warn('GSAP not loaded');
      }
    };

    initGSAP();

    return () => {
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-24 lg:py-32 bg-zinc-100 dark:bg-zinc-950"
      style={{ position: 'relative', zIndex: 1 }}
    >
      <div className="container">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div>
            <span className="text-orange-500 text-sm font-semibold uppercase tracking-wider">
              Shop
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mt-2">
              Runner's Essentials
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              Gear designed by runners, for runners.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-orange-500 font-semibold hover:text-orange-600 transition-colors group"
          >
            Browse All Products
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-4 px-6 py-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-zinc-300 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900"
                />
              ))}
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-zinc-900 dark:text-white">
                Trusted by 5,000+ runners
              </div>
              <div className="flex items-center gap-1 text-sm text-zinc-500">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                4.9 average rating
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
