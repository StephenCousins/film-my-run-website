import { Metadata } from 'next';
import type { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'WSFRL app: Privacy Policy',
  alternates: { canonical: 'https://filmmyrun.com/wsfrl/privacy' },
  description: 'How the West Sussex Fun Run League app for iPhone handles your data. Short version: it collects none.',
};

const CONTACT = 'stephen@filmmyrun.com';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">{title}</h2>
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

export default function WsfrlPrivacyPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <div className="container py-12 lg:py-16">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-8">WSFRL app: Privacy Policy</h1>

            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <p className="text-secondary text-sm mb-8">Last updated: 31 October 2026</p>

              <Section title="The short version">
                <P>
                  The West Sussex Fun Run League app has no account, no sign-in, no analytics and no ads. It doesn&apos;t
                  collect, store or share any personal information about you.
                </P>
              </Section>

              <Section title="1. Who we are">
                <P>
                  The app is made by Stephen Cousins (Film My Run) in the United Kingdom. Questions about this policy go
                  to <Mail />.
                </P>
              </Section>

              <Section title="2. Results and fixtures">
                <P>
                  Fixtures, race information and results from 2007 onwards are built into the app. They come from the
                  league&apos;s archive of race results and from wsfrl.co.uk. They include runners&apos; names, clubs and
                  finishing times, as published by the league and its member clubs after each race.
                </P>
                <P>
                  If you&apos;d like your name changed or taken out of the results, email <Mail /> and it will be removed
                  from the next update of the app.
                </P>
              </Section>

              <Section title="3. Maps">
                <P>
                  A race page shows a map of the venue. To place the pin, the app sends the venue&apos;s postcode to Apple
                  Maps. Nothing about you goes with it. If you tap Directions, Apple Maps opens and Apple&apos;s privacy
                  policy covers what happens there.
                </P>
              </Section>

              <Section title="4. Links">
                <P>Links to wsfrl.co.uk and club websites open in Safari. Those sites have their own privacy policies.</P>
              </Section>

              <Section title="5. Crash reports">
                <P>
                  If you&apos;ve allowed it on your iPhone, Apple may share anonymous crash reports and usage figures with
                  us. They don&apos;t identify you. You can change this in the iPhone&apos;s Settings under Privacy &amp;
                  Security, Analytics &amp; Improvements.
                </P>
              </Section>

              <Section title="6. Emailing us">
                <P>If you email <Mail />, we keep your email so we can reply, and delete it on request.</P>
              </Section>

              <Section title="7. Children">
                <P>
                  The app has no accounts and collects no personal data from anyone, children included. Junior race
                  results appear as the league publishes them.
                </P>
              </Section>

              <Section title="8. Changes">
                <P>If this policy changes in a way that matters, we&apos;ll say so on this page and in the app&apos;s release notes.</P>
              </Section>

              <Section title="9. Contact">
                <P>
                  Stephen Cousins, Film My Run: <Mail />
                </P>
              </Section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
