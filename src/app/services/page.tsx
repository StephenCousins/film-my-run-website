import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Video, Mic, Film, Radio, Camera, ArrowRight, Check } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Services',
  description: 'POV race footage, award-winning documentaries, MC services, and live streaming for trail and ultra running events.',
};

const services = [
  {
    title: 'POV Race Footage',
    description: 'Hire me to run your race and capture it from the inside. Authentic, immersive footage filmed as a competitor on the course.',
    icon: Video,
    features: [
      'First-person race perspective',
      'Filmed while competing',
      'Course highlights and atmosphere',
      'Runner interactions captured',
      '4K video quality',
    ],
    price: 'Get in touch',
    detailsHref: '/services/pov-race-coverage',
    enquireHref: '/contact?service=pov',
  },
  {
    title: 'Documentary Films',
    description: 'Award-winning documentary filmmaking specialising in trail and ultra running. Telling the stories that matter.',
    icon: Film,
    features: [
      'Award-winning productions',
      'Trail & ultra running focus',
      'Compelling storytelling',
      'Professional cinematography',
      'Festival-ready quality',
    ],
    price: 'Get in touch',
    detailsHref: '/services/documentary-films',
    enquireHref: '/contact?service=documentary',
  },
  {
    title: 'Master of Ceremonies',
    description: 'Energise your event from start to finish. Pre-race briefings, runner motivation, and finish line celebrations on the mic.',
    icon: Mic,
    features: [
      'Pre-race briefings & info',
      'Start line energy & motivation',
      'Finish line welcomes',
      'Sponsor announcements',
      'Professional PA presence',
    ],
    price: 'Get in touch',
    detailsHref: '/services/master-of-ceremonies',
    enquireHref: '/contact?service=mc',
  },
  {
    title: 'Live Streaming',
    description: 'Bring your event to a global audience. Live coverage with real-time interviews, race updates, and professional presentation.',
    icon: Radio,
    features: [
      'Multi-platform streaming',
      'Live runner interviews',
      'Real-time race coverage',
      'Professional commentary',
      'Social media integration',
    ],
    price: 'Get in touch',
    detailsHref: '/services/event-live-streaming',
    enquireHref: '/contact?service=streaming',
  },
];

export default function ServicesPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
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
              <source src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/videos/services-hero.mp4" type="video/mp4" />
              <source src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/videos/services-hero.webm" type="video/webm" />
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
                Sharing Your Event With The World
              </h1>

              <p className="text-lg text-zinc-300 max-w-2xl">
                POV race footage, award-winning documentaries, live streaming, and MC services — bringing the energy and story of trail and ultra running to life.
              </p>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="grid gap-8 md:grid-cols-2">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <div
                    key={service.title}
                    className="bg-surface rounded-2xl p-8 border border-border hover:border-brand/50 transition-all hover:-translate-y-1 shadow-sm"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center mb-6">
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                      {service.title}
                    </h2>

                    <p className="text-secondary mb-6">
                      {service.description}
                    </p>

                    <ul className="space-y-3 mb-8">
                      {service.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3 text-secondary text-sm">
                          <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-brand" />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center justify-between pt-6 border-t border-border">
                      <Link
                        href={service.detailsHref}
                        className="inline-flex items-center gap-2 text-secondary hover:text-brand transition-colors"
                      >
                        More details
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <Link
                        href={service.enquireHref}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-full hover:bg-brand-hover transition-colors text-sm font-medium"
                      >
                        Enquire
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0">
            <Image
              src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/services-cta.jpg"
              alt="Stephen Cousins filming at a trail running event"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-zinc-950/70 via-50% to-zinc-950 to-85%" />
          </div>

          <div className="container relative">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-zinc-300 mb-8">
                Get in touch to discuss your project. I'd love to hear about your race or event.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
              >
                Contact Me
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
