'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Star, Filter, Search, Grid, List, Heart } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  image: string;
  images: string[];
  category: string;
  rating: number;
  reviews: number;
  badge?: 'Best Seller' | 'New' | 'Sale';
  inStock: boolean;
  description: string;
}

// ============================================
// PLACEHOLDER DATA
// ============================================

const products: Product[] = [
  {
    id: '1',
    name: 'Film My Run Running Cap',
    slug: 'running-cap',
    price: 24.99,
    image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/cap.svg',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/cap.svg', 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/cap.svg'],
    category: 'Accessories',
    rating: 4.9,
    reviews: 47,
    badge: 'Best Seller',
    inStock: true,
    description: 'Lightweight, breathable running cap with moisture-wicking sweatband.',
  },
  {
    id: '2',
    name: 'Ultra Lightweight Running Vest',
    slug: 'ultra-vest',
    price: 89.99,
    comparePrice: 109.99,
    image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/vest.svg',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/vest.svg'],
    category: 'Gear',
    rating: 4.8,
    reviews: 32,
    badge: 'Sale',
    inStock: true,
    description: 'Race-ready vest with front pockets and 500ml soft flask holders.',
  },
  {
    id: '3',
    name: 'Race Day Performance T-Shirt',
    slug: 'race-day-tee',
    price: 34.99,
    image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/placeholder.svg',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/placeholder.svg'],
    category: 'Apparel',
    rating: 4.7,
    reviews: 65,
    badge: 'New',
    inStock: true,
    description: 'Technical fabric with anti-chafe seams and reflective details.',
  },
  {
    id: '4',
    name: 'Trail Running Buff',
    slug: 'trail-buff',
    price: 19.99,
    image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/placeholder.svg',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/placeholder.svg'],
    category: 'Accessories',
    rating: 4.9,
    reviews: 89,
    inStock: true,
    description: 'Versatile neck gaiter for sun protection and warmth.',
  },
  {
    id: '5',
    name: 'Running Socks - 3 Pack',
    slug: 'running-socks-3pack',
    price: 29.99,
    image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/placeholder.svg',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/placeholder.svg'],
    category: 'Accessories',
    rating: 4.6,
    reviews: 124,
    inStock: true,
    description: 'Anti-blister cushioned running socks with arch support.',
  },
  {
    id: '6',
    name: 'Hydration Belt',
    slug: 'hydration-belt',
    price: 44.99,
    image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/placeholder.svg',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/placeholder.svg'],
    category: 'Gear',
    rating: 4.5,
    reviews: 56,
    inStock: true,
    description: 'Bounce-free belt with two 250ml bottles and phone pocket.',
  },
  {
    id: '7',
    name: 'Film My Run Hoodie',
    slug: 'fmr-hoodie',
    price: 54.99,
    image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/placeholder.svg',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/placeholder.svg'],
    category: 'Apparel',
    rating: 4.8,
    reviews: 38,
    inStock: true,
    description: 'Premium cotton blend hoodie with embroidered logo.',
  },
  {
    id: '8',
    name: 'Arm Sleeves - UV Protection',
    slug: 'arm-sleeves',
    price: 22.99,
    image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/placeholder.svg',
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/placeholder.svg'],
    category: 'Accessories',
    rating: 4.4,
    reviews: 28,
    inStock: false,
    description: 'UPF 50+ sun protection with cooling fabric technology.',
  },
];

const categories = ['All', 'Apparel', 'Gear', 'Accessories'];

// ============================================
// PRODUCT CARD
// ============================================

function ProductCard({ product }: { product: Product }) {
  const [isWishlisted, setIsWishlisted] = useState(false);

  return (
    <div className="group bg-surface rounded-2xl overflow-hidden border border-border hover:border-brand/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Image */}
      <Link href={`/shop/${product.slug}`} className="block relative aspect-square bg-surface-secondary overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badge */}
        {product.badge && (
          <div className="absolute top-3 left-3">
            <span
              className={cn(
                'px-3 py-1 text-xs font-semibold rounded-full',
                product.badge === 'Best Seller' && 'bg-orange-500 text-white',
                product.badge === 'New' && 'bg-emerald-500 text-white',
                product.badge === 'Sale' && 'bg-red-500 text-white'
              )}
            >
              {product.badge}
            </span>
          </div>
        )}

        {/* Out of stock overlay */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="px-4 py-2 bg-surface text-foreground text-sm font-medium rounded-full">
              Out of Stock
            </span>
          </div>
        )}

        {/* Wishlist button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsWishlisted(!isWishlisted);
          }}
          className="absolute top-3 right-3 p-2 bg-surface-secondary rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-tertiary"
        >
          <Heart
            className={cn(
              'w-5 h-5 transition-colors',
              isWishlisted ? 'fill-red-500 text-red-500' : 'text-muted'
            )}
          />
        </button>

        {/* Quick add button */}
        {product.inStock && (
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-3 bg-brand text-white rounded-full hover:bg-brand-hover transition-colors shadow-lg">
              <ShoppingBag className="w-5 h-5" />
            </button>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        <div className="text-xs text-muted mb-1">{product.category}</div>

        {/* Name */}
        <Link href={`/shop/${product.slug}`}>
          <h3 className="font-display font-semibold text-foreground group-hover:text-brand transition-colors line-clamp-1 mb-2">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-sm font-medium text-foreground">
            {product.rating}
          </span>
          <span className="text-sm text-muted">({product.reviews})</span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold text-brand">
            £{product.price.toFixed(2)}
          </span>
          {product.comparePrice && (
            <span className="font-mono text-sm text-muted line-through">
              £{product.comparePrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SHOP PAGE
// ============================================

export default function ShopPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
        return b.badge === 'New' ? 1 : -1;
      default:
        return b.badge === 'Best Seller' ? 1 : -1;
    }
  });

  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        {/* Hero */}
        <section className="py-12 lg:py-16 bg-surface-secondary border-b border-border">
          <div className="container">
            <div className="max-w-2xl">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Shop
              </h1>
              <p className="text-lg text-secondary">
                Gear designed by runners, for runners. Quality equipment tested on
                trails and roads around the world.
              </p>
            </div>
          </div>
        </section>

        {/* Filters bar */}
        <section className="py-4 bg-surface-secondary border-b border-border sticky top-16 lg:top-20 z-30">
          <div className="container">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input w-full pl-10"
                />
              </div>

              {/* Categories */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                      activeCategory === cat
                        ? 'bg-brand text-white'
                        : 'bg-surface-tertiary text-secondary hover:bg-brand/10 hover:text-brand'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Sort & View */}
              <div className="flex items-center gap-3 ml-auto">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                  <option value="newest">Newest</option>
                </select>

                <div className="hidden sm:flex items-center gap-1 p-1 bg-surface-tertiary rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'p-2 rounded text-secondary',
                      viewMode === 'grid' ? 'bg-surface' : ''
                    )}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'p-2 rounded text-secondary',
                      viewMode === 'list' ? 'bg-surface' : ''
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Products grid */}
        <section className="py-8 lg:py-12">
          <div className="container">
            {/* Results count */}
            <div className="text-sm text-muted mb-6">
              Showing {sortedProducts.length} products
            </div>

            {/* Grid */}
            <div
              className={cn(
                'grid gap-6',
                viewMode === 'grid'
                  ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'grid-cols-1 max-w-3xl'
              )}
            >
              {sortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Empty state */}
            {sortedProducts.length === 0 && (
              <div className="py-16 text-center">
                <ShoppingBag className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-muted">No products found matching your search.</p>
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="py-12 bg-surface-secondary border-t border-border">
          <div className="container">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: 'Free Shipping', desc: 'On orders over £50' },
                { title: 'Easy Returns', desc: '30-day return policy' },
                { title: 'Secure Payment', desc: 'Stripe & PayPal' },
                { title: 'Quality Guarantee', desc: 'Tested by runners' },
              ].map((feature) => (
                <div key={feature.title} className="text-center">
                  <div className="font-display font-semibold text-foreground">
                    {feature.title}
                  </div>
                  <div className="text-sm text-muted">{feature.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
