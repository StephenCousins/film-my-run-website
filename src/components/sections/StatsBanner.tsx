'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// STATS DATA
// ============================================

const stats = [
  {
    value: 500,
    suffix: '+',
    label: 'Races Filmed',
    description: 'From parkruns to ultras',
  },
  {
    value: 15,
    suffix: '',
    label: 'Years Running',
    description: 'Documenting since 2011',
  },
  {
    value: 250,
    suffix: 'K',
    label: 'Weekly Users',
    description: 'Using our tools',
  },
  {
    value: 1,
    suffix: 'M+',
    label: 'Video Views',
    description: 'Across all platforms',
  },
];

// ============================================
// ANIMATED COUNTER HOOK
// ============================================

function useAnimatedCounter(
  endValue: number,
  duration: number = 2000,
  startOnView: boolean = true
) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView || hasStarted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasStarted(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted && startOnView) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function (ease-out-expo)
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeOutExpo * endValue));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [endValue, duration, hasStarted, startOnView]);

  return { count, ref };
}

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  value: number;
  suffix: string;
  label: string;
  description: string;
  index: number;
}

function StatCard({ value, suffix, label, description, index }: StatCardProps) {
  const { count, ref } = useAnimatedCounter(value, 2000 + index * 200);

  return (
    <div
      ref={ref}
      className="stat-card relative group opacity-100"
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-500/0 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />

      <div className="relative p-6 lg:p-8 text-center">
        {/* Number */}
        <div className="font-mono text-4xl sm:text-5xl lg:text-6xl font-bold text-orange-500 mb-2 tracking-tight">
          {count}
          <span className="text-orange-400">{suffix}</span>
        </div>

        {/* Label */}
        <div className="font-display text-lg font-semibold text-zinc-900 dark:text-white mb-1">
          {label}
        </div>

        {/* Description */}
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </div>
      </div>
    </div>
  );
}

// ============================================
// STATS BANNER COMPONENT
// ============================================

export default function StatsBanner() {
  const sectionRef = useRef<HTMLElement>(null);

  // Initialize GSAP scroll animation
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
          // Stagger animation for stat cards
          gsap.fromTo(
            section.querySelectorAll('.stat-card'),
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              stagger: 0.1,
              duration: 0.8,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: section,
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
      className="relative py-16 lg:py-20 bg-zinc-100/50 dark:bg-zinc-900/50 overflow-hidden"
      style={{ position: 'relative', zIndex: 1 }}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f88c00' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="container relative">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-3">
            By The Numbers
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
            Over a decade of capturing running stories and building tools for the community.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} {...stat} index={index} />
          ))}
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/2 left-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
      </div>
    </section>
  );
}
