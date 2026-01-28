'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ShoppingBag,
  Star,
  Heart,
  Share2,
  Truck,
  RefreshCw,
  Shield,
  ChevronRight,
  Minus,
  Plus,
  Check,
} from 'lucide-react';
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
  images: string[];
  category: string;
  rating: number;
  reviews: number;
  badge?: string;
  inStock: boolean;
  description: string;
  features: string[];
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  specs: { label: string; value: string }[];
}

// ============================================
// PLACEHOLDER DATA
// ============================================

const products: Record<string, Product> = {
  'running-cap': {
    id: '1',
    name: 'Film My Run Running Cap',
    slug: 'running-cap',
    price: 24.99,
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/cap.svg', 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/cap.svg', 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/cap.svg'],
    category: 'Accessories',
    rating: 4.9,
    reviews: 47,
    badge: 'Best Seller',
    inStock: true,
    description:
      'Our signature running cap combines lightweight construction with superior breathability. The moisture-wicking sweatband keeps you cool during intense sessions, while the curved brim provides protection from sun and rain. Perfect for training runs and race day.',
    features: [
      'Lightweight, breathable mesh construction',
      'Moisture-wicking sweatband',
      'Adjustable strap for custom fit',
      'Reflective Film My Run logo',
      'UPF 30+ sun protection',
      'Quick-dry fabric',
    ],
    colors: [
      { name: 'Black', hex: '#1a1a1a' },
      { name: 'Orange', hex: '#f88c00' },
      { name: 'White', hex: '#ffffff' },
    ],
    specs: [
      { label: 'Material', value: '100% Polyester' },
      { label: 'Weight', value: '45g' },
      { label: 'Care', value: 'Machine wash cold' },
      { label: 'Origin', value: 'Made in UK' },
    ],
  },
  'ultra-vest': {
    id: '2',
    name: 'Ultra Lightweight Running Vest',
    slug: 'ultra-vest',
    price: 89.99,
    comparePrice: 109.99,
    images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/vest.svg', 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/vest.svg'],
    category: 'Gear',
    rating: 4.8,
    reviews: 32,
    badge: 'Sale',
    inStock: true,
    description:
      'Designed for ultra runners who demand the best. This race-ready vest features front pockets for easy access to nutrition, dual 500ml soft flask holders, and a comfortable fit that moves with you over any distance.',
    features: [
      'Front chest pockets for gels and snacks',
      'Two 500ml soft flask holders included',
      'Rear storage for layers and kit',
      'Adjustable sternum straps',
      'Reflective details for visibility',
      'Pole attachment points',
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Black', hex: '#1a1a1a' },
      { name: 'Blue', hex: '#3b82f6' },
    ],
    specs: [
      { label: 'Capacity', value: '8L' },
      { label: 'Weight', value: '180g (empty)' },
      { label: 'Material', value: 'Nylon ripstop' },
      { label: 'Water Resistance', value: 'DWR coating' },
    ],
  },
};

// Default product for unknown slugs
const defaultProduct: Product = {
  id: '0',
  name: 'Product',
  slug: 'product',
  price: 29.99,
  images: ['https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shop/placeholder.svg'],
  category: 'General',
  rating: 4.5,
  reviews: 0,
  inStock: true,
  description: 'Product description coming soon.',
  features: ['High quality', 'Great value'],
  specs: [],
};

// ============================================
// PRODUCT PAGE
// ============================================

export default function ProductPage() {
  const params = useParams();
  const slug = params.slug as string;
  const product = products[slug] || defaultProduct;

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[1] || '');
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0]?.name || '');
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24 bg-zinc-950">
        {/* Breadcrumb */}
        <div className="container py-4">
          <nav className="flex items-center gap-2 text-sm text-zinc-500">
            <Link href="/shop" className="hover:text-orange-500 transition-colors">
              Shop
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link
              href={`/shop?category=${product.category}`}
              className="hover:text-orange-500 transition-colors"
            >
              {product.category}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{product.name}</span>
          </nav>
        </div>

        {/* Product section */}
        <section className="py-8 lg:py-12">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
              {/* Images */}
              <div className="space-y-4">
                {/* Main image */}
                <div className="relative aspect-square bg-zinc-900 rounded-2xl overflow-hidden">
                  <Image
                    src={product.images[selectedImage]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    priority
                  />

                  {/* Badge */}
                  {product.badge && (
                    <div className="absolute top-4 left-4">
                      <span
                        className={cn(
                          'px-3 py-1.5 text-sm font-semibold rounded-full',
                          product.badge === 'Best Seller' && 'bg-orange-500 text-white',
                          product.badge === 'New' && 'bg-emerald-500 text-white',
                          product.badge === 'Sale' && 'bg-red-500 text-white'
                        )}
                      >
                        {product.badge}
                      </span>
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {product.images.length > 1 && (
                  <div className="flex gap-3">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={cn(
                          'relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors',
                          selectedImage === index
                            ? 'border-orange-500'
                            : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-700'
                        )}
                      >
                        <Image
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div>
                {/* Category */}
                <div className="text-sm text-zinc-500 mb-2">{product.category}</div>

                {/* Title */}
                <h1 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
                  {product.name}
                </h1>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-5 h-5',
                          i < Math.floor(product.rating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-zinc-300'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-white">
                    {product.rating}
                  </span>
                  <span className="text-sm text-zinc-500">({product.reviews} reviews)</span>
                </div>

                {/* Price */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-mono text-3xl font-bold text-orange-500">
                    £{product.price.toFixed(2)}
                  </span>
                  {product.comparePrice && (
                    <>
                      <span className="font-mono text-xl text-zinc-400 line-through">
                        £{product.comparePrice.toFixed(2)}
                      </span>
                      <span className="px-2 py-1 bg-red-500/10 text-red-500 text-sm font-medium rounded">
                        Save £{(product.comparePrice - product.price).toFixed(2)}
                      </span>
                    </>
                  )}
                </div>

                {/* Description */}
                <p className="text-zinc-400 leading-relaxed mb-8">
                  {product.description}
                </p>

                {/* Colors */}
                {product.colors && (
                  <div className="mb-6">
                    <div className="text-sm font-medium text-white mb-3">
                      Color: <span className="text-zinc-500">{selectedColor}</span>
                    </div>
                    <div className="flex gap-2">
                      {product.colors.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setSelectedColor(color.name)}
                          className={cn(
                            'w-10 h-10 rounded-full border-2 transition-all',
                            selectedColor === color.name
                              ? 'border-orange-500 ring-2 ring-orange-500/30'
                              : 'border-zinc-700'
                          )}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Sizes */}
                {product.sizes && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-white">
                        Size: <span className="text-zinc-500">{selectedSize}</span>
                      </span>
                      <button className="text-sm text-orange-500 hover:text-orange-600">
                        Size Guide
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={cn(
                            'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                            selectedSize === size
                              ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                              : 'border-zinc-700 text-zinc-300 hover:border-orange-500/50'
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="mb-8">
                  <div className="text-sm font-medium text-white mb-3">
                    Quantity
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-zinc-700 rounded-lg">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-3 hover:bg-zinc-800 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-medium">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-3 hover:bg-zinc-800 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {product.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 mb-8">
                  <button
                    disabled={!product.inStock}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-4 font-semibold rounded-full transition-all',
                      product.inStock
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                    )}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Add to Cart
                  </button>
                  <button
                    onClick={() => setIsWishlisted(!isWishlisted)}
                    className="p-4 border border-zinc-700 rounded-full hover:border-orange-500 transition-colors"
                  >
                    <Heart
                      className={cn(
                        'w-5 h-5',
                        isWishlisted ? 'fill-red-500 text-red-500' : 'text-zinc-400'
                      )}
                    />
                  </button>
                  <button className="p-4 border border-zinc-700 rounded-full hover:border-orange-500 transition-colors">
                    <Share2 className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>

                {/* Benefits */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-zinc-900 rounded-xl">
                  <div className="text-center">
                    <Truck className="w-5 h-5 mx-auto text-zinc-400 mb-2" />
                    <div className="text-xs text-zinc-400">Free Shipping</div>
                  </div>
                  <div className="text-center">
                    <RefreshCw className="w-5 h-5 mx-auto text-zinc-400 mb-2" />
                    <div className="text-xs text-zinc-400">30-Day Returns</div>
                  </div>
                  <div className="text-center">
                    <Shield className="w-5 h-5 mx-auto text-zinc-400 mb-2" />
                    <div className="text-xs text-zinc-400">Secure Payment</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features & Specs */}
        <section className="py-12 lg:py-16 bg-zinc-900">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Features */}
              <div>
                <h2 className="font-display text-2xl font-bold text-white mb-6">
                  Features
                </h2>
                <ul className="space-y-3">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-orange-500" />
                      </div>
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Specifications */}
              {product.specs.length > 0 && (
                <div>
                  <h2 className="font-display text-2xl font-bold text-white mb-6">
                    Specifications
                  </h2>
                  <div className="space-y-3">
                    {product.specs.map((spec, index) => (
                      <div
                        key={index}
                        className="flex justify-between py-3 border-b border-zinc-800"
                      >
                        <span className="text-zinc-500">{spec.label}</span>
                        <span className="font-medium text-white">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
