import type { Metadata } from 'next';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import JoinTheClub from '@/components/club/JoinTheClub';
import { CLUB_MONTHLY_PENCE, CLUB_YEARLY_PENCE } from '@/lib/club/subscription';

export const metadata: Metadata = {
  title: 'FMR Club',
  alternates: { canonical: 'https://filmmyrun.com/club' },
  description:
    'Support Film My Run for £2.99 a month: 15% off everything in the shop, the ultra training plans, Ask Stephen and Ultra Race Pacing. The 5K to marathon plans stay free.',
};

const money = (pence: number) => `£${(pence / 100).toFixed(2).replace(/\.00$/, '')}`;

const perks = [
  // Order is Stephen's (28 Sep 2026). 5K to marathon plans, with their paces, are free for
  // everyone; the ultra plans are Club only.
  ['15% off the shop', 'On everything, for as long as you are a member. A free account gets 10%.'],
  ['All the training plans', 'The 5K, 10K, half marathon and marathon plans are free for everyone, paces included. FMR Club adds the ultra plans: 50K, 100K and 100 miles, with every session at your own paces, worked out from a recent road race.'],
  ['Ask Stephen', 'A one-to-one thread with me about anything running. I read and answer them myself.'],
  ['Ultra Race Pacing', 'Your arrival time at every checkpoint, for ultras in our race library or your own course, built from 7,687 real race finishes. On the day, check in at each aid station to see how far ahead or behind you are, print a wrist band, and keep the widget on your Lock Screen.'],
  ['It keeps the lights on', 'The films, the calculators, the predictor and the road training plans are free and stay free. This is what pays for them.'],
];

export default function ClubPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 lg:pt-24">
        {/* The same hero shape as the shop: the photo behind, a scrim dark
            enough for white text, and the join buttons still above the fold. */}
        <section className="relative border-b border-border overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/about-hero.jpg"
              alt="Stephen running a mountain trail in the Canary Islands"
              fill
              className="object-cover object-center"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/65 to-[rgb(var(--color-background))]" />
          </div>
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">FMR Club</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-4 mb-6">
              Support the Channel for only {money(CLUB_MONTHLY_PENCE)} a month
            </h1>
            <p className="text-lg text-zinc-200 leading-relaxed max-w-2xl">
              Film My Run has always given the tools away: the calculators, the race predictor built on 2.4 million
              results, and training plans from 5km to marathon distance. That does not change. FMR Club is for the people
              who want to chip in anyway, and it comes with the things that take real work to run.
            </p>
            <div className="mt-10">
              <JoinTheClub monthlyPence={CLUB_MONTHLY_PENCE} yearlyPence={CLUB_YEARLY_PENCE} />
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-8">What you get</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {perks.map(([title, body]) => (
              <div key={title} className="p-5 rounded-2xl border border-border bg-surface-secondary">
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-secondary text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted mt-8 max-w-2xl">
            Cancel whenever you like and you keep FMR Club until the period you have paid for runs out. Your membership
            works in the app as well as here — sign in with the same email.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
