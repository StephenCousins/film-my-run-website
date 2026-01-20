'use client';

import { useState } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Tag, Copy, ExternalLink, Check, Percent } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// ============================================
// DISCOUNT DATA
// ============================================

const discounts = [
  {
    id: 'noblepro',
    brand: 'NoblePro Treadmills',
    code: null, // No specific code - discount through link
    discount: 'Exclusive Discount',
    description: "I have been a NoblePro ambassador for many years now and treadmill running remains an important part of my weekly running regime. NoblePro make the most affordable and best value smart treadmills on the market today allowing you to connect to third party apps like Zwift or MyWhoosh without the need for any other equipment.",
    url: 'https://zwift.run/noblepro',
    image: 'https://filmmyrun.co.uk/wp-content/uploads/2025/06/IMG_2508-scaled.png',
    category: 'Equipment',
  },
  {
    id: 'flyingburrito',
    brand: 'Flying Burrito Shirts',
    code: 'filmmyrunfb',
    discount: 'Exclusive Discount',
    description: "We fell in love with these shirts when we saw our friend Oriel wearing one at a backyard ultra event a few years ago. Since then we have developed a great relationship with this quirky, fun loving company who create amazing looking and great fitting tech shirts for running.",
    url: 'https://flyingburrito.eu',
    image: 'https://filmmyrun.co.uk/wp-content/uploads/2025/06/IMG_1324-scaled.jpg',
    category: 'Apparel',
  },
  {
    id: 'enertor',
    brand: 'Enertor Insoles',
    code: 'FILMMYRUN15',
    discount: '15% Off',
    description: "I have been using Enertor insoles for over 6 years and I put them in almost all my running shoes and even my every day walking shoes. They provide not only comfort but great support allowing you to recover faster, reduce the risk of injury and keep moving for longer.",
    url: 'https://enertor.com',
    image: 'https://filmmyrun.co.uk/wp-content/uploads/2025/06/IMG_1304-2-scaled.jpg',
    category: 'Equipment',
  },
  {
    id: 'proteinrebel',
    brand: 'Protein Rebel Nutrition',
    code: 'Filmmyrun15',
    discount: '15% Off',
    description: "I am famously not a fan of gels. However, Protein Rebel's recipe is simple and doesn't upset my stomach. Plus the collagen, magnesium and protein powders provide an easy way to supplement your diet with recovery and muscle building nutrients.",
    url: 'https://www.proteinrebel.com',
    image: 'https://filmmyrun.co.uk/wp-content/uploads/2025/06/IMG_1707-scaled.jpg',
    category: 'Nutrition',
  },
];

// ============================================
// DISCOUNT CARD COMPONENT
// ============================================

function DiscountCard({ deal, index }: { deal: typeof discounts[0]; index: number }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (deal.code) {
      navigator.clipboard.writeText(deal.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isEven = index % 2 === 0;

  return (
    <div className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center py-16 lg:py-24 ${index > 0 ? 'border-t border-zinc-800' : ''}`}>
      {/* Image */}
      <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
        <Image
          src={deal.image}
          alt={deal.brand}
          fill
          className="object-cover"
        />
        {/* Category badge */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-full">
            {deal.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className={isEven ? 'lg:order-1' : 'lg:order-2'}>
        {/* Discount badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-full border border-orange-500/20 mb-4">
          <Percent className="w-4 h-4 text-orange-500" />
          <span className="text-orange-500 text-sm font-bold">{deal.discount}</span>
        </div>

        {/* Brand name */}
        <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
          {deal.brand}
        </h2>

        {/* Description */}
        <p className="text-zinc-400 leading-relaxed mb-6">
          {deal.description}
        </p>

        {/* Code box (if applicable) */}
        {deal.code && (
          <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 mb-6">
            <div className="flex-1">
              <span className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Discount Code</span>
              <code className="text-white font-mono text-xl font-bold">{deal.code}</code>
            </div>
            <button
              onClick={copyCode}
              className={`p-3 rounded-lg transition-all ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-orange-500 hover:text-white'
              }`}
              title="Copy code"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* CTA Button */}
        <a
          href={deal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-all hover:scale-105"
        >
          {deal.code ? 'Shop Now' : 'Get Your Discount'}
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

// ============================================
// DISCOUNTS PAGE
// ============================================

export default function DiscountsPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0">
            <Image
              src="https://filmmyrun.co.uk/wp-content/uploads/2020/03/transgrancanaria2020-12054-scaled.jpg"
              alt="Running background"
              fill
              className="object-cover object-bottom"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/70 to-zinc-950" />
          </div>

          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
                <Tag className="w-4 h-4 text-orange-500" />
                <span className="text-orange-400 text-sm font-medium">Exclusive Partner Deals</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Discount Codes
              </h1>

              <p className="text-lg text-zinc-300 max-w-2xl mx-auto">
                I've partnered with some amazing brands in the running world. Use these exclusive
                discount codes to save on gear, nutrition, and equipment that I personally use and recommend.
              </p>
            </div>
          </div>
        </section>

        {/* Discounts List */}
        <section className="py-8 lg:py-16">
          <div className="container">
            {discounts.map((deal, index) => (
              <DiscountCard key={deal.id} deal={deal} index={index} />
            ))}
          </div>
        </section>

        {/* Partner CTA */}
        <section className="py-16 lg:py-24 border-t border-zinc-800">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
                Want to Partner with Film My Run?
              </h2>
              <p className="text-zinc-400 mb-8">
                If you have a product or service that would benefit the running community,
                I'd love to hear from you.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-zinc-900 font-semibold rounded-full hover:bg-orange-500 hover:text-white transition-all"
              >
                Get in Touch
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
