import { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'WSFRL app: Help',
  alternates: { canonical: 'https://filmmyrun.com/wsfrl/support' },
  description: 'Help with the West Sussex Fun Run League app for iPhone: fixtures, results, league history and stats.',
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

export default function WsfrlSupportPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <div className="container py-12 lg:py-16">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">WSFRL app: Help</h1>
            <p className="text-secondary mb-10">
              Something wrong, confusing or missing? Email <Mail /> and I&apos;ll get back to you. A screenshot helps.
            </p>

            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <Q q="What does the app do?">
                <P>
                  It puts the West Sussex Fun Run League in your pocket. The next race and its start times, a race page
                  with a map, course and entry details, every result back to 2007, the club table for each season, and
                  stats for runners and clubs: most races, most wins, fastest times and league titles.
                </P>
              </Q>

              <Q q="My result is wrong, or my name is spelt wrong">
                <P>
                  Email <Mail /> with the race, the year and what&apos;s wrong. Results from before 2024 come from the
                  league&apos;s old spreadsheets, typed up by hand on the day, so the odd mistake is in there.
                </P>
              </Q>

              <Q q="Why am I listed twice, or sharing a page with someone else?">
                <P>
                  Runners are matched by name. If your name was spelt two ways over the years you&apos;ll have two pages,
                  and two people with the same name share one. Email me and I&apos;ll fix it in the next update.
                </P>
              </Q>

              <Q q="Why are some years missing a league table?">
                <P>
                  The archive has every race but no club table for 2007 or 2013. The 2020 season stopped after the
                  Hangover 5 because of Covid, and there was no league in 2021.
                </P>
              </Q>

              <Q q="How often are results updated?">
                <P>
                  Results are built into the app, so they arrive with app updates after the league publishes them on
                  wsfrl.co.uk. The About screen shows when the results were last updated.
                </P>
              </Q>

              <Q q="Is it free?">
                <P>It&apos;s free, with no ads, no subscriptions and no sign-in.</P>
              </Q>

              <Q q="Privacy">
                <P>
                  The app collects no personal data. The details are in the{' '}
                  <Link href="/wsfrl/privacy" className="text-orange-500 hover:text-orange-600">privacy policy</Link>.
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
