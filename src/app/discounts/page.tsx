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
    image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/wp-uploads/2025/06/IMG_2508-scaled.png',
    category: 'Equipment',
  },
  {
    id: 'flyingburrito',
    brand: 'Flying Burrito Shirts',
    code: 'filmmyrunfb',
    discount: 'Exclusive Discount',
    description: "We fell in love with these shirts when we saw our friend Oriel wearing one at a backyard ultra event a few years ago. Since then we have developed a great relationship with this quirky, fun loving company who create amazing looking and great fitting tech shirts for running.",
    url: 'https://flyingburrito.eu',
    image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/wp-uploads/2025/06/IMG_1324-scaled.jpg',
    category: 'Apparel',
  },
  {
    id: 'enertor',
    brand: 'Enertor Insoles',
    code: 'FILMMYRUN15',
    discount: '15% Off',
    description: "I have been using Enertor insoles for over 6 years and I put them in almost all my running shoes and even my every day walking shoes. They provide not only comfort but great support allowing you to recover faster, reduce the risk of injury and keep moving for longer.",
    url: 'https://enertor.com',
    image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/wp-uploads/2025/06/IMG_1304-2-scaled.jpg',
    category: 'Equipment',
  },
  {
    id: 'proteinrebel',
    brand: 'Protein Rebel Nutrition',
    code: '15FILMMYRUN',
    discount: '15% Off',
    description: "I am famously not a fan of gels. However, Protein Rebel's recipe is simple and doesn't upset my stomach. Plus the collagen, magnesium and protein powders provide an easy way to supplement your diet with recovery and muscle building nutrients.",
    url: 'https://proteinrebel.avln.me/c/JHYoefQICplw',   // Avelon tracked link
    image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/wp-uploads/2025/06/IMG_1707-scaled.jpg',
    category: 'Nutrition',
  },
];

// More partner brands, through the Avelon affiliate network. Links are Avelon tracked links
// (app.avelonetwork.com > Dashboard > My Links); codes are under My Retailers > Promo codes.
const partners: { brand: string; about: string; code: string | null; discount: string | null; url: string }[] = [
  { brand: 'Harrier Trail Running', about: 'British trail running kit and shoes.', code: 'FMR10', discount: '10% off', url: 'https://harrierrunfree.avln.me/c/RjvhiAikkLJb' },
  { brand: 'Trailskin', about: 'All-natural skincare made for runners, by runners.', code: 'filmmyrun15', discount: '15% off', url: 'https://trailskin.avln.me/c/BxDOcVhzgmdb' },
  { brand: 'ABSOLUTE360', about: 'Infrared performance and recovery wear: leggings, base layers, socks.', code: 'FilmMyRun-BA15', discount: '15% off', url: 'https://absolute360.avln.me/c/ZMAacDyVALGs' },
  { brand: 'Runr', about: 'Running apparel for parkrunners and marathoners alike.', code: 'FILMMYRUN10', discount: '10% off', url: 'https://runr.avln.me/c/jgNyGXlYyOlT' },
  { brand: 'TORQ', about: 'Sports nutrition: energy drinks, gels and bars.', code: 'AFSCTORQ10', discount: '10% off', url: 'https://torqfitness.avln.me/c/ozqBvrqRqwXD' },
  { brand: 'Save Our Soles', about: 'Foot care and shoe care for runners.', code: 'SC', discount: '10% off', url: 'https://saveoursoles.avln.me/c/swEEQAWMPMBj' },
  { brand: 'Maurten', about: 'Hydrogel sports fuel and drink mixes.', code: null, discount: null, url: 'https://maurten.avln.me/c/LgACXCTrtoUo' },
  { brand: 'SunGod', about: 'Running sunglasses with zero-bounce frames and anti-fog lenses.', code: null, discount: null, url: 'https://sungod.avln.me/c/WkFmlPWZmBKQ' },
  { brand: 'SOAR Running', about: 'Performance running kit, designed in London.', code: null, discount: null, url: 'https://soarrunning.avln.me/c/xyOeBHTDpYAy' },
  { brand: 'Janji', about: 'Running apparel.', code: null, discount: null, url: 'https://janjiuk.avln.me/c/iCNEBMxtcQMu' },
  { brand: 'Silva', about: 'Head torches and compasses, since 1933.', code: null, discount: null, url: 'https://silvauk.avln.me/c/twlXkMTHALYQ' },
  { brand: 'Kitbrix', about: 'Kit bags for runners and triathletes.', code: null, discount: null, url: 'https://kitbrix.avln.me/c/QIaBoPBRfifO' },
  { brand: 'Zone3', about: 'Triathlon and open water swim kit.', code: null, discount: null, url: 'https://zone3.avln.me/c/aznFbmzglyZs' },
  { brand: 'Sigma Sports', about: 'Running, cycling and triathlon retailer in Kingston, Surrey.', code: null, discount: null, url: 'https://sigmasports.avln.me/c/fsyJuEHSnyyf' },
];

function PartnerCard({ p }: { p: typeof partners[0] }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!p.code) return;
    navigator.clipboard.writeText(p.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col p-6 bg-surface-secondary rounded-2xl border border-border">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-display text-xl font-bold text-foreground">{p.brand}</h3>
        {p.discount && (
          <span className="shrink-0 px-2.5 py-1 bg-brand/10 text-brand text-xs font-bold rounded-full border border-brand/20">{p.discount}</span>
        )}
      </div>
      <p className="text-secondary text-sm leading-relaxed mb-5 flex-1">{p.about}</p>
      <div className="flex items-center gap-3">
        {p.code && (
          <button
            onClick={copy}
            className="flex items-center gap-2 px-3 py-2 bg-surface-tertiary rounded-lg font-mono text-sm font-bold text-foreground hover:bg-brand hover:text-white transition-all"
            title="Copy code"
          >
            {p.code}
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        )}
        <a
          href={p.url}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-semibold rounded-full hover:bg-brand-hover transition-all"
        >
          Shop
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

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
    <div className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center py-16 lg:py-24 ${index > 0 ? 'border-t border-border' : ''}`}>
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
          <span className="px-3 py-1.5 bg-brand text-white text-xs font-semibold rounded-full">
            {deal.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className={isEven ? 'lg:order-1' : 'lg:order-2'}>
        {/* Discount badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand/10 rounded-full border border-brand/20 mb-4">
          <Percent className="w-4 h-4 text-brand" />
          <span className="text-brand text-sm font-bold">{deal.discount}</span>
        </div>

        {/* Brand name */}
        <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
          {deal.brand}
        </h2>

        {/* Description */}
        <p className="text-secondary leading-relaxed mb-6">
          {deal.description}
        </p>

        {/* Code box (if applicable) */}
        {deal.code && (
          <div className="flex items-center gap-3 p-4 bg-surface-secondary rounded-xl border border-border mb-6">
            <div className="flex-1">
              <span className="text-xs text-muted uppercase tracking-wider block mb-1">Discount Code</span>
              <code className="text-foreground font-mono text-xl font-bold">{deal.code}</code>
            </div>
            <button
              onClick={copyCode}
              className={`p-3 rounded-lg transition-all ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-surface-tertiary text-secondary hover:bg-brand hover:text-white'
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
          rel="sponsored noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-full hover:bg-brand-hover transition-all hover:scale-105"
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
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0">
            <Image
              src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/wp-uploads/2020/03/transgrancanaria2020-12054.jpg"
              alt="Running background"
              fill
              className="object-cover object-bottom"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-[rgb(var(--color-background))]" />
          </div>

          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand/20 backdrop-blur-sm rounded-full border border-brand/30 mb-6">
                <Tag className="w-4 h-4 text-brand" />
                <span className="text-brand text-sm font-medium">Exclusive Partner Deals</span>
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

        {/* More partner brands (Avelon) */}
        <section className="py-16 lg:py-24 border-t border-border">
          <div className="container">
            <div className="max-w-2xl mb-10">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">More Partner Brands</h2>
              <p className="text-secondary">Codes and links for more brands in the running world. Copy a code, then use it at checkout.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map((p) => (
                <PartnerCard key={p.brand} p={p} />
              ))}
            </div>
            <p className="text-muted text-sm mt-10">
              Some links on this page are affiliate links. If you buy through them I may earn a small commission, at no extra cost to you.
            </p>
          </div>
        </section>

        {/* Partner CTA */}
        <section className="py-16 lg:py-24 border-t border-border">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
                Want to Partner with Film My Run?
              </h2>
              <p className="text-secondary mb-8">
                If you have a product or service that would benefit the running community,
                I'd love to hear from you.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-surface-tertiary text-foreground font-semibold rounded-full hover:bg-brand hover:text-white transition-all"
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
