'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Film, Award, Play, ArrowRight, X, Users, Eye, Trophy, Share2, Video, Megaphone, Star, CheckCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// ============================================
// DATA
// ============================================

const stats = [
  { label: 'YouTube Subscribers', value: '15K+', icon: Users },
  { label: 'Total Film Views', value: '100K+', icon: Eye },
  { label: 'Festival Selections', value: '12', icon: Trophy },
  { label: 'Social Reach', value: '50K+', icon: Share2 },
];

const pastWork = [
  {
    id: 'R2fhcCSvZj8',
    title: '81 Yards',
    description: 'John Stocker breaks the backyard ultra world record in this gripping documentary following every yard of his historic 81-yard journey.',
    stats: { views: '80K+', watchTime: '45K hrs' },
    award: 'Winner - Sheffield Adventure Film Festival',
    featured: true,
  },
  {
    id: '2VwS68uEg04',
    title: 'Making Marks',
    description: 'Mark Derbyshire attempts to break the South Downs Way 100 course record — a time that has stood for eleven years. A story of patience, obsession, and quiet competitive fire.',
    stats: { views: '7K+', watchTime: '-' },
    award: null,
    featured: false,
  },
  {
    id: 'p6ReCqvcvz8',
    title: 'Sub 40',
    description: 'Masters runner Tim Grose chases the sub-40 minute 10k. A story of dedication that resonated with runners of all ages.',
    stats: { views: '4K+', watchTime: '12K hrs' },
    award: null,
    featured: false,
  },
  {
    id: 'AovGq8SmhA4',
    title: "Martin Yelling's Long Run Home",
    description: "Marathon Talk co-host Martin Yelling takes on an epic long run home. A film about the joy of simply running.",
    stats: { views: '4.5K+', watchTime: '8K hrs' },
    award: null,
    featured: false,
  },
  {
    id: 'sdA-qO1_MP8',
    title: "Victoria's Marathon",
    description: 'An intimate first marathon journey that connected with first-time runners worldwide.',
    stats: { views: '2K+', watchTime: '8K hrs' },
    award: null,
    featured: false,
  },
  {
    id: 'lSPQsEUNN2A',
    title: 'The 401 Challenge',
    description: '401 marathons in 401 days. The extraordinary story of one man\'s mission to raise awareness for bullying and mental health.',
    stats: { views: '5K+', watchTime: '10K hrs' },
    award: null,
    featured: false,
  },
  {
    id: 'v8hYS6BWioo',
    title: 'The Road to 100',
    description: "James Bennett's Paris Marathon marks his hundredth. A celebration of the everyday marathon runner.",
    stats: { views: '1.5K+', watchTime: '6K hrs' },
    award: null,
    featured: false,
  },
];

const sponsorBenefits = [
  {
    icon: Video,
    title: 'In-Film Branding',
    description: 'Logo placement in opening/closing credits, product integration where authentic to the story.',
  },
  {
    icon: Megaphone,
    title: 'Social Amplification',
    description: 'Dedicated posts across our channels, behind-the-scenes content featuring your brand.',
  },
  {
    icon: Users,
    title: 'Premiere Access',
    description: 'VIP invites to film premieres, meet the athletes, networking with the running community.',
  },
  {
    icon: Share2,
    title: 'Content Rights',
    description: 'Clips and stills for your own marketing, co-branded content opportunities.',
  },
];

const audienceDemo = [
  { label: 'Active Runners', value: '78%' },
  { label: 'Age 25-54', value: '65%' },
  { label: 'UK Based', value: '60%' },
  { label: 'Disposable Income £50K+', value: '45%' },
];

// ============================================
// VIDEO MODAL
// ============================================

function VideoModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:text-brand transition-colors"
      >
        <X className="w-8 h-8" />
      </button>
      <div
        className="relative w-full max-w-5xl aspect-video"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title="Documentary"
          className="absolute inset-0 w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

// ============================================
// CASE STUDY CARD
// ============================================

function CaseStudyCard({
  film,
  onPlay,
}: {
  film: typeof pastWork[0];
  onPlay: () => void;
}) {
  return (
    <div className={`group ${film.featured ? 'md:col-span-2' : ''}`}>
      <div className="bg-surface rounded-2xl border border-border overflow-hidden hover:border-brand/50 transition-all">
        {/* Thumbnail */}
        <div
          className="relative aspect-video cursor-pointer"
          onClick={onPlay}
        >
          <img
            src={`https://img.youtube.com/vi/${film.id}/hqdefault.jpg`}
            alt={film.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Award badge */}
          {film.award && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-amber-500/90 rounded-full">
              <Award className="w-4 h-4 text-white" />
              <span className="text-white text-xs font-semibold">{film.award}</span>
            </div>
          )}

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-brand/90 flex items-center justify-center transform group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 text-white ml-1" fill="white" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="font-display text-xl font-bold text-foreground mb-2">
            {film.title}
          </h3>
          <p className="text-muted text-sm mb-4">
            {film.description}
          </p>

          {/* Stats */}
          <div className="flex gap-6 pt-4 border-t border-border">
            <div>
              <p className="text-brand font-display font-bold text-lg">{film.stats.views}</p>
              <p className="text-muted text-xs">Views</p>
            </div>
            <div>
              <p className="text-brand font-display font-bold text-lg">{film.stats.watchTime}</p>
              <p className="text-muted text-xs">Watch Time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Documentary Film Production',
  description: 'Award-winning documentary filmmaking specialising in trail and ultra running. Compelling storytelling with professional cinematography.',
  url: 'https://filmmyrun.co.uk/services/documentary-films',
  provider: { '@id': 'https://filmmyrun.co.uk/#organization' },
  areaServed: { '@type': 'Place', name: 'United Kingdom' },
  serviceType: 'Documentary Film Production',
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://filmmyrun.co.uk' },
    { '@type': 'ListItem', position: 2, name: 'Services', item: 'https://filmmyrun.co.uk/services' },
    { '@type': 'ListItem', position: 3, name: 'Documentary Films', item: 'https://filmmyrun.co.uk/services/documentary-films' },
  ],
};

export default function DocumentaryFilmsPage() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        {/* Hero */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              poster="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/videos/docs-hero-poster.jpg"
            >
              <source src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/videos/docs-hero.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[rgb(var(--color-background))]" />
          </div>

          <div className="container relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand/20 backdrop-blur-sm rounded-full border border-brand/30 mb-6">
                <Film className="w-4 h-4 text-brand" />
                <span className="text-brand text-sm font-medium">Sponsorship Opportunities</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Put Your Brand in Front of the Running Community
              </h1>

              <p className="text-lg text-zinc-300 mb-8 max-w-2xl">
                Award-winning documentary films that captivate runners worldwide. Partner with
                Film My Run to reach an engaged, passionate audience through authentic storytelling.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/contact?service=documentary-sponsorship"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand text-white font-semibold rounded-full hover:bg-brand-hover transition-colors"
                >
                  Discuss Partnership
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border bg-surface/50">
          <div className="container py-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand/10 mb-3">
                      <Icon className="w-6 h-6 text-brand" />
                    </div>
                    <p className="font-display text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-muted text-sm">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why Sponsor */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
                Why Sponsor Our Documentaries?
              </h2>
              <p className="text-muted">
                Our films don't just get watched—they get shared, discussed, and remembered.
                Align your brand with stories that inspire the running community.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sponsorBenefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={benefit.title}
                    className="bg-surface rounded-xl p-6 border border-border"
                  >
                    <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-brand" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-muted text-sm">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Audience */}
        <section className="py-16 lg:py-24 bg-surface/30">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
                  Reach the Right Audience
                </h2>
                <p className="text-muted mb-8">
                  Our viewers aren't passive scrollers—they're dedicated runners actively
                  investing in gear, nutrition, events, and experiences. They trust our content
                  and the brands we partner with.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {audienceDemo.map((demo) => (
                    <div key={demo.label} className="bg-surface-tertiary rounded-lg p-4">
                      <p className="font-display text-2xl font-bold text-brand">{demo.value}</p>
                      <p className="text-muted text-sm">{demo.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface rounded-2xl p-8 border border-border">
                <h3 className="font-display text-xl font-semibold text-foreground mb-6">
                  What Sponsors Get
                </h3>
                <ul className="space-y-4">
                  {[
                    'Logo in film credits and promotional materials',
                    'Social media campaign around film release',
                    'Behind-the-scenes content for your channels',
                    'Premiere event presence and hospitality',
                    'Press release inclusion and PR support',
                    'Long-term association with award-winning content',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                      <span className="text-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Past Work / Case Studies */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
                Proven Track Record
              </h2>
              <p className="text-muted">
                Our documentaries consistently deliver views, engagement, and cultural impact.
                Here's what we've achieved.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {pastWork.map((film) => (
                <CaseStudyCard
                  key={film.id}
                  film={film}
                  onPlay={() => setActiveVideo(film.id)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-24 border-t border-border">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <Star className="w-12 h-12 text-brand mx-auto mb-6" />
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
                Ready to Reach the Running Community?
              </h2>
              <p className="text-muted mb-8 max-w-xl mx-auto">
                Let's discuss how your brand can be part of our next award-winning documentary.
                We have exciting projects in development for 2026.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact?service=documentary-sponsorship"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand text-white font-semibold rounded-full hover:bg-brand-hover transition-colors"
                >
                  Discuss Partnership
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-surface-secondary text-foreground font-semibold rounded-full hover:bg-surface-tertiary transition-colors"
                >
                  View All Services
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Video Modal */}
      {activeVideo && (
        <VideoModal
          videoId={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </>
  );
}
