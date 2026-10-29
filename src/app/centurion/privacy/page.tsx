import { Metadata } from 'next';
import type { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Centurion app: Privacy Policy',
  alternates: { canonical: 'https://filmmyrun.com/centurion/privacy' },
  description: 'How the Centurion app for iPhone handles your data. Short version: it stays on your phone. No account, no tracking.',
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
const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} className="text-orange-500 hover:text-orange-600">
    {children}
  </a>
);

export default function CenturionPrivacyPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <div className="container py-12 lg:py-16">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-8">Centurion app: Privacy Policy</h1>

            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <p className="text-secondary text-sm mb-8">Last updated: 29 October 2026</p>

              <Section title="The short version">
                <P>
                  The Centurion app has no account, no sign-in, no analytics and no ads. Everything you put into the app
                  stays on your iPhone. We never receive it.
                </P>
              </Section>

              <Section title="1. Who we are">
                <P>
                  This version of the Centurion app is made by Stephen Cousins (Film My Run) in the United Kingdom, as a
                  proposal for Centurion Running. It is not yet an official Centurion Running app. Questions about this
                  policy go to <Mail />.
                </P>
              </Section>

              <Section title="2. What stays on your phone">
                <List>
                  <li>The name you claim in Passport</li>
                  <li>The races you tell the app you&apos;re entered in</li>
                  <li>The runners you follow in Race Live</li>
                  <li>Your packed kit lists, crew targets and appearance setting</li>
                </List>
                <P>None of this is sent to us or anyone else. Deleting the app deletes it.</P>
              </Section>

              <Section title="3. Race results">
                <P>
                  The results, splits, course records, race details, photos and badges in the app come from Centurion
                  Running&apos;s public website, centurionrunning.com, and are built into the app. Centurion publishes
                  results and keeps them online, as its{' '}
                  <A href="https://www.centurionrunning.com/post/data">Data Sharing page</A> explains. Searching for
                  your name happens on your phone and sends nothing anywhere.
                </P>
                <P>
                  If you would like a result changed or removed, please contact Centurion Running, who publish it, and
                  email <Mail /> so we can remove it from the app too.
                </P>
              </Section>

              <Section title="4. The podcast">
                <P>
                  The Listen tab downloads the Centurion Running Podcast feed and episodes from Centurion&apos;s own
                  servers and their podcast host. Like any download, those servers see your phone&apos;s internet address.
                  The request carries nothing about you.
                </P>
              </Section>

              <Section title="5. Maps and links">
                <P>
                  Course maps are drawn with Apple Maps, and directions to aid stations open in the Maps app, under
                  Apple&apos;s privacy policy. Links to Centurion&apos;s website, store and coaching, and to OpenTracking&apos;s
                  live tracking pages, open in your web browser. Those sites have their own privacy policies.
                </P>
              </Section>

              <Section title="6. Notifications and the lock screen">
                <P>
                  Checkpoint notifications and the lock screen Live Activity are created by the app on your phone.
                  There&apos;s no notification server, so we never have your device token. You can turn notifications off
                  in the iPhone&apos;s Settings.
                </P>
              </Section>

              <Section title="7. Crash reports">
                <P>
                  If you&apos;ve allowed it on your iPhone, Apple may share anonymous crash reports and usage figures with
                  us. They don&apos;t identify you. You can change this in the iPhone&apos;s Settings under Privacy &amp; Security,
                  Analytics &amp; Improvements.
                </P>
              </Section>

              <Section title="8. Emailing us">
                <P>
                  If you email <Mail />, we keep your email so we can reply, and delete it on request.
                </P>
              </Section>

              <Section title="9. Children">
                <P>The app has no accounts and doesn&apos;t collect personal data from anyone, children included.</P>
              </Section>

              <Section title="10. Changes">
                <P>
                  If this policy changes in a way that matters, we&apos;ll say so on this page and in the app&apos;s release
                  notes. If Centurion Running takes the app on, its own privacy policy will replace this one.
                </P>
              </Section>

              <Section title="11. Contact">
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
