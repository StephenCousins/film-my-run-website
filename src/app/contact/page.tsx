import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, MapPin, Instagram, Youtube, Twitter, MessageSquare, Video, Users, Send } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: 'Contact | Film My Run',
  description: 'Get in touch for race filming, event coverage, collaborations, or just to say hello. We\'d love to hear from you.',
  openGraph: {
    title: 'Contact | Film My Run',
    description: 'Get in touch for race filming, event coverage, or collaborations.',
  },
};

// ============================================
// CONTACT REASONS
// ============================================

const contactReasons = [
  {
    icon: Video,
    title: 'Race Filming',
    description: 'Personal race films or event coverage',
    href: '/services/filming',
  },
  {
    icon: Users,
    title: 'Event Coverage',
    description: 'Full event documentation and live streaming',
    href: '/services/events',
  },
  {
    icon: MessageSquare,
    title: 'Collaborations',
    description: 'Brand partnerships and media inquiries',
    href: '#form',
  },
];

// ============================================
// CONTACT FORM COMPONENT
// ============================================

function ContactForm() {
  return (
    <form className="space-y-6">
      {/* Name & Email row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-zinc-900 dark:text-white mb-2"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            placeholder="Your name"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-900 dark:text-white mb-2"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            placeholder="you@example.com"
          />
        </div>
      </div>

      {/* Subject */}
      <div>
        <label
          htmlFor="subject"
          className="block text-sm font-medium text-zinc-900 dark:text-white mb-2"
        >
          Subject
        </label>
        <select
          id="subject"
          name="subject"
          required
          className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
        >
          <option value="">Select a topic...</option>
          <option value="race-filming">Race Filming Inquiry</option>
          <option value="event-coverage">Event Coverage</option>
          <option value="collaboration">Brand Collaboration</option>
          <option value="tools">Running Tools Question</option>
          <option value="training">Marathon Training App</option>
          <option value="other">Something Else</option>
        </select>
      </div>

      {/* Event details (optional) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="event-name"
            className="block text-sm font-medium text-zinc-900 dark:text-white mb-2"
          >
            Event Name <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            type="text"
            id="event-name"
            name="event-name"
            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            placeholder="e.g., London Marathon"
          />
        </div>
        <div>
          <label
            htmlFor="event-date"
            className="block text-sm font-medium text-zinc-900 dark:text-white mb-2"
          >
            Event Date <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            type="date"
            id="event-date"
            name="event-date"
            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-zinc-900 dark:text-white mb-2"
        >
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors resize-none"
          placeholder="Tell us about your project or question..."
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
      >
        <Send className="w-5 h-5" />
        Send Message
      </button>
    </form>
  );
}

// ============================================
// CONTACT PAGE
// ============================================

export default function ContactPage() {
  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0">
            <Image
              src="https://filmmyrun.co.uk/wp-content/uploads/2019/09/tds2019-5050-scaled.jpg"
              alt="Mountain running"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/70 to-zinc-950" />
          </div>

          <div className="container relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
                <Mail className="w-4 h-4 text-orange-500" />
                <span className="text-orange-400 text-sm font-medium">Let's Connect</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                Get in Touch
              </h1>
              <p className="text-lg text-zinc-300 max-w-2xl">
                Whether you're interested in race filming, event coverage, or just want to
                chat about running - I'd love to hear from you.
              </p>
            </div>
          </div>
        </section>

        {/* Contact reasons */}
        <section className="py-12 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contactReasons.map((reason) => {
                const Icon = reason.icon;
                return (
                  <Link
                    key={reason.title}
                    href={reason.href}
                    className="group p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-orange-500/50 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                      <Icon className="w-6 h-6 text-orange-500 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white mb-1 group-hover:text-orange-500 transition-colors">
                      {reason.title}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {reason.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Form & Info section */}
        <section id="form" className="py-16 lg:py-24 bg-white dark:bg-zinc-950">
          <div className="container">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
              {/* Form */}
              <div className="lg:col-span-7">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                  Send a Message
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-8">
                  Fill out the form below and I'll get back to you within 24 hours.
                </p>

                <ContactForm />
              </div>

              {/* Contact info */}
              <div className="lg:col-span-5">
                <div className="lg:sticky lg:top-28 space-y-8">
                  {/* Direct contact */}
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
                    <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                      Direct Contact
                    </h3>
                    <div className="space-y-4">
                      <a
                        href="mailto:hello@filmmyrun.co.uk"
                        className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400 hover:text-orange-500 transition-colors"
                      >
                        <Mail className="w-5 h-5" />
                        hello@filmmyrun.co.uk
                      </a>
                      <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
                        <MapPin className="w-5 h-5" />
                        United Kingdom
                      </div>
                    </div>
                  </div>

                  {/* Social media */}
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
                    <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                      Follow Along
                    </h3>
                    <div className="flex gap-3">
                      <a
                        href="https://instagram.com/filmmyrun"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-white dark:bg-zinc-800 rounded-xl hover:bg-orange-500 hover:text-white transition-colors group"
                        aria-label="Instagram"
                      >
                        <Instagram className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-white transition-colors" />
                      </a>
                      <a
                        href="https://youtube.com/@filmmyrun"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-white dark:bg-zinc-800 rounded-xl hover:bg-orange-500 hover:text-white transition-colors group"
                        aria-label="YouTube"
                      >
                        <Youtube className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-white transition-colors" />
                      </a>
                      <a
                        href="https://twitter.com/filmmyrun"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-white dark:bg-zinc-800 rounded-xl hover:bg-orange-500 hover:text-white transition-colors group"
                        aria-label="Twitter"
                      >
                        <Twitter className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-white transition-colors" />
                      </a>
                    </div>
                  </div>

                  {/* Response time */}
                  <div className="p-6 bg-orange-50 dark:bg-orange-500/10 rounded-2xl border border-orange-200 dark:border-orange-500/20">
                    <h3 className="font-display text-lg font-semibold text-orange-900 dark:text-orange-400 mb-2">
                      Quick Response
                    </h3>
                    <p className="text-orange-800 dark:text-orange-300 text-sm">
                      I typically respond within 24 hours. For urgent filming inquiries,
                      please mention the date in your message.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ teaser */}
        <section className="py-16 bg-zinc-50 dark:bg-zinc-900">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-8">
                Before reaching out, you might find your answer in our FAQ section.
              </p>

              <div className="text-left space-y-4">
                {[
                  {
                    q: 'How much does race filming cost?',
                    a: 'Pricing depends on the event type, duration, and location. Get in touch for a custom quote.',
                  },
                  {
                    q: 'Do you travel internationally?',
                    a: 'Yes! I\'ve filmed events across Europe and beyond. Travel costs are factored into quotes.',
                  },
                  {
                    q: 'How long does editing take?',
                    a: 'Most personal race films are delivered within 2-4 weeks. Event coverage may take longer.',
                  },
                ].map((faq, index) => (
                  <div
                    key={index}
                    className="p-4 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800"
                  >
                    <h4 className="font-semibold text-zinc-900 dark:text-white mb-2">
                      {faq.q}
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
