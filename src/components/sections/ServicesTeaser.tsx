'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Video, Users, Sparkles, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// SERVICES DATA
// ============================================

const services = [
  {
    title: 'Race Filming',
    description: 'Professional video coverage of your race. From start to finish, we capture every moment of your journey.',
    icon: Video,
    features: [
      'Multi-camera coverage',
      'Drone footage available',
      'Same-day highlights',
      'Full race edit delivery',
    ],
    image: '/images/services/race-filming.jpg',
    href: '/services/filming',
    color: 'from-orange-500 to-red-500',
  },
  {
    title: 'Event Coverage',
    description: 'Complete event documentation for race organizers. Promotional content, live streams, and post-event packages.',
    icon: Users,
    features: [
      'Live streaming',
      'Promotional videos',
      'Participant photos',
      'Social media content',
    ],
    image: '/images/services/event-coverage.jpg',
    href: '/services/events',
    color: 'from-blue-500 to-purple-500',
  },
  {
    title: 'Custom Projects',
    description: 'Bespoke video projects for brands, clubs, and individuals. Tell your unique running story.',
    icon: Sparkles,
    features: [
      'Documentary style',
      'Brand partnerships',
      'Club promos',
      'Personal stories',
    ],
    image: '/images/services/custom.jpg',
    href: '/services/custom',
    color: 'from-emerald-500 to-teal-500',
  },
];

// ============================================
// SERVICE CARD COMPONENT
// ============================================

interface ServiceCardProps {
  service: typeof services[0];
  index: number;
}

function ServiceCard({ service, index }: ServiceCardProps) {
  const Icon = service.icon;
  const isReversed = index % 2 === 1;

  return (
    <div
      className={cn(
        'service-card grid lg:grid-cols-2 gap-8 lg:gap-16 items-center',
        isReversed && 'lg:[&>*:first-child]:order-2'
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden group">
        <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800">
          <Image
            src={service.image}
            alt={service.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Play button overlay for video feel */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className={cn(
            'w-16 h-16 rounded-full bg-gradient-to-r flex items-center justify-center',
            service.color
          )}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {/* Icon badge */}
        <div className={cn(
          'inline-flex w-12 h-12 rounded-xl bg-gradient-to-br items-center justify-center mb-6',
          service.color
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>

        <h3 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-4">
          {service.title}
        </h3>

        <p className="text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
          {service.description}
        </p>

        {/* Features */}
        <ul className="space-y-3 mb-8">
          {service.features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300"
            >
              <div className="w-5 h-5 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-orange-500" />
              </div>
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link
          href={service.href}
          className="inline-flex items-center gap-2 text-orange-500 font-semibold hover:text-orange-600 transition-colors group"
        >
          Learn More
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// ============================================
// SERVICES TEASER SECTION
// ============================================

export default function ServicesTeaser() {
  const sectionRef = useRef<HTMLElement>(null);

  // Initialize GSAP animations
  useEffect(() => {
    let ctx: any;

    const initGSAP = async () => {
      try {
        const gsap = (await import('gsap')).default;
        const ScrollTrigger = (await import('gsap/ScrollTrigger')).default;
        gsap.registerPlugin(ScrollTrigger);

        const section = sectionRef.current;
        if (!section) return;

        ctx = gsap.context(() => {
          // Animate each service card
          section.querySelectorAll('.service-card').forEach((card) => {
            gsap.fromTo(
              card,
              { opacity: 0, y: 50 },
              {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: 'power3.out',
                scrollTrigger: {
                  trigger: card,
                  start: 'top 80%',
                  once: true,
                },
              }
            );
          });
        }, section);
      } catch (error) {
        console.warn('GSAP not loaded');
      }
    };

    initGSAP();

    return () => {
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-24 lg:py-32 bg-white dark:bg-zinc-900"
      style={{ position: 'relative', zIndex: 1 }}
    >
      <div className="container">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-orange-500 text-sm font-semibold uppercase tracking-wider">
            Our Services
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white mt-2 mb-4">
            Capture Your Running Story
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg">
            From personal race films to full event coverage, we bring your running moments to life.
          </p>
        </div>

        {/* Services */}
        <div className="space-y-24 lg:space-y-32">
          {services.map((service, index) => (
            <ServiceCard key={service.title} service={service} index={index} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-all hover:scale-105"
          >
            View All Services
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
