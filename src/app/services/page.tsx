import { Metadata } from 'next';
import Link from 'next/link';
import { Video, Users, Sparkles, Camera, ArrowRight, Check } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Services',
  description: 'Professional race filming, event coverage, and custom video projects for runners and race organizers.',
};

const services = [
  {
    title: 'Race Filming',
    description: 'Professional video coverage of your race. From start to finish, we capture every moment of your journey with cinematic quality.',
    icon: Video,
    features: [
      'Multi-camera coverage',
      'Drone footage available',
      'Same-day highlights',
      'Full race edit delivery',
      '4K video quality',
    ],
    price: 'From £299',
    href: '/contact?service=filming',
  },
  {
    title: 'Event Coverage',
    description: 'Complete event documentation for race organizers. Promotional content, live streams, and post-event packages.',
    icon: Users,
    features: [
      'Live streaming setup',
      'Promotional videos',
      'Participant photography',
      'Social media content',
      'Post-event highlight reel',
    ],
    price: 'From £999',
    href: '/contact?service=events',
  },
  {
    title: 'Custom Projects',
    description: 'Bespoke video projects for brands, clubs, and individuals. Tell your unique running story.',
    icon: Sparkles,
    features: [
      'Documentary style films',
      'Brand partnerships',
      'Running club promos',
      'Personal journey films',
      'Product reviews',
    ],
    price: 'Custom quote',
    href: '/contact?service=custom',
  },
];

export default function ServicesPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
        {/* Hero */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          {/* Video background */}
          <div className="absolute inset-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/videos/services-hero.mp4" type="video/mp4" />
              <source src="/videos/services-hero.webm" type="video/webm" />
            </video>
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/60 to-zinc-950" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/50 via-transparent to-zinc-950/50" />
          </div>

          <div className="container relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
                <Camera className="w-4 h-4 text-orange-500" />
                <span className="text-orange-400 text-sm font-medium">Professional Services</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Capture Your Running Story
              </h1>

              <p className="text-lg text-zinc-300 max-w-2xl">
                From personal race films to full event coverage, we bring your running
                moments to life with professional video production.
              </p>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-3">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <div
                    key={service.title}
                    className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 hover:border-orange-500/50 transition-all hover:-translate-y-1"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6">
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    <h2 className="font-display text-2xl font-bold text-white mb-3">
                      {service.title}
                    </h2>

                    <p className="text-zinc-400 mb-6">
                      {service.description}
                    </p>

                    <ul className="space-y-3 mb-8">
                      {service.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3 text-zinc-300 text-sm">
                          <div className="w-5 h-5 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-orange-500" />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
                      <span className="font-display font-semibold text-orange-500">
                        {service.price}
                      </span>
                      <Link
                        href={service.href}
                        className="inline-flex items-center gap-2 text-white hover:text-orange-500 transition-colors"
                      >
                        Enquire
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-24 border-t border-zinc-800">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-zinc-400 mb-8">
                Get in touch to discuss your project. We'd love to hear about your race or event.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
              >
                Contact Us
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
