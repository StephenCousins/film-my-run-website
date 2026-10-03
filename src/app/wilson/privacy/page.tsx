import { Metadata } from 'next';
import type { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Wilson Index: Privacy Policy',
  alternates: { canonical: 'https://filmmyrun.com/wilson/privacy' },
  description: 'How the Wilson Index app for iPhone handles your data. Short version: it stays on your phone.',
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
const List = ({ children }: { children: ReactNode }) => <ul className="list-disc list-inside text-secondary space-y-2 mb-4">{children}</ul>;
const Mail = () => (
  <a href={`mailto:${CONTACT}`} className="text-orange-500 hover:text-orange-600">
    {CONTACT}
  </a>
);

export default function WilsonPrivacyPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <div className="container py-12 lg:py-16">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-8">Wilson Index: Privacy Policy</h1>

            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <p className="text-secondary text-sm mb-8">Last updated: 3 October 2026</p>

              <Section title="The short version">
                <P>
                  Wilson Index doesn&apos;t collect any personal data. There&apos;s no account, no sign-in, no analytics
                  and no ads. Everything you put into the app stays on your iPhone.
                </P>
              </Section>

              <Section title="1. Who we are">
                <P>
                  Wilson Index is made by Stephen Cousins (Film My Run) in the United Kingdom. Questions about this
                  policy go to <Mail />. Wilson Index is not an official parkrun app and is not affiliated with or
                  endorsed by parkrun.
                </P>
              </Section>

              <Section title="2. What stays on your phone">
                <List>
                  <li>Your home parkrun, how far you&apos;ll travel and the number types you care about</li>
                  <li>Your plan: the events you&apos;ve chosen and the Saturdays you&apos;re away</li>
                  <li>Your parkrun results, if you add them, which the app uses for your Wilson index, Match and new events</li>
                </List>
                <P>
                  None of this is sent to us or anyone else. Deleting the app deletes it. The home screen widget reads
                  the same data on the phone.
                </P>
              </Section>

              <Section title="3. Importing your results">
                <P>
                  If you import from parkrun, the app opens parkrun&apos;s own results page for your parkrun ID inside the
                  app and reads the table on your phone. That page comes straight from parkrun, so parkrun&apos;s privacy
                  policy covers it. Nothing from it reaches us. You can also paste your results in or type them by hand.
                </P>
              </Section>

              <Section title="4. Event data">
                <P>
                  Once a day the app downloads the latest event numbers, cancellations and anniversaries: a public file
                  hosted on Cloudflare. Like any download it comes from your phone&apos;s internet address, which Cloudflare
                  handles as our hosting provider. The request carries nothing about you, and we don&apos;t log it.
                </P>
              </Section>

              <Section title="5. Notifications">
                <P>
                  The Friday reminder and the Monday heads-ups are scheduled by the app on your phone. There&apos;s no
                  notification server, so we never have your device token. You can turn each one off in Settings.
                </P>
              </Section>

              <Section title="6. Crash reports">
                <P>
                  If you&apos;ve allowed it on your iPhone, Apple may share anonymous crash reports and usage figures with
                  us. They don&apos;t identify you. You can change this in the iPhone&apos;s Settings under Privacy &amp; Security,
                  Analytics &amp; Improvements.
                </P>
              </Section>

              <Section title="7. Emailing us">
                <P>
                  If you email <Mail />, we keep your email so we can reply, and delete it on request.
                </P>
              </Section>

              <Section title="8. Children">
                <P>The app collects no personal data from anyone, children included.</P>
              </Section>

              <Section title="9. Changes">
                <P>If this policy changes in a way that matters, we&apos;ll say so on this page and in the app&apos;s release notes.</P>
              </Section>

              <Section title="10. Contact">
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
