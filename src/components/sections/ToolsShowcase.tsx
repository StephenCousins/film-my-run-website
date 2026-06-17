'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Calculator,
  Timer,
  Trophy,
  Map,
  BarChart3,
  Target,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TOOLS DATA
// ============================================

const tools = [
  {
    name: 'Pace Calculator',
    description: 'Convert between pace, speed, and time for any distance',
    icon: Calculator,
    color: 'from-orange-500 to-orange-600',
    href: '/tools/calculators#pace',
    users: '50K+',
  },
  {
    name: 'Race Predictor',
    description: 'Predict your race times based on recent performances',
    icon: Target,
    color: 'from-blue-500 to-blue-600',
    href: '/tools/calculators#predictor',
    users: '35K+',
  },
  {
    name: 'Splits Calculator',
    description: 'Plan your race with custom split strategies',
    icon: Timer,
    color: 'from-purple-500 to-purple-600',
    href: '/tools/calculators#splits',
    users: '28K+',
  },
  {
    name: 'Route Comparison',
    description: 'Compare race routes side by side with elevation and distance',
    icon: Map,
    color: 'from-green-500 to-green-600',
    href: '/tools/route-comparison',
    users: '45K+',
  },
  {
    name: 'How Fast Are You',
    description: 'Look up any runner and see how their times compare',
    icon: Trophy,
    color: 'from-amber-500 to-amber-600',
    href: '/tools/how-fast-am-i',
    users: '60K+',
  },
  {
    name: 'Training Plan App',
    description: 'Personalized marathon training plans tailored to your goals',
    icon: BarChart3,
    color: 'from-red-500 to-red-600',
    href: '/training',
    users: '22K+',
  },
  {
    name: 'Power Calculator',
    description: 'Estimate running power and training zones',
    icon: Zap,
    color: 'from-cyan-500 to-cyan-600',
    href: '/tools/calculators#power',
    users: '15K+',
  },
];

// ============================================
// TOOL CARD COMPONENT
// ============================================

interface ToolCardProps {
  tool: typeof tools[0];
  index: number;
}

function ToolCard({ tool, index }: ToolCardProps) {
  const Icon = tool.icon;

  return (
    <Link
      href={tool.href}
      className="tool-card card-interactive p-6 w-[280px] sm:w-[320px] flex-shrink-0"
    >
      {/* Icon */}
      <div
        className={cn(
          'w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 group-hover:scale-110 transition-transform',
          tool.color
        )}
      >
        <Icon className="w-7 h-7 text-white" />
      </div>

      {/* Content */}
      <h3 className="font-display text-xl font-semibold text-foreground mb-2 group-hover:text-brand transition-colors">
        {tool.name}
      </h3>
      <p className="text-sm text-secondary mb-4 line-clamp-2">
        {tool.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">
          {tool.users} weekly users
        </span>
        <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center group-hover:bg-brand transition-colors">
          <ArrowRight className="w-4 h-4 text-brand group-hover:text-white transition-colors" />
        </div>
      </div>
    </Link>
  );
}

// ============================================
// TOOLS SHOWCASE SECTION
// ============================================

export default function ToolsShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const cards = cardsRef.current;
    if (!section || !cards) return;

    // Only run on desktop
    if (window.innerWidth < 1024) return;

    const handleScroll = () => {
      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight;
      const windowHeight = window.innerHeight;

      // Calculate how far we've scrolled through the section
      const scrollStart = 0;
      const scrollEnd = sectionHeight - windowHeight;
      const scrolled = -rect.top;

      // Calculate progress (0 to 1)
      let progress = 0;
      if (scrolled >= scrollStart && scrolled <= scrollEnd) {
        progress = (scrolled - scrollStart) / (scrollEnd - scrollStart);
      } else if (scrolled > scrollEnd) {
        progress = 1;
      }

      setScrollProgress(Math.max(0, Math.min(1, progress)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Calculate card translation based on scroll progress
  const cardsWidth = 320 * tools.length + 32 * (tools.length - 1);
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const maxTranslate = Math.max(0, cardsWidth - viewportWidth + 600);
  const translateX = -scrollProgress * maxTranslate;

  return (
    <>
      {/* ========== MOBILE LAYOUT (< lg) ========== */}
      <div className="lg:hidden py-16 relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/hero/running-tools-bg.jpg)' }}
        />
        <div className="absolute inset-0 bg-black/75" />

        {/* Header */}
        <div className="relative px-6 mb-8">
          <span className="text-brand text-sm font-bold uppercase tracking-wider">
            Free Tools
          </span>
          <h2 className="font-display text-4xl font-bold text-white mt-3 mb-4 leading-tight">
            Built for <span className="text-brand">Runners</span>
          </h2>
          <p className="text-zinc-300 text-base mb-6 leading-relaxed">
            Powerful calculators and tools used by over 250,000 runners every week.
            All free, no signup required.
          </p>
        </div>

        {/* Horizontal snap-scroll cards */}
        <div className="relative overflow-x-auto overflow-y-hidden -mx-0">
          <div className="flex gap-4 snap-x snap-mandatory pl-6 pb-4 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            {tools.map((tool, index) => (
              <div key={tool.name} className="snap-start flex-shrink-0">
                <ToolCard tool={tool} index={index} />
              </div>
            ))}
            <div className="flex-shrink-0 w-6" />
          </div>
        </div>

        {/* CTA */}
        <div className="relative px-6 mt-6">
          <Link
            href="/tools/calculators"
            className="btn-primary"
          >
            Explore All Tools
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* ========== DESKTOP LAYOUT (>= lg) ========== */}
      <div
        ref={sectionRef}
        className="relative hidden lg:block"
        style={{
          height: '200vh',
          zIndex: 50,
        }}
      >
        {/* Sticky container */}
        <div
          className="sticky top-0 h-screen overflow-hidden"
          style={{ zIndex: 50 }}
        >
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(/images/hero/running-tools-bg.jpg)' }}
          />
          <div className="absolute inset-0 bg-black/75" />

          {/* Content */}
          <div className="relative h-full flex items-center">
            {/* Left side - Header */}
            <div className="relative w-[450px] p-16 flex-shrink-0 z-20">
              <div className="max-w-sm">
                <span className="text-brand text-sm font-bold uppercase tracking-wider">
                  Free Tools
                </span>
                <h2 className="font-display text-5xl lg:text-6xl font-bold text-white mt-3 mb-6 leading-tight">
                  Built for
                  <br />
                  <span className="text-brand">Runners</span>
                </h2>
                <p className="text-zinc-300 text-lg mb-8 leading-relaxed">
                  Powerful calculators and tools used by over 250,000 runners every week.
                  All free, no signup required.
                </p>
                <Link
                  href="/tools/calculators"
                  className="btn-primary"
                >
                  Explore All Tools
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Right side - Scrolling cards */}
            <div className="flex-1 overflow-hidden">
              <div
                ref={cardsRef}
                className="flex items-center gap-8 pl-[500px] pr-[200px]"
                style={{
                  transform: `translateX(${translateX}px)`,
                  transition: 'transform 0.1s ease-out',
                }}
              >
                {tools.map((tool, index) => (
                  <ToolCard key={tool.name} tool={tool} index={index} />
                ))}
              </div>
            </div>
          </div>

          {/* Scroll progress indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand transition-all duration-100"
                style={{ width: `${scrollProgress * 100}%` }}
              />
            </div>
            <span className="text-zinc-400 text-sm">Scroll</span>
          </div>
        </div>
      </div>
    </>
  );
}
