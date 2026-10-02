import { Metadata } from 'next';
import type { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  alternates: { canonical: 'https://filmmyrun.com/privacy' },
  description: 'How Film My Run handles your data on filmmyrun.com and in the Film My Run app.',
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
const H3 = ({ children }: { children: ReactNode }) => <h3 className="font-display text-lg font-semibold text-foreground mb-3">{children}</h3>;
const List = ({ children }: { children: ReactNode }) => <ul className="list-disc list-inside text-secondary space-y-2 mb-4">{children}</ul>;
const Mail = () => (
  <a href={`mailto:${CONTACT}`} className="text-orange-500 hover:text-orange-600">
    {CONTACT}
  </a>
);

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <div className="container py-12 lg:py-16">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>

            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <p className="text-secondary text-sm mb-8">Last updated: 2 October 2026</p>

              <Section title="1. Who we are">
                <P>
                  Film My Run is run by Stephen Cousins in the United Kingdom. This policy covers the website
                  (filmmyrun.com), the Film My Run app for iPhone, the Film My Run shop and FMR Club. We follow the
                  UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. Questions about
                  your data go to <Mail />.
                </P>
              </Section>

              <Section title="2. What we collect">
                <H3>On the website</H3>
                <List>
                  <li>An account, if you make one: your name and email address, and either a password (stored only as a secure hash) or your Google sign-in</li>
                  <li>Contact form messages and service enquiries</li>
                  <li>Shop orders: your name, email, delivery address and what you bought. Card details go to Stripe and never reach us</li>
                  <li>GPX or FIT files you upload to the route comparison tool, which are processed and not kept</li>
                  <li>Your email address if you sign up for the newsletter</li>
                </List>

                <H3>In the app</H3>
                <P>Most of the app works without an account, and your training plans, history and settings are kept on your phone.</P>
                <List>
                  <li>An account, if you make one: Sign in with Apple (we receive an Apple account identifier and the email address Apple shares, which can be a private relay address) or your email address with a one-time code</li>
                  <li>An install ID: a random identifier made when you install the app. It links your Ask Stephen conversation and FMR Club status to your phone. It is not an advertising identifier</li>
                  <li>Ask Stephen: your name, email address and the messages you send. Only I read them</li>
                  <li>How fast are you?: the parkrun or Power of 10 athlete number you enter, used to look up public results</li>
                  <li>A push notification token, only if you turn notifications on</li>
                </List>

                <H3>Apple Health</H3>
                <P>
                  If you allow it, the app reads your date of birth, sex, weight, height, heart rate and running
                  workouts from Apple Health to fill in your profile and tick off training sessions. It never writes
                  to Apple Health. Health data stays on your phone: it is never sent to us or anyone else, and never
                  used for advertising. You can turn access off at any time in the Health app.
                </P>

                <H3>FMR Club</H3>
                <P>
                  In the app, FMR Club is bought through Apple. Apple handles the payment and tells us only whether
                  your subscription is active. On the website, FMR Club is paid through Stripe, which handles your card.
                </P>

                <H3>Collected automatically</H3>
                <List>
                  <li>Server logs (IP address, browser or device type, the page or feature used), kept briefly for security and fixing faults</li>
                  <li>Cookies that keep you signed in and remember preferences such as dark mode</li>
                </List>
                <P>We do not use advertising or tracking cookies, and the app does not track you across other apps or websites.</P>
              </Section>

              <Section title="3. How we use it">
                <List>
                  <li>To run the website, the app and your account</li>
                  <li>To process and deliver shop orders, and to run FMR Club</li>
                  <li>To answer Ask Stephen messages, enquiries and support requests</li>
                  <li>To send emails you asked for: sign-in codes, order updates and, if you opted in, the newsletter</li>
                  <li>To prevent fraud and abuse, and to keep the services secure</li>
                  <li>To meet legal obligations, such as keeping order records for tax</li>
                </List>
              </Section>

              <Section title="4. Legal basis">
                <List>
                  <li><strong>Contract:</strong> to provide what you signed up for or bought</li>
                  <li><strong>Consent:</strong> for the newsletter, notifications and Apple Health access, which you can withdraw at any time</li>
                  <li><strong>Legitimate interests:</strong> to keep the services secure and working</li>
                  <li><strong>Legal obligation:</strong> to keep records the law requires</li>
                </List>
              </Section>

              <Section title="5. Who we share it with">
                <P>We do not sell your data. We use these services to run Film My Run, and each gets only what it needs:</P>
                <List>
                  <li><strong>Apple:</strong> Sign in with Apple, in-app purchases and push notifications</li>
                  <li><strong>Google:</strong> Google sign-in on the website</li>
                  <li><strong>Stripe:</strong> payments for the shop and website memberships</li>
                  <li><strong>Printify and Contrado:</strong> your name and delivery address, to print and post your order</li>
                  <li><strong>Resend:</strong> sending sign-in codes, order emails and the newsletter</li>
                  <li><strong>Railway:</strong> hosting the website, the app&apos;s server and our database</li>
                  <li><strong>Cloudflare:</strong> storing images</li>
                  <li><strong>Legal authorities:</strong> only when the law requires it</li>
                </List>
                <P>
                  Running News stories are written with the help of AI (Anthropic&apos;s Claude, and models through
                  OpenRouter) from public news reports. No personal data is sent to any AI service.
                </P>
              </Section>

              <Section title="6. Public race results">
                <P>
                  How fast are you? looks up public results from parkrun and Power of 10 by the athlete number you
                  enter. We keep a copy of those public results against the athlete number so the next look-up is
                  quick. They are not linked to your account or your phone. Film My Run is not affiliated with parkrun
                  or Power of 10.
                </P>
              </Section>

              <Section title="7. How long we keep it">
                <List>
                  <li>Your account, and your Ask Stephen conversation: until you delete your account</li>
                  <li>Order records: 7 years, for tax</li>
                  <li>Uploaded GPX or FIT files: not kept after processing</li>
                  <li>Push tokens: until notifications are turned off or the token stops working</li>
                  <li>Server logs: a few weeks</li>
                </List>
              </Section>

              <Section title="8. Deleting your account">
                <P>
                  In the app: Settings, then your account, then Delete account. It deletes your account, your Ask
                  Stephen conversation and your Sign in with Apple link, and cancels any FMR Club membership paid on
                  the website. A subscription bought in the app is managed by Apple: cancel it in your Apple Account
                  settings so it does not renew. You can also ask us to delete your account by emailing <Mail /> from
                  the address on the account. We will do it within 30 days and confirm by email.
                </P>
              </Section>

              <Section title="9. Your rights">
                <P>Under UK GDPR you can ask to see, correct, delete, restrict or move your data, object to how we use it, and withdraw consent. Email <Mail /> and we will reply within a month.</P>
                <P>
                  You can also complain to the Information Commissioner&apos;s Office:{' '}
                  <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600">
                    ico.org.uk
                  </a>
                </P>
              </Section>

              <Section title="10. Security">
                <P>Everything travels over HTTPS, passwords are stored only as secure hashes, and access to personal data is limited to what running the service needs.</P>
              </Section>

              <Section title="11. International transfers">
                <P>Some of the services above process data outside the UK. Where they do, we rely on UK adequacy decisions or standard contractual clauses.</P>
              </Section>

              <Section title="12. Children">
                <P>Film My Run is not aimed at children under 16, and we do not knowingly collect their data. If you think a child has given us their data, email <Mail /> and we will delete it.</P>
              </Section>

              <Section title="13. Changes">
                <P>If this policy changes in a way that matters, we will say so on this page and, for account holders, by email.</P>
              </Section>

              <Section title="14. Contact">
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
