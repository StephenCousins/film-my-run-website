import { Metadata } from 'next';
import type { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Terms of Use',
  alternates: { canonical: 'https://filmmyrun.com/terms' },
  description: 'Terms of Use for filmmyrun.com, the Film My Run app, the shop and FMR Club.',
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

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <div className="container py-12 lg:py-16">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-8">Terms of Use</h1>

            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <p className="text-secondary text-sm mb-8">Last updated: 2 October 2026</p>

              <Section title="1. About these terms">
                <P>
                  These terms cover the Film My Run website (filmmyrun.com), the Film My Run app, the shop and FMR
                  Club. Film My Run is run by Stephen Cousins in the United Kingdom. By using them you agree to these
                  terms. If you got the app from the App Store, Apple&apos;s standard licence terms for apps apply too.
                  How we handle your data is in our{' '}
                  <a href="/privacy" className="text-orange-500 hover:text-orange-600">Privacy Policy</a>.
                </P>
              </Section>

              <Section title="2. What Film My Run offers">
                <List>
                  <li>Free running tools: race predictor, calculators, training plans, Shoe Finder and more</li>
                  <li>Running News, race reports, films and blog posts</li>
                  <li>FMR Club, an optional paid membership</li>
                  <li>The Film My Run shop, selling clothing and other physical goods</li>
                  <li>Professional services: POV race coverage, documentary filmmaking, live streaming and MC work</li>
                </List>
              </Section>

              <Section title="3. Your account">
                <P>
                  Most of Film My Run works without an account. If you make one, keep your sign-in details to
                  yourself and tell us if you think someone else has used your account. You can delete your account
                  at any time, in the app (Settings, then your account, then Delete account) or by emailing <Mail />.
                  We may close accounts that break these terms.
                </P>
              </Section>

              <Section title="4. Guidance, not medical advice">
                <P>
                  The predictions, calculators, training plans, race pacing, Shoe Finder and Ask Stephen are guidance
                  for healthy adult runners. They are not medical advice and they do not replace a doctor, a
                  physiotherapist or a qualified coach. Check with a doctor before starting a training plan, especially
                  if you have a medical condition, are returning from injury or are new to running. Listen to your body
                  and stop if something hurts. You run at your own risk.
                </P>
                <P>Predictions and calculations are estimates from real race results. We work hard to make them accurate but cannot promise any result.</P>
              </Section>

              <Section title="5. FMR Club">
                <P>
                  FMR Club adds race-day pacing, the ultra training plans, Ask Stephen and money off in the shop.
                  The current benefits and prices are shown before you join.
                </P>
                <P>
                  <strong>Bought in the app:</strong> FMR Club Monthly and FMR Club Annual are auto-renewing
                  subscriptions sold through the App Store. Payment is taken from your Apple Account when you confirm
                  the purchase. A subscription renews automatically at the same price for the same period unless you
                  cancel at least 24 hours before the end of the current period. Manage or cancel it in your Apple
                  Account settings. If an offer includes a free trial, any unused part of the trial ends when you buy a
                  subscription. Refunds for App Store purchases are handled by Apple under its own terms.
                </P>
                <P>
                  <strong>Bought on the website:</strong> the membership is paid through Stripe and renews
                  automatically each month or year until you cancel. Cancel any time from &quot;Manage your
                  membership&quot; on the FMR Club page; it then runs to the end of the period you have paid for.
                </P>
                <P>Your membership is linked to your Film My Run account, so it works in the app and on the website.</P>
              </Section>

              <Section title="6. Ask Stephen">
                <P>
                  Ask Stephen is a private conversation with me. I aim to reply within a couple of days. It is a
                  conversation between runners, not coaching or medical advice. Please be kind: I may end conversations
                  that are abusive.
                </P>
              </Section>

              <Section title="7. The shop">
                <P>
                  Products are printed to order in the UK by our print partners and posted to you. Prices are in GBP
                  and include VAT where it applies. Delivery times are estimates. We may refuse or cancel an order, for
                  example if an item is unavailable, and will refund you in full if we do. If something arrives damaged,
                  faulty or wrong, email <Mail /> and we will replace or refund it. Nothing here affects your statutory
                  rights.
                </P>
              </Section>

              <Section title="8. Running News and race results">
                <P>
                  Running News stories are written with the help of AI from public news reports, credit their sources,
                  and are checked before they are published. They can still contain mistakes: tell us and we will put
                  them right. Race results come from public sources such as parkrun and Power of 10. Film My Run is not
                  affiliated with or endorsed by them.
                </P>
              </Section>

              <Section title="9. Professional services">
                <P>
                  POV race coverage, documentary filmmaking, live streaming and MC work are agreed separately.
                  Pricing, what is delivered and any deposit are agreed before work starts.
                </P>
              </Section>

              <Section title="10. Your content">
                <P>
                  You keep ownership of anything you upload or send, such as GPX files or Ask Stephen messages. You
                  let us use it only to provide the service to you. We do not share your uploads with anyone else.
                </P>
              </Section>

              <Section title="11. Our content">
                <P>
                  The films, photos, writing, designs, logos and software are owned by Film My Run or used with
                  permission. Please do not copy or reuse them without asking. Third-party images, such as news and shoe
                  photos, belong to the people credited.
                </P>
              </Section>

              <Section title="12. Liability">
                <P>
                  We are not liable for losses that were not foreseeable, or for business losses. Otherwise our total
                  liability to you is limited to what you paid us in the 12 months before the claim. Nothing in these
                  terms limits liability for death or personal injury caused by negligence, for fraud, or anything else
                  the law does not let us limit.
                </P>
              </Section>

              <Section title="13. Changes">
                <P>We may update these terms. If a change matters, we will say so here and, for account holders, by email. The date at the top shows the latest version.</P>
              </Section>

              <Section title="14. Law">
                <P>These terms are governed by the law of England and Wales. If you live elsewhere in the UK, you can also bring a claim in your local courts.</P>
              </Section>

              <Section title="15. Contact">
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
