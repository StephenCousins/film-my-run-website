import { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ShoeFinderClient from '@/components/shoes/ShoeFinderClient';

export const metadata: Metadata = {
  title: 'Running Shoe Finder',
  alternates: { canonical: 'https://filmmyrun.com/tools/shoe-finder' },
  description:
    'Find the best running shoes for trail and road. Aggregated review scores from RunRepeat, Runner\'s World, iRunFar and more — ranked to help you choose.',
  openGraph: {
    title: 'Running Shoe Finder | Film My Run',
    description: 'Ranked running shoes with aggregated scores from the world\'s top review sites.',
  },
};

export default function ShoeFinderPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 min-h-screen bg-background">
        {/* Hero */}
        <section className="relative py-20 lg:py-28 overflow-hidden">
          {/* Video background */}
          <div className="absolute inset-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/videos/shoe-finder-hero.mp4" type="video/mp4" />
            </video>
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[rgb(var(--color-background))]" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />
          </div>

          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-orange-400 text-sm font-medium">130+ Shoes Ranked</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
                Running Shoe Finder
              </h1>
              <p className="text-zinc-300 text-lg max-w-2xl mx-auto drop-shadow-md">
                Review scores aggregated from RunRepeat, Runner&apos;s World, iRunFar, Believe in the Run
                and more — ranked so you can find your perfect shoe faster.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-6 text-sm">
                <div className="bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-white/90 border border-white/10">Road &amp; Trail</div>
                <div className="bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-white/90 border border-white/10">Expert Reviews</div>
                <div className="bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-white/90 border border-white/10">Updated Monthly</div>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          <Suspense
            fallback={
              <div className="text-center py-20 text-[#71717a] dark:text-[#71717a]">
                Loading shoes...
              </div>
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
