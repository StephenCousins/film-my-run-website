import { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Film My Run website and services.',
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-white dark:bg-zinc-950 min-h-screen">
        <div className="container py-12 lg:py-16">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-zinc-900 dark:text-white mb-8">
              Terms of Service
            </h1>

            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-8">
                Last updated: January 2025
              </p>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  1. Agreement to Terms
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  By accessing or using the Film My Run website (filmmyrun.co.uk), you agree to be
                  bound by these Terms of Service. If you do not agree to these terms, please do
                  not use our website or services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  2. Description of Services
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Film My Run provides:
                </p>
                <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2 mb-4">
                  <li>Free running tools and calculators</li>
                  <li>Blog content and race reports</li>
                  <li>Professional services including POV race coverage, documentary filmmaking,
                      live streaming, and MC services</li>
                  <li>E-commerce products through our shop</li>
                  <li>Training plan applications (subscription-based)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  3. User Accounts
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Some features require you to create an account. You are responsible for:
                </p>
                <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2 mb-4">
                  <li>Maintaining the confidentiality of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorised use</li>
                </ul>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  We reserve the right to suspend or terminate accounts that violate these terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  4. Free Tools and Calculators
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Our running tools and calculators are provided free of charge for personal use.
                  While we strive for accuracy, these tools are for informational purposes only and
                  should not be used as a substitute for professional advice. We make no guarantees
                  about the accuracy of calculations or predictions.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  5. Professional Services
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Professional services (POV race coverage, documentary filmmaking, live streaming,
                  MC services) are subject to separate agreements. Pricing, deliverables, and terms
                  will be agreed upon before any work commences. A deposit may be required for
                  certain services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  6. Shop and Purchases
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  All purchases through our shop are subject to availability. Prices are displayed
                  in GBP and include VAT where applicable. We reserve the right to refuse or cancel
                  orders at our discretion. Digital products are non-refundable once delivered.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  7. Subscriptions
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Subscription services (such as training plans) will automatically renew unless
                  cancelled before the renewal date. You can cancel your subscription at any time
                  through your account settings. Refunds for partial subscription periods are not
                  provided.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  8. Intellectual Property
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  All content on this website, including text, images, videos, logos, and software,
                  is owned by Film My Run or its licensors and is protected by copyright and other
                  intellectual property laws. You may not reproduce, distribute, or create derivative
                  works without our written permission.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  9. User Content
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  If you upload content (such as GPX files for route comparison), you retain
                  ownership but grant us a licence to process that data to provide our services.
                  We do not share your uploaded files with third parties.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  10. Limitation of Liability
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  To the fullest extent permitted by law, Film My Run shall not be liable for any
                  indirect, incidental, special, consequential, or punitive damages arising from
                  your use of our website or services. Our total liability shall not exceed the
                  amount you have paid us in the past 12 months.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  11. Indemnification
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  You agree to indemnify and hold harmless Film My Run from any claims, damages,
                  or expenses arising from your violation of these terms or your use of our services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  12. Changes to Terms
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  We may update these terms from time to time. Continued use of the website after
                  changes constitutes acceptance of the new terms. We will notify registered users
                  of significant changes via email.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  13. Governing Law
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  These terms are governed by the laws of England and Wales. Any disputes shall be
                  subject to the exclusive jurisdiction of the courts of England and Wales.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  14. Contact
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  If you have any questions about these Terms of Service, please contact us at{' '}
                  <a
                    href="mailto:hello@filmmyrun.co.uk"
                    className="text-orange-500 hover:text-orange-600"
                  >
                    hello@filmmyrun.co.uk
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
