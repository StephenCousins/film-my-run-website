'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Brain, Target, Calendar, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// FEATURES DATA
// ============================================

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Plans',
    description: 'Personalized training adapted to your goals and fitness level',
  },
  {
    icon: Target,
    title: 'Smart Adjustments',
    description: 'Plans that adapt based on your progress and recovery',
  },
  {
    icon: Calendar,
    title: 'Flexible Scheduling',
    description: 'Fits around your life, not the other way around',
  },
  {
    icon: Zap,
    title: 'Race-Ready',
    description: 'Proven periodization for peak performance on race day',
  },
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
            src="/images/training-bg.svg"
            alt="Runner training"
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
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span className="text-orange-400 text-sm font-medium">AI-Powered Training</span>
            </div>

            {/* Title */}
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Train Smarter,
              <br />
              <span className="text-orange-500">Run Faster</span>
            </h2>

            {/* Description */}
            <p className="text-zinc-300 text-lg leading-relaxed mb-8 max-w-lg">
              The Marathon Plan App uses AI to create personalized training plans
              that adapt to your progress. Whether you're targeting your first 5K or
              chasing a Boston Qualifier, we've got you covered.
            </p>

            {/* Stats */}
            <div className="flex gap-8 mb-10">
              <div>
                <div className="font-mono text-3xl font-bold text-orange-500">93%</div>
                <div className="text-zinc-400 text-sm">Hit their goal</div>
              </div>
              <div>
                <div className="font-mono text-3xl font-bold text-orange-500">12K+</div>
                <div className="text-zinc-400 text-sm">Active users</div>
              </div>
              <div>
                <div className="font-mono text-3xl font-bold text-orange-500">4.8</div>
                <div className="text-zinc-400 text-sm">Star rating</div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/training"
                className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-all hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/training/how-it-works"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-full border border-white/20 hover:bg-white/20 transition-all"
              >
                How It Works
              </Link>
            </div>
          </div>

          {/* Right column - Features */}
          <div className="training-features">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="training-feature p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-orange-500/30 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-orange-500" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* App preview mockup */}
            <div className="mt-8 relative">
              <div className="relative mx-auto max-w-[280px]">
                {/* Phone frame */}
                <div className="relative aspect-[9/19] rounded-[2.5rem] border-4 border-zinc-700 bg-zinc-900 overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-b from-orange-500/20 to-transparent" />
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-zinc-800 rounded-full" />

                  {/* App content placeholder */}
                  <div className="absolute inset-6 top-12 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
                    <div className="text-center">
                      <div className="font-display text-2xl font-bold text-white mb-2">
                        Marathon Plan
                      </div>
                      <div className="text-orange-500 font-mono text-sm">
                        AI Coach
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glow effect */}
                <div className="absolute inset-0 -z-10 blur-3xl opacity-30 bg-orange-500 rounded-full scale-75" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
