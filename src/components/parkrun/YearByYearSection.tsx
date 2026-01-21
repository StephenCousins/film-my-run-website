'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { YearCard, YearBarChart } from './YearCard';
import type { YearlyStats } from '@/lib/parkrun-types';

interface YearByYearSectionProps {
  yearlyStats: YearlyStats[];
  cumulativeTotals: number[];
}

export function YearByYearSection({ yearlyStats, cumulativeTotals }: YearByYearSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile on mount
    setIsMobile(window.innerWidth < 1024);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const cards = cardsRef.current;
    if (!section || !cards || isMobile) return;

    const handleScroll = () => {
      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight;
      const windowHeight = window.innerHeight;

      const scrollStart = 0;
      const scrollEnd = sectionHeight - windowHeight;
      const scrolled = -rect.top;

      let progress = 0;
      if (scrolled >= scrollStart && scrolled <= scrollEnd) {
        progress = (scrolled - scrollStart) / (scrollEnd - scrollStart);
      } else if (scrolled > scrollEnd) {
        progress = 1;
      }

      setScrollProgress(Math.max(0, Math.min(1, progress)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isMobile]);

  // Calculate card translation based on scroll progress
  const cardWidth = 288; // w-72 = 18rem = 288px
  const gap = 16; // gap-4
  const cardsWidth = cardWidth * yearlyStats.length + gap * (yearlyStats.length - 1);
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const maxTranslate = Math.max(0, cardsWidth - viewportWidth + 600);
  const translateX = -scrollProgress * maxTranslate;

  // Mobile: simple scrolling
  if (isMobile) {
    return (
      <section id="years" className="py-12 lg:py-16">
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-xl bg-green-500/10">
              <Calendar className="w-5 h-5 text-green-500" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white">Year by Year</h2>
          </div>

          {/* Bar chart overview */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-8">
            <h3 className="text-sm text-zinc-400 mb-4">Runs per year</h3>
            <YearBarChart yearlyStats={yearlyStats} />
          </div>

          {/* Scrolling year cards */}
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {yearlyStats.map((stats, index) => (
              <YearCard
                key={stats.year}
                stats={stats}
                index={index}
                cumulativeTotal={cumulativeTotals[index]}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Desktop: scroll-triggered horizontal scroll
  return (
    <div
      ref={sectionRef}
      id="years"
      className="relative bg-zinc-950"
      style={{
        height: '200vh',
        zIndex: 30,
      }}
    >
      {/* Sticky container */}
      <div
        className="sticky top-20 h-[calc(100vh-5rem)] overflow-hidden bg-zinc-950"
        style={{ zIndex: 30 }}
      >
        {/* Content */}
        <div className="relative h-full flex items-center">
          {/* Left side - Header */}
          <div className="absolute lg:relative left-0 top-0 w-full lg:w-[400px] p-8 lg:p-12 lg:flex-shrink-0 z-20 bg-zinc-950">
            <div className="max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-green-500/10">
                  <Calendar className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-green-500 text-sm font-bold uppercase tracking-wider">
                  Year by Year
                </span>
              </div>
              <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                My parkrun
                <br />
                <span className="text-green-500">Journey</span>
              </h2>
              <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
                {yearlyStats.length} years of Saturday mornings, one run at a time.
              </p>

              {/* Mini bar chart */}
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Runs per year</h3>
                <YearBarChart yearlyStats={yearlyStats} />
              </div>
            </div>
          </div>

          {/* Right side - Scrolling cards */}
          <div className="flex-1 overflow-hidden pt-[350px] lg:pt-0">
            <div
              ref={cardsRef}
              className="hidden lg:flex items-center gap-4 pl-[450px] pr-[200px]"
              style={{
                transform: `translateX(${translateX}px)`,
                transition: 'transform 0.1s ease-out',
              }}
            >
              {yearlyStats.map((stats, index) => (
                <YearCard
                  key={stats.year}
                  stats={stats}
                  index={index}
                  cumulativeTotal={cumulativeTotals[index]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Scroll progress indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-2">
          <div className="w-32 h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-100"
              style={{ width: `${scrollProgress * 100}%` }}
            />
          </div>
          <span className="text-zinc-500 text-sm">Scroll</span>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
}
