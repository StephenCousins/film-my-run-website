'use client';

import Link from 'next/link';
import { Instagram, Play, ArrowRight, Camera, Video, Smartphone, TrendingUp, Users, Clock, CheckCircle, Star, Zap, Share2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// ============================================
// DATA
// ============================================

const stats = [
  { label: 'Events Covered', value: '100+', icon: Camera },
  { label: 'Reels Created', value: '500+', icon: Play },
  { label: 'Combined Reach', value: '10M+', icon: Users },
  { label: 'Avg Engagement', value: '8.5%', icon: TrendingUp },
];

const contentTypes = [
  {
    icon: Play,
    title: 'Race Day Reels',
    description: 'Quick-turnaround vertical videos capturing the energy, drama, and emotion of your event—ready to post before runners get home.',
  },
  {
    icon: Camera,
    title: 'Behind the Scenes',
    description: 'The stories that happen off the course. Volunteer teams, race HQ buzz, and the human moments that make events special.',
  },
  {
    icon: Users,
    title: 'Athlete Features',
    description: 'Short-form profiles of runners at your event—from elites chasing times to first-timers achieving dreams.',
  },
  {
    icon: Smartphone,
    title: 'Stories Coverage',
    description: 'Real-time updates throughout race day. Start line energy, course highlights, finish line celebrations.',
  },
];

const deliverables = [
  'Same-day vertical reels (3-5 per event)',
  'Instagram/TikTok Stories throughout the day',
  'Athlete interview clips',
  'Course highlight content',
  'Finish line celebration footage',
  'Behind-the-scenes content',
  'All raw footage provided',
  'Branded templates available',
];

const whyItMatters = [
  {
    stat: '68%',
    label: 'of runners discover new races through social media',
  },
  {
    stat: '3x',
    label: 'higher engagement on video vs static posts',
  },
  {
    stat: '24hrs',
    label: 'window when race content performs best',
  },
];

// ============================================
// MAIN PAGE
// ============================================

export default function SocialMediaCoveragePage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
        {/* Hero */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-zinc-950 to-pink-900/20" />
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
          </div>

          <div className="container relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-full border border-purple-500/30 mb-6">
                <Instagram className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300 text-sm font-medium">For Race Directors</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Your Event Deserves to Go Viral
              </h1>

              <p className="text-lg text-zinc-300 mb-8 max-w-2xl">
                Professional social media content captured and delivered while your race is still
                happening. Reels, stories, and clips that showcase your event to thousands of
                potential future runners.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/contact?service=social-media"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  Book Social Coverage
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
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10 mb-3">
                      <Icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <p className="font-display text-3xl font-bold text-white">{stat.value}</p>
                    <p className="text-zinc-400 text-sm">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why Social Matters */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
                Social Media Sells Out Races
              </h2>
              <p className="text-zinc-400">
                Runners scroll Instagram looking for their next adventure. When your event shows
                up with incredible content, you're not just sharing memories—you're filling next year's start line.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {whyItMatters.map((item) => (
                <div key={item.label} className="text-center">
                  <p className="font-display text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                    {item.stat}
                  </p>
                  <p className="text-zinc-400 text-sm">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Content Types */}
        <section className="py-16 lg:py-24 bg-zinc-900/30">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
                Content That Captures the Moment
              </h2>
              <p className="text-zinc-400">
                From start gun to final finisher, I create scroll-stopping content that
                shows the world what makes your event special.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contentTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.title}
                    className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 hover:border-purple-500/50 transition-all"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="font-display font-semibold text-white mb-2">
                      {type.title}
                    </h3>
                    <p className="text-zinc-400 text-sm">
                      {type.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* What You Get */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
                  Same-Day Content Delivery
                </h2>
                <p className="text-zinc-400 mb-8">
                  The best time to post race content is while the excitement is still fresh.
                  I edit on-site and deliver reels before your runners have even uploaded
                  their own finish line selfies.
                </p>

                <div className="grid sm:grid-cols-2 gap-3">
                  {deliverables.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
                <h3 className="font-display text-xl font-semibold text-white mb-6">
                  The Timeline
                </h3>
                <div className="space-y-6">
                  {[
                    { time: 'Pre-Race', title: 'Planning Call', desc: 'We discuss your event, key moments, and content goals.' },
                    { time: 'Race Morning', title: 'Start Line Coverage', desc: 'Capturing the atmosphere, nerves, and anticipation.' },
                    { time: 'During Race', title: 'Course & Stories', desc: 'Real-time content posted to your channels.' },
                    { time: 'Same Day', title: 'Reels Delivered', desc: 'Polished vertical videos ready to post that evening.' },
                  ].map((item) => (
                    <div key={item.time} className="flex gap-4">
                      <div className="w-20 flex-shrink-0">
                        <span className="text-purple-400 text-xs font-semibold uppercase">{item.time}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{item.title}</h4>
                        <p className="text-zinc-400 text-sm">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-24 border-t border-zinc-800">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <Star className="w-12 h-12 text-purple-400 mx-auto mb-6" />
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
                Make Your Event Unmissable
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                Let's create content that has runners hitting the register button.
                Get in touch to discuss your event.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact?service=social-media"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  Book Social Coverage
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
