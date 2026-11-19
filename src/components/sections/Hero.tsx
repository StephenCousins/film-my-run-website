'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, ChevronDown, Smartphone } from 'lucide-react';

const HERO_STILL = '/images/hero/transgrancanaria2020.jpg';

// ============================================
// HERO SECTION
// ============================================
// Full-screen hero with:
// - Optimised still background (next/image)
// - Content fades out on scroll (GSAP)
// - Animated text reveal
// - Scroll indicator

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize GSAP animations
  useEffect(() => {
    let ctx: any;

    const initGSAP = async () => {
      try {
        const gsap = (await import('gsap')).default;
        const ScrollTrigger = (await import('gsap/ScrollTrigger')).default;
        gsap.registerPlugin(ScrollTrigger);

        const section = sectionRef.current;
        const content = contentRef.current;

        if (!section || !content) return;

        // Create a context for cleanup
        ctx = gsap.context(() => {
          // Initial animation - text reveal
          const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

          timeline
            .fromTo('.hero-tag',
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, duration: 0.8, delay: 0.2 }
            )
            .fromTo('.hero-title-line',
              { opacity: 0, y: 40 },
              { opacity: 1, y: 0, stagger: 0.15, duration: 0.8 },
              '-=0.4'
            )
            .fromTo('.hero-subtitle',
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, duration: 0.6 },
              '-=0.3'
            )
            .fromTo('.hero-cta',
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, stagger: 0.1, duration: 0.6 },
              '-=0.2'
            )
            .fromTo('.hero-scroll',
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, duration: 0.6 },
              '-=0.2'
            );

          // Fade out content on scroll (start after some scroll)
          gsap.to(content, {
            opacity: 0,
            y: -50,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: '15% top',
              end: '65% top',
              scrub: true,
            },
          });
        }, section);

      } catch (error) {
        console.warn('GSAP not loaded, animations disabled');
      }
    };

    initGSAP();

    // Cleanup on unmount
    return () => {
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen min-h-[600px] lg:min-h-[700px] w-full overflow-hidden"
    >
      {/* Background: optimised still */}
      <div className="absolute inset-0 bg-surface-secondary">
        <Image
          src={HERO_STILL}
          alt="Stephen Cousins running up a mountain trail at Transgrancanaria 2020"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="relative h-full flex items-center"
      >
        <div className="container">
          <div className="max-w-4xl">
            {/* Tag */}
            <div className="hero-tag inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-orange-400 text-sm font-medium">Filming Since 2011</span>
            </div>

            {/* Title */}
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-white leading-[0.95] tracking-tight mb-6">
              <span className="hero-title-line block">Every Stride</span>
              <span className="hero-title-line block">Deserves Its</span>
              <span className="hero-title-line block text-orange-500">Story</span>
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle text-zinc-300 text-lg sm:text-xl max-w-xl mb-8 leading-relaxed">
              From parkruns to ultramarathons, we capture the moments that matter.
              Tools for runners, films that inspire.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <Link
                href="/films"
                className="hero-cta group inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-full border border-white/20 hover:bg-white/20 transition-all hover:scale-105"
              >
                <Play className="w-5 h-5 fill-current" />
                Watch Films
              </Link>
              <Link
                href="/tools/calculators"
                className="hero-cta inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-full border border-white/20 hover:bg-white/20 transition-all hover:scale-105"
              >
                Running Tools
              </Link>
              <a
                href="https://apps.apple.com/gb/app/film-my-run/id6815156969"
                className="hero-cta inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-all hover:scale-105"
              >
                <Smartphone className="w-5 h-5" />
                Get the iPhone App
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="hero-scroll absolute bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60">
        <span className="text-xs uppercase tracking-widest">Scroll</span>
        <ChevronDown className="w-5 h-5 animate-bounce" />
      </div>
    </section>
  );
}
