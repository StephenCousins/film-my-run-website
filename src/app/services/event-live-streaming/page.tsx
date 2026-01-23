'use client';

import Link from 'next/link';
import { Radio, ArrowRight, Users, Eye, Globe, Clock, Wifi, Monitor, CheckCircle, Star, Zap, Play, MessageSquare } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// ============================================
// DATA
// ============================================

const stats = [
  { label: 'Events Streamed', value: '25+', icon: Radio },
  { label: 'Peak Concurrent Viewers', value: '5K+', icon: Users },
  { label: 'Total Watch Hours', value: '100K+', icon: Eye },
  { label: 'Countries Reached', value: '40+', icon: Globe },
];

const services = [
  {
    icon: Radio,
    title: 'Multi-Camera Live Streaming',
    description: 'Professional broadcast-quality streams with multiple camera angles, graphics overlays, and seamless switching between positions.',
  },
  {
    icon: MessageSquare,
    title: 'Live Commentary',
    description: 'Expert race commentary keeping viewers engaged throughout. Runner stories, race context, and real-time updates on the leaderboard.',
  },
  {
    icon: Monitor,
    title: 'Custom Graphics Package',
    description: 'Branded lower thirds, leaderboards, timing graphics, and sponsor integration that matches your event identity.',
  },
  {
    icon: Globe,
    title: 'Multi-Platform Distribution',
    description: 'Simultaneous streaming to YouTube, Facebook, and your event website. Reach your audience wherever they watch.',
  },
];

const caseStudies = [
  {
    title: 'Suffolk Backyard Ultra',
    subtitle: "UK's Biggest Backyard Ultra",
    description: 'Live coverage of Britain\'s largest backyard ultra event, where runners complete 6.7km loops every hour until one remains. Our stream captured the drama, strategy, and emotion across multiple days of racing.',
    highlights: [
      '72+ hours of continuous coverage',
      'Multiple camera positions around the loop',
      'Real-time leaderboard and lap tracking',
      'Athlete interviews between yards',
    ],
    stats: { viewers: '3.5K peak', hours: '45K watch hours' },
  },
  {
    title: 'Arc of Attrition',
    subtitle: "UK's Toughest Winter 100 Miler",
    description: 'Full coverage of this brutal UTMB-qualifying 100-mile race along the South West Coast Path in the depths of winter. Storms, darkness, and incredible human endurance broadcast live to a global audience.',
    highlights: [
      'Start and finish line coverage',
      'Remote checkpoint streaming',
      'Night vision camera capability',
      'Live GPS tracking integration',
    ],
    stats: { viewers: '4.2K peak', hours: '38K watch hours' },
  },
];

const whyLiveStream = [
  {
    title: 'Global Reach',
    description: 'Families and friends worldwide can follow their runner in real-time. Turn your local race into a global event.',
  },
  {
    title: 'Sponsor Visibility',
    description: 'Hours of branded content with integrated sponsor graphics, mentions, and product placement opportunities.',
  },
  {
    title: 'Content Library',
    description: 'Every stream becomes permanent content. Highlight reels, athlete features, and promotional clips for years to come.',
  },
  {
    title: 'Community Building',
    description: 'Live chat, social media integration, and real-time engagement builds a community around your event.',
  },
];

const eventTypes = [
  'Ultra marathons & multi-day races',
  'Backyard ultra events',
  'Trail running championships',
  'Road marathons & half marathons',
  'Charity challenges',
  'Corporate team events',
];

// ============================================
// MAIN PAGE
// ============================================

export default function EventLiveStreamingPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
        {/* Hero */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-zinc-950 to-rose-900/20" />
          <div className="absolute inset-0">
            <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
          </div>

          <div className="container relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 backdrop-blur-sm rounded-full border border-red-500/30 mb-6">
                <Radio className="w-4 h-4 text-red-400" />
                <span className="text-red-300 text-sm font-medium">For Race Directors</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Broadcast Your Event to the World
              </h1>

              <p className="text-lg text-zinc-300 mb-8 max-w-2xl">
                Professional live streaming that transforms your race into must-watch content.
                Multi-camera coverage, expert commentary, and global reach that keeps
                audiences engaged from start line to final finisher.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/contact?service=live-streaming"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold rounded-full hover:from-red-600 hover:to-rose-600 transition-all"
                >
                  Book Live Streaming
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-zinc-800 bg-zinc-900/50">
          <div className="container py-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mb-3">
                      <Icon className="w-6 h-6 text-red-400" />
                    </div>
                    <p className="font-display text-3xl font-bold text-white">{stat.value}</p>
                    <p className="text-zinc-400 text-sm">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
                Broadcast-Quality Production
              </h2>
              <p className="text-zinc-400">
                Full-service live streaming with everything needed to create compelling
                race coverage that rivals professional sports broadcasts.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <div
                    key={service.title}
                    className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 hover:border-red-500/50 transition-all"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="font-display font-semibold text-white mb-2">
                      {service.title}
                    </h3>
                    <p className="text-zinc-400 text-sm">
                      {service.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Case Studies */}
        <section className="py-16 lg:py-24 bg-zinc-900/30">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
                Proven on the Toughest Events
              </h2>
              <p className="text-zinc-400">
                From multi-day backyard ultras to brutal winter 100-milers, we've streamed
                events that push both athletes and equipment to the limit.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {caseStudies.map((study) => (
                <div
                  key={study.title}
                  className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden"
                >
                  <div className="p-8">
                    <p className="text-red-400 text-sm font-semibold mb-2">{study.subtitle}</p>
                    <h3 className="font-display text-2xl font-bold text-white mb-4">
                      {study.title}
                    </h3>
                    <p className="text-zinc-400 mb-6">
                      {study.description}
                    </p>

                    <div className="space-y-3 mb-6">
                      {study.highlights.map((highlight) => (
                        <div key={highlight} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                          <span className="text-zinc-300 text-sm">{highlight}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-8 pt-6 border-t border-zinc-800">
                      <div>
                        <p className="font-display text-xl font-bold text-red-400">{study.stats.viewers}</p>
                        <p className="text-zinc-500 text-xs">Peak Viewers</p>
                      </div>
                      <div>
                        <p className="font-display text-xl font-bold text-red-400">{study.stats.hours}</p>
                        <p className="text-zinc-500 text-xs">Watch Hours</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Live Stream */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
                  Why Live Streaming Matters
                </h2>
                <p className="text-zinc-400 mb-8">
                  Live streaming isn't just a nice-to-have anymore—it's how modern events
                  build audiences, attract sponsors, and create lasting value beyond race day.
                </p>

                <div className="space-y-6">
                  {whyLiveStream.map((item) => (
                    <div key={item.title} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{item.title}</h4>
                        <p className="text-zinc-400 text-sm">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
                <h3 className="font-display text-xl font-semibold text-white mb-6">
                  Events We Cover
                </h3>
                <div className="space-y-3">
                  {eventTypes.map((event) => (
                    <div key={event} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <span className="text-zinc-300 text-sm">{event}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-800">
                  <p className="text-zinc-400 text-sm mb-4">
                    Available UK-wide with international capability for major events.
                  </p>
                  <Link
                    href="/contact?service=live-streaming"
                    className="text-red-400 font-semibold text-sm hover:text-red-300 flex items-center gap-2"
                  >
                    Discuss your event <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-24 border-t border-zinc-800">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <Star className="w-12 h-12 text-red-400 mx-auto mb-6" />
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
                Ready to Go Live?
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                Let's discuss your event and create a streaming package that brings
                your race to audiences around the world.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact?service=live-streaming"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold rounded-full hover:from-red-600 hover:to-rose-600 transition-all"
                >
                  Book Live Streaming
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-zinc-800 text-white font-semibold rounded-full hover:bg-zinc-700 transition-colors"
                >
                  View All Services
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
