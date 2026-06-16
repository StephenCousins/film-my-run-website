import { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ShoeFinderClient from '@/components/shoes/ShoeFinderClient';
import ReviewVideos from '@/components/shoes/ReviewVideos';

export const metadata: Metadata = {
  title: 'Running Shoe Finder',
  alternates: { canonical: 'https://filmmyrun.co.uk/tools/shoe-finder' },
  description:
    "Find the best running shoes for trail and road. Aggregated review scores from RunRepeat, Runner's World, iRunFar and more — ranked to help you choose.",
  openGraph: {
    title: 'Running Shoe Finder | Film My Run',
    description: "Ranked running shoes with aggregated scores from the world's top review sites.",
  },
};

export default function ShoeFinderPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#09090b]">

        {/* Hero — dark cinematic, matching main site */}
        <section className="relative bg-[#09090b] text-white pt-24 pb-16 px-4 overflow-hidden">
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                'linear-gradient(#f88c00 1px, transparent 1px), linear-gradient(to right, #f88c00 1px, transparent 1px)',
              backgroundSize: '72px 72px',
            }}
          />
          {/* Radial glow */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          {/* Bottom fade into content */}
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-b from-transparent to-[#09090b]" />

          <div className="relative max-w-6xl mx-auto">
            {/* Pill tag */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-full border border-orange-500/20 mb-8">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-orange-400 text-sm font-medium tracking-wide">Running Tools</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight mb-6">
              Find Your<br />
              <span className="text-orange-500">Perfect Shoe</span>
            </h1>

            <p className="text-zinc-400 text-lg max-w-2xl mb-10 leading-relaxed">
              Review scores aggregated from RunRepeat, Runner&apos;s World, iRunFar and
              Believe in the Run — ranked so you can find your next favourite shoe faster.
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap gap-10">
              {[
                ['124+', 'Shoes Ranked'],
                ['5', 'Expert Sources'],
                ['Road & Trail', 'All Terrain'],
                ['Monthly', 'Updated'],
              ].map(([value, label]) => (
                <div key={label}>
                  <div className="text-2xl font-bold font-mono text-white">{value}</div>
                  <div className="text-xs text-zinc-500 mt-0.5 uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Video review strip */}
        <ReviewVideos />

        {/* Shoe finder */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          <Suspense
            fallback={
              <div className="text-center py-20 text-zinc-500">Loading shoes...</div>
            }
          >
            <ShoeFinderClient />
          </Suspense>
        </section>

      </main>
      <Footer />
    </>
  );
}
