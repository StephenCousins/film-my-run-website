import { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Wilson Index: Help',
  alternates: { canonical: 'https://filmmyrun.com/wilson/support' },
  description: 'Help with the Wilson Index app for iPhone: event numbers, Match, your Wilson index and the Saturday plan.',
};

const CONTACT = 'stephen@filmmyrun.com';

function Q({ q, children }: { q: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-xl font-bold text-foreground mb-3">{q}</h2>
      {children}
    </section>
  );
}
const P = ({ children }: { children: ReactNode }) => <p className="text-secondary mb-4">{children}</p>;
const Mail = () => (
  <a href={`mailto:${CONTACT}`} className="text-orange-500 hover:text-orange-600">
    {CONTACT}
  </a>
);

export default function WilsonSupportPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <div className="container py-12 lg:py-16">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">Wilson Index: Help</h1>
            <p className="text-secondary mb-10">
              Something wrong, confusing or missing? Email <Mail /> and I&apos;ll get back to you. A screenshot helps.
            </p>

            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <Q q="What does the app do?">
                <P>
                  It looks ahead. Pick your home parkrun and how far you&apos;ll travel, and it shows the Saturdays worth
                  planning for: the number your Wilson index needs next, a Match, milestones like #100 and #250,
                  palindromes, events you haven&apos;t done, anniversaries and Christmas and New Year runs.
                </P>
              </Q>

              <Q q="What's a Wilson index?">
                <P>
                  The highest number N where you&apos;ve run event #1, #2, #3 and so on, all the way to #N, at any events. It&apos;s
                  named after Dave Wilson, the parkrun tourist who came up with it.
                </P>
              </Q>

              <Q q="What's a Match?">
                <P>
                  Running your Nth parkrun at an event&apos;s Nth run: your 100th parkrun at an event&apos;s #100, say. The app
                  shows every Match you could still reach, including ones where you miss a Saturday or two to let an
                  event catch up with you.
                </P>
              </Q>

              <Q q="How do I add my results?">
                <P>
                  On the You tab, tap Import from parkrun and enter your parkrun ID. The app opens your results page on
                  parkrun&apos;s site and reads it on your phone. You can also paste your results or add runs by hand.
                </P>
              </Q>

              <Q q="Where do the numbers come from?">
                <P>
                  From parkrun&apos;s published statistics, cancellations and anniversaries, updated every morning. Numbers
                  further ahead are predictions: a cancellation announced later moves every number after it. That&apos;s what
                  the &ldquo;≈&rdquo; and &ldquo;likely&rdquo; labels mean. Always check the event&apos;s own page before you travel.
                </P>
              </Q>

              <Q q="An event's number looks wrong">
                <P>
                  Email <Mail /> with the event and the date, and I&apos;ll look into it. Late results and newly announced
                  cancellations are the usual reasons, and they sort themselves out with the next update.
                </P>
              </Q>

              <Q q="Is it an official parkrun app?">
                <P>
                  No. Wilson Index is made by Stephen Cousins at Film My Run and is not affiliated with or endorsed by
                  parkrun. It&apos;s free, with no ads and no subscriptions.
                </P>
              </Q>

              <Q q="Privacy">
                <P>
                  Your data stays on your phone. The details are in the{' '}
                  <Link href="/wilson/privacy" className="text-orange-500 hover:text-orange-600">privacy policy</Link>.
                </P>
              </Q>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
