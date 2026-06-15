import { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ShoeFinderClient from '@/components/shoes/ShoeFinderClient';

export const metadata: Metadata = {
  title: 'Running Shoe Finder',
  alternates: { canonical: 'https://filmmyrun.co.uk/tools/shoe-finder' },
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
      <main className="min-h-screen bg-[#fafafa] dark:bg-[#09090b]">
        {/* Hero */}
        <section className="bg-gradient-to-br from-orange-500 to-orange-600 text-white py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 text-orange-200 text-sm font-medium mb-4">
              <span>Tools</span>
              <span>/</span>
              <span>Shoe Finder</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
              Running Shoe Finder
            </h1>
            <p className="text-orange-100 text-lg max-w-2xl">
              Review scores aggregated from RunRepeat, Runner&apos;s World, iRunFar, Believe in the Run
              and more — ranked so you can find your perfect shoe faster.
            </p>
            <div className="flex flex-wrap gap-4 mt-6 text-sm">
              <div className="bg-white/20 rounded-full px-4 py-1.5">130+ shoes</div>
              <div className="bg-white/20 rounded-full px-4 py-1.5">Road &amp; trail</div>
              <div className="bg-white/20 rounded-full px-4 py-1.5">Updated monthly</div>
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
