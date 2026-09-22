import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import JoinTheClub from '@/components/club/JoinTheClub';
import { CLUB_MONTHLY_PENCE, CLUB_YEARLY_PENCE } from '@/lib/club/subscription';

export const metadata: Metadata = {
  title: 'The Club',
  alternates: { canonical: 'https://filmmyrun.com/club' },
  description:
    'Support Film My Run for £2.99 a month: structured training plans, personalised paces, race-day pacing, Ask Stephen, and 15% off everything in the shop.',
};

const money = (pence: number) => `£${(pence / 100).toFixed(2).replace(/\.00$/, '')}`;

const perks = [
  ['Training plans that explain themselves', 'Every plan built from 2.4 million real race results, with pace charts and a guide to each session, not just a grid of numbers.'],
  ['Paces that are yours', 'Sessions worked out from what you have actually run, rather than a percentage of a time you hope to hit.'],
  ['Race-day pacing', 'Save a pacing plan, take the checkpoint schedule and wrist band to the start line, and keep the widget on your phone.'],
  ['Ask Stephen', 'A one-to-one thread with me about anything running. I read and answer them myself.'],
  ['15% off the shop', 'On everything, for as long as you are a member. A free account gets 10%.'],
  ['It keeps the lights on', 'The films, the calculators and the predictor are free and stay free. This is what pays for them.'],
];

export default function ClubPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">The Club</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mt-4 mb-6">
              {money(CLUB_MONTHLY_PENCE)} a month, and the running stays free for everyone
            </h1>
            <p className="text-lg text-secondary leading-relaxed max-w-2xl">
              Film My Run has always given the tools away: the calculators, the race predictor built on 2.4 million
              results, a training plan for whatever you are aiming at. That does not change. The Club is for the people
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
            Cancel whenever you like and you keep the Club until the period you have paid for runs out. Your membership
            works in the app as well as here — sign in with the same email.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
