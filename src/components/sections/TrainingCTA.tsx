'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AppScreensFan, { type AppScreen } from '@/components/sections/AppScreensFan';
import { CalendarDays, Target, Mountain, ShoppingBag, ArrowRight, Smartphone } from 'lucide-react';

// ============================================
// FEATURES DATA
// ============================================

// The Film My Run app, in the words of its App Store listing (filmmyrun-ios
// docs/app-store-listing.md). Every figure is the app's own.
const features: { icon: typeof CalendarDays; title: string; description: string; href?: string }[] = [
  {
    icon: CalendarDays,
    title: 'Training plans',
    description: '5K to 100 miles, built to the 80/20 method. Tick runs off from Apple Health.',
  },
  {
    icon: Target,
    title: 'Race predictor',
    description: 'Any distance to any distance, from 2.37 million real UK results. Ultras too.',
  },
  {
    icon: Mountain,
    title: 'Ultra Race Pacing',
    description: 'Your arrival time at every checkpoint, built from 7,687 real race finishes. Part of FMR Club.',
  },
  {
    icon: ShoppingBag,
    title: 'The shop',
    description: 'Running vests, tees, hoodies and caps, printed to order in the UK. FMR Club saves 15%.',
    href: '/shop',
  },
]

// Real screens, from the app's screenshot simulator (26 Sep 2026): pacing, Today, a training week.
const APP_SCREENS: [AppScreen, AppScreen, AppScreen] = [
  { src: '/images/app/raceplan.webp', alt: 'Ultra Race Pacing: a 100-mile checkpoint schedule for a 24-hour finish' },
  { src: '/images/app/today.webp', alt: "The Today screen: today's run, its pace and the race countdown" },
  { src: '/images/app/plan.webp', alt: "A training plan: this week's runs with their distances" },
];

// ============================================
// TRAINING CTA SECTION
// ============================================

export default function TrainingCTA() {
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
          // Parallax on background
          gsap.to(section.querySelector('.training-bg'), {
            yPercent: -15,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          });

          // Content animation
          gsap.fromTo(
            section.querySelector('.training-content'),
            { opacity: 0, y: 40 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 70%',
                once: true,
              },
            }
          );

          // Features stagger
          gsap.fromTo(
            section.querySelectorAll('.training-feature'),
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              stagger: 0.1,
              duration: 0.6,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: section.querySelector('.training-features'),
                start: 'top 80%',
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
      className="relative py-24 lg:py-32 overflow-hidden"
      style={{ position: 'relative', zIndex: 1 }}
    >
      {/* Background image with parallax */}
      <div className="training-bg absolute inset-0 scale-110">
        <div className="absolute inset-0 bg-zinc-950">
          <Image
            src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/training-bg.svg"
            alt=""
            fill
            className="object-cover opacity-40"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-zinc-950/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/50" />
      </div>

      {/* Content */}
      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left column */}
          <div className="training-content">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
              <Smartphone className="w-4 h-4 text-orange-500" />
              <span className="text-orange-400 text-sm font-medium">The Film My Run app for iPhone</span>
            </div>

            {/* Title */}
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Built on Real Results,
              <br />
              <span className="text-orange-500">Not Guesses</span>
            </h2>

            {/* Description */}
            <p className="text-zinc-300 text-lg leading-relaxed mb-8 max-w-lg">
              Training plans from 5K to 100 miles. Ultra race pacing, checkpoint by checkpoint. A race predictor
              that looked at 2.37 million UK results to see how runners with your time actually did. The tools
              from my videos, free, in your pocket.
            </p>

            {/* Stats: the app's own figures */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 mb-10">
              <div>
                <div className="font-mono text-3xl font-bold text-orange-500">2.37M</div>
                <div className="text-zinc-400 text-sm">UK race results</div>
              </div>
              <div>
                <div className="font-mono text-3xl font-bold text-orange-500">5K–100mi</div>
                <div className="text-zinc-400 text-sm">Training plans</div>
              </div>
              <div>
                <div className="font-mono text-3xl font-bold text-orange-500">Free</div>
                <div className="text-zinc-400 text-sm">Core tools, for good</div>
              </div>
            </div>

            {/* CTA: not on the App Store yet */}
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-full border border-white/20">
                <Smartphone className="w-5 h-5" />
                Coming soon to the App Store
              </span>
              <Link
                href="/club"
                className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-all hover:scale-105"
              >
                Join FMR Club
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Right column: three real screens from the app; they fan out on hover */}
          <AppScreensFan screens={APP_SCREENS} label="Screens from the Film My Run app" />
        </div>

        {/* Features: one row across both columns, so neither column runs long */}
        <div className="training-features mt-16 lg:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            const card = (
              <>
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
              </>
            );
            const cls = 'training-feature block p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-orange-500/30 transition-colors';
            return feature.href ? (
              <Link key={feature.title} href={feature.href} className={cls}>{card}</Link>
            ) : (
              <div key={feature.title} className={cls}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
