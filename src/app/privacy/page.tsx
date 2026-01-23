import { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Film My Run website and services.',
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-white dark:bg-zinc-950 min-h-screen">
        <div className="container py-12 lg:py-16">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-zinc-900 dark:text-white mb-8">
              Privacy Policy
            </h1>

            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-8">
                Last updated: January 2025
              </p>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  1. Introduction
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Film My Run (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy.
                  This Privacy Policy explains how we collect, use, and safeguard your personal
                  information when you use our website (filmmyrun.co.uk) and services.
                </p>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  We are based in the United Kingdom and comply with the UK General Data Protection
                  Regulation (UK GDPR) and the Data Protection Act 2018.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  2. Information We Collect
                </h2>

                <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white mb-3">
                  Information you provide:
                </h3>
                <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2 mb-4">
                  <li>Account information (name, email address, password)</li>
                  <li>Contact form submissions</li>
                  <li>Service enquiry details</li>
                  <li>Payment information (processed securely via Stripe)</li>
                  <li>Shipping addresses for physical products</li>
                  <li>GPX/FIT files uploaded to our route comparison tool</li>
                </ul>

                <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white mb-3">
                  Information collected automatically:
                </h3>
                <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2 mb-4">
                  <li>IP address and approximate location</li>
                  <li>Browser type and device information</li>
                  <li>Pages visited and time spent on site</li>
                  <li>Referral source</li>
                  <li>Cookies and similar technologies</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  3. How We Use Your Information
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  We use your information to:
                </p>
                <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2 mb-4">
                  <li>Provide and improve our services and tools</li>
                  <li>Process orders and subscriptions</li>
                  <li>Respond to enquiries and provide customer support</li>
                  <li>Send service-related communications</li>
                  <li>Send marketing emails (with your consent)</li>
                  <li>Analyse website usage and improve user experience</li>
                  <li>Prevent fraud and ensure security</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  4. Legal Basis for Processing
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  We process your data based on:
                </p>
                <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2 mb-4">
                  <li><strong>Contract:</strong> To fulfil services you have requested</li>
                  <li><strong>Consent:</strong> For marketing communications and cookies</li>
                  <li><strong>Legitimate interests:</strong> To improve our services and prevent fraud</li>
                  <li><strong>Legal obligation:</strong> To comply with applicable laws</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  5. Data Sharing
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  We do not sell your personal information. We may share data with:
                </p>
                <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2 mb-4">
                  <li><strong>Payment processors:</strong> Stripe, for secure payment processing</li>
                  <li><strong>Hosting providers:</strong> Railway, for website hosting</li>
                  <li><strong>Analytics:</strong> To understand website usage (anonymised where possible)</li>
                  <li><strong>Email services:</strong> To send transactional and marketing emails</li>
                  <li><strong>Legal authorities:</strong> When required by law</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  6. Cookies
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  We use cookies and similar technologies to:
                </p>
                <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2 mb-4">
                  <li>Keep you signed in to your account</li>
                  <li>Remember your preferences (e.g., dark mode)</li>
                  <li>Analyse website traffic and usage</li>
                  <li>Improve our services</li>
                </ul>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  You can control cookies through your browser settings. Disabling certain cookies
                  may affect website functionality.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  7. Data Retention
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  We retain your data for as long as necessary to provide our services and comply
                  with legal obligations:
                </p>
                <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2 mb-4">
                  <li>Account data: Until you delete your account</li>
                  <li>Order records: 7 years (for tax and legal purposes)</li>
                  <li>Uploaded files (GPX/FIT): Processed temporarily, not stored long-term</li>
                  <li>Analytics data: 26 months</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  8. Your Rights
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Under UK GDPR, you have the right to:
                </p>
                <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2 mb-4">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Rectification:</strong> Correct inaccurate data</li>
                  <li><strong>Erasure:</strong> Request deletion of your data</li>
                  <li><strong>Restriction:</strong> Limit how we use your data</li>
                  <li><strong>Portability:</strong> Receive your data in a portable format</li>
                  <li><strong>Object:</strong> Object to certain processing activities</li>
                  <li><strong>Withdraw consent:</strong> Where processing is based on consent</li>
                </ul>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  To exercise these rights, contact us at{' '}
                  <a
                    href="mailto:hello@filmmyrun.co.uk"
                    className="text-orange-500 hover:text-orange-600"
                  >
                    hello@filmmyrun.co.uk
                  </a>
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  9. Data Security
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  We implement appropriate technical and organisational measures to protect your
                  data, including:
                </p>
                <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2 mb-4">
                  <li>HTTPS encryption for all data transmission</li>
                  <li>Secure password hashing</li>
                  <li>Regular security updates</li>
                  <li>Limited access to personal data</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  10. International Transfers
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Some of our service providers may process data outside the UK. Where this occurs,
                  we ensure appropriate safeguards are in place, such as Standard Contractual
                  Clauses or adequacy decisions.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  11. Children&apos;s Privacy
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Our services are not directed at children under 16. We do not knowingly collect
                  personal information from children. If you believe we have collected data from
                  a child, please contact us immediately.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  12. Changes to This Policy
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  We may update this Privacy Policy from time to time. We will notify you of
                  significant changes via email or a prominent notice on our website.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  13. Contact Us
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  If you have any questions about this Privacy Policy or how we handle your data,
                  please contact us:
                </p>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Email:{' '}
                  <a
                    href="mailto:hello@filmmyrun.co.uk"
                    className="text-orange-500 hover:text-orange-600"
                  >
                    hello@filmmyrun.co.uk
                  </a>
                </p>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  You also have the right to lodge a complaint with the Information Commissioner&apos;s
                  Office (ICO) if you believe your data protection rights have been violated:{' '}
                  <a
                    href="https://ico.org.uk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:text-orange-600"
                  >
                    ico.org.uk
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
