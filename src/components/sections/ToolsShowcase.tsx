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
    name: 'Race Dashboard',
    description: 'Track and analyze all your race results in one place',
    icon: BarChart3,
    color: 'from-green-500 to-green-600',
    href: '/races',
    users: '45K+',
  },
  {
    name: 'Parkrun Stats',
    description: 'Deep dive into your parkrun history and compare with friends',
    icon: Trophy,
    color: 'from-amber-500 to-amber-600',
    href: '/tools/parkrun',
    users: '60K+',
  },
  {
    name: 'Race Map',
    description: 'Visualize race routes with elevation and key markers',
    icon: Map,
    color: 'from-red-500 to-red-600',
    href: '/tools/race-map',
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
      className="tool-card group relative p-6 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-orange-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 w-[320px] flex-shrink-0"
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
      <h3 className="font-display text-xl font-semibold text-zinc-900 dark:text-white mb-2 group-hover:text-orange-500 transition-colors">
        {tool.name}
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
        {tool.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
          {tool.users} weekly users
        </span>
        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500 transition-colors">
          <ArrowRight className="w-4 h-4 text-orange-500 group-hover:text-white transition-colors" />
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
      // Start when section top reaches viewport top
      // End when section bottom reaches viewport bottom
      const scrollStart = 0;
      const scrollEnd = sectionHeight - windowHeight;

      // rect.top is negative when section top is above viewport
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
  const cardsWidth = 320 * tools.length + 32 * (tools.length - 1); // card width + gaps
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const maxTranslate = Math.max(0, cardsWidth - viewportWidth + 600); // Extra padding
  const translateX = -scrollProgress * maxTranslate;

  return (
    <div
      ref={sectionRef}
      className="relative bg-zinc-900"
      style={{
        height: '200vh', // Double height for scroll room
        zIndex: 50,
      }}
    >
      {/* Sticky container */}
      <div
        className="sticky top-0 h-screen overflow-hidden bg-zinc-900"
        style={{ zIndex: 50 }}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-zinc-900" />

        {/* Content */}
        <div className="relative h-full flex items-center">
          {/* Left side - Header */}
          <div className="absolute lg:relative left-0 top-0 w-full lg:w-[450px] p-8 lg:p-16 lg:flex-shrink-0 z-20 bg-zinc-900">
            <div className="max-w-sm">
              <span className="text-orange-500 text-sm font-bold uppercase tracking-wider">
                Free Tools
              </span>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 mb-6 leading-tight">
                Built for
                <br />
                <span className="text-orange-500">Runners</span>
              </h2>
              <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
                Powerful calculators and tools used by over 250,000 runners every week.
                All free, no signup required.
              </p>
              <Link
                href="/tools/calculators"
                className="inline-flex items-center gap-3 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-all hover:scale-105 group"
              >
                Explore All Tools
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Right side - Scrolling cards */}
          <div className="flex-1 overflow-hidden pt-[300px] lg:pt-0">
            {/* Mobile: Vertical stack */}
            <div className="lg:hidden px-4 pb-8 space-y-4">
              {tools.map((tool, index) => (
                <ToolCard key={tool.name} tool={tool} index={index} />
              ))}
            </div>

            {/* Desktop: Horizontal scroll */}
            <div
              ref={cardsRef}
              className="hidden lg:flex items-center gap-8 pl-[500px] pr-[200px]"
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
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-2">
          <div className="w-32 h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-100"
              style={{ width: `${scrollProgress * 100}%` }}
            />
          </div>
          <span className="text-zinc-500 text-sm">Scroll</span>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
}
