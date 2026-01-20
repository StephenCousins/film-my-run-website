import { Metadata } from 'next';
import Link from 'next/link';
import { Radio, Calendar, MapPin, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Live Events',
  description: 'Watch live coverage of running events and races.',
};

export default function LivePage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-full border border-red-500/30 mb-6">
                <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="text-red-400 text-sm font-medium">Live Events</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Live Race Coverage
              </h1>

              <p className="text-lg text-zinc-400 mb-12">
                Watch live streams and real-time coverage of running events.
                Check back for upcoming live broadcasts.
              </p>

              <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
                <h2 className="font-display text-xl font-semibold text-white mb-4">
                  No Live Events Right Now
                </h2>
                <p className="text-zinc-400 mb-6">
                  There are no live events currently streaming. Follow us on social media
                  to get notified when we go live.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
                >
                  Get Notified
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="mt-16">
                <h3 className="font-display text-lg font-semibold text-white mb-6">
                  Upcoming Events
                </h3>
                <div className="text-zinc-500 text-sm">
                  No upcoming live events scheduled. Check back soon!
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
