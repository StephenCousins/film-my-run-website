'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Video, Play, ArrowRight, X, Users, Eye, MapPin, Calendar, Camera, Mountain, Clock, CheckCircle, Star, Zap } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// ============================================
// DATA
// ============================================

const stats = [
  { label: 'Races Filmed', value: '200+', icon: MapPin },
  { label: 'Total Views', value: '5M+', icon: Eye },
  { label: 'Years Experience', value: '15', icon: Calendar },
  { label: 'Countries', value: '12', icon: Mountain },
];

const pastRaces = [
  {
    id: 'WrMSd9aLCMk',
    title: 'UTMB',
    location: 'Chamonix, France',
    distance: '171km',
    description: 'The pinnacle of ultra trail running. Immersive coverage capturing the magic of Mont Blanc and the emotion of runners pushing through the night.',
    stats: { views: '850K+' },
    featured: true,
  },
  {
    id: 'wlqxTfR0HIY',
    title: 'Transgrancanaria',
    location: 'Gran Canaria, Spain',
    distance: '128km',
    description: 'From volcanic peaks to coastal trails, showcasing one of Europe\'s most dramatic race landscapes.',
    stats: { views: '320K+' },
    featured: false,
  },
  {
    id: 'nS3RkFthCjQ',
    title: 'South Downs Way 100',
    location: 'UK',
    distance: '100 miles',
    description: 'Britain\'s classic hundred miler across the rolling chalk downs. A true test of endurance.',
    stats: { views: '280K+' },
    featured: false,
  },
  {
    id: 'Dj0FxjuNozQ',
    title: 'Lavaredo Ultra Trail',
    location: 'Dolomites, Italy',
    distance: '120km',
    description: 'Stunning Dolomite scenery and world-class competition captured from inside the race.',
    stats: { views: '195K+' },
    featured: false,
  },
  {
    id: 'Vo020VQJKA4',
    title: 'Race to the Stones',
    location: 'UK',
    distance: '100km',
    description: 'Following the ancient Ridgeway to the iconic finish at Avebury stone circle.',
    stats: { views: '165K+' },
    featured: false,
  },
  {
    id: 'tSco2FEgtGQ',
    title: 'Ultra Trail Snowdonia',
    location: 'Wales, UK',
    distance: '100km',
    description: 'Technical Welsh mountain terrain and changeable weather make for compelling viewing.',
    stats: { views: '140K+' },
    featured: false,
  },
];

const benefits = [
  {
    icon: Camera,
    title: 'Authentic Perspective',
    description: 'Footage filmed by a real competitor on the course—not a drone overhead or camera crew on the sideline.',
  },
  {
    icon: Zap,
    title: 'High-Energy Content',
    description: 'Capture the atmosphere, the course highlights, and genuine runner interactions as they happen.',
  },
  {
    icon: Users,
    title: 'Attract New Entrants',
    description: 'Show potential runners exactly what to expect. POV videos are proven to drive race sign-ups.',
  },
  {
    icon: Eye,
    title: 'Massive Reach',
    description: 'Tap into our established audience of runners actively looking for their next race.',
  },
];

const whatYouGet = [
  'Full race POV edit (15-30 mins) on our YouTube channel',
  'Short-form clips for your social media',
  'Raw footage available for your own use',
  'Course preview breakdown for entrants',
  'Prominent race branding throughout',
  'Link to your registration in video description',
  'Social media promotion across our channels',
  'Professional 4K video quality',
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
        className="absolute top-4 right-4 p-2 text-white hover:text-orange-500 transition-colors"
      >
        <X className="w-8 h-8" />
      </button>
      <div
        className="relative w-full max-w-5xl aspect-video"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title="Race Coverage"
          className="absolute inset-0 w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

// ============================================
// RACE CARD
// ============================================

function RaceCard({
  race,
  onPlay,
}: {
  race: typeof pastRaces[0];
  onPlay: () => void;
}) {
  return (
    <div className={`group ${race.featured ? 'md:col-span-2 lg:col-span-3' : ''}`}>
      <div className="bg-surface rounded-2xl border border-border overflow-hidden hover:border-brand/50 transition-all h-full">
        {/* Thumbnail */}
        <div
          className="relative aspect-video cursor-pointer"
          onClick={onPlay}
        >
          <img
            src={`https://img.youtube.com/vi/${race.id}/hqdefault.jpg`}
            alt={race.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Distance badge */}
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full">
            <span className="text-white text-sm font-semibold">{race.distance}</span>
          </div>

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-brand/90 flex items-center justify-center transform group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 text-white ml-1" fill="white" />
            </div>
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="font-display text-xl font-bold text-white">{race.title}</h3>
            <p className="text-white/80 text-sm flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {race.location}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-secondary text-sm mb-4">
            {race.description}
          </p>

          {/* Stats */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <p className="text-brand font-display font-bold">{race.stats.views}</p>
              <p className="text-muted text-xs">Views</p>
            </div>
            <button
              onClick={onPlay}
              className="text-sm text-brand hover:text-brand-hover font-medium flex items-center gap-1"
            >
              Watch <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function POVRaceCoveragePage() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        {/* Hero */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={`https://img.youtube.com/vi/${pastRaces[0].id}/hqdefault.jpg`}
              alt="POV Race Coverage"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/90 via-zinc-950/80 to-zinc-950" />
          </div>

          <div className="container relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
                <Video className="w-4 h-4 text-orange-500" />
                <span className="text-orange-400 text-sm font-medium">For Race Directors</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Show Runners What Your Race Really Feels Like
              </h1>

              <p className="text-lg text-zinc-300 mb-8 max-w-2xl">
                I'll run your race and film it from the inside. Authentic POV footage that captures
                the course, the atmosphere, and the experience—reaching millions of runners looking
                for their next challenge.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/contact?service=pov-coverage"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
                >
                  Book Your Race
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => setActiveVideo(pastRaces[0].id)}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-full hover:bg-white/20 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Watch Example
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border bg-surface-secondary/50">
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
                    <p className="text-secondary text-sm">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why POV Coverage */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
                Why Race Directors Choose POV Coverage
              </h2>
              <p className="text-secondary">
                Drone shots are beautiful. Finish line videos are essential. But nothing sells
                your race like showing runners exactly what it's like to be out there on the course.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit) => {
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
                    <p className="text-secondary text-sm">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* What You Get */}
        <section className="py-16 lg:py-24 bg-surface-secondary/30">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
                  Everything You Need to Promote Your Race
                </h2>
                <p className="text-secondary mb-8">
                  One race entry, one competitor with a camera, and you get a complete content
                  package that keeps driving sign-ups year after year.
                </p>

                <div className="grid sm:grid-cols-2 gap-3">
                  {whatYouGet.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                      <span className="text-secondary text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface rounded-2xl p-8 border border-border">
                <h3 className="font-display text-xl font-semibold text-foreground mb-6">
                  How It Works
                </h3>
                <div className="space-y-6">
                  {[
                    { step: '1', title: 'Book Your Race', desc: 'Get in touch with your race details and preferred date.' },
                    { step: '2', title: 'I Run & Film', desc: 'I compete in your race while capturing POV footage throughout.' },
                    { step: '3', title: 'Professional Edit', desc: 'Full edit delivered within 4 weeks, optimised for YouTube.' },
                    { step: '4', title: 'Promote & Grow', desc: 'Video goes live to our audience with links to your registration.' },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">{item.step}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{item.title}</h4>
                        <p className="text-secondary text-sm">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Past Races */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
                Races I've Covered
              </h2>
              <p className="text-secondary">
                From local trail races to iconic ultras, I bring the same energy and quality
                to every event. Here's a selection of recent work.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastRaces.map((race) => (
                <RaceCard
                  key={race.id}
                  race={race}
                  onPlay={() => setActiveVideo(race.id)}
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
                Ready to Showcase Your Race?
              </h2>
              <p className="text-secondary mb-8 max-w-xl mx-auto">
                Let's talk about your event. I'm booking races for 2026 now—secure your
                date before the calendar fills up.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact?service=pov-coverage"
                  className="btn-primary"
                >
                  Book Your Race
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-surface-tertiary text-foreground font-semibold rounded-full hover:bg-surface-secondary transition-colors"
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
