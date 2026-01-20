import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Trophy, Calendar, Mountain, Camera, Code, Heart, ArrowRight, Award } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: 'About | Film My Run',
  description: 'The story behind Film My Run - runner, filmmaker, and tool builder since 2011. Creating content and tools for the running community.',
  openGraph: {
    title: 'About | Film My Run',
    description: 'Runner, filmmaker, and tool builder since 2011.',
  },
};

// ============================================
// STATS DATA
// ============================================

const stats = [
  { value: '174', label: 'Races Completed' },
  { value: '94', label: 'Marathons' },
  { value: '80', label: 'Ultras' },
  { value: '15', label: 'Years Running' },
];

const milestones = [
  { year: '2011', event: 'First marathon - London' },
  { year: '2013', event: 'First ultra - Thames Path 100km' },
  { year: '2015', event: 'Started Film My Run' },
  { year: '2018', event: 'First 100-miler - South Downs Way' },
  { year: '2022', event: 'TDS at UTMB - First alpine ultra' },
  { year: '2024', event: 'Sub-3 marathon at London' },
];

const awards = [
  { title: 'Best Running Film', event: 'Sheffield Adventure Film Festival', year: '2023', film: 'TDS 2022' },
  { title: 'Audience Choice', event: 'Trail Running Film Festival', year: '2023', film: 'Lakeland 100' },
];

// ============================================
// ABOUT PAGE
// ============================================

export default function AboutPage() {
  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero section */}
        <section className="relative py-24 lg:py-32 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-zinc-950">
            <Image
              src="/images/about-hero.jpg"
              alt="Running in the mountains"
              fill
              className="object-cover opacity-40"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
          </div>

          <div className="container relative">
            <div className="max-w-2xl">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                Runner. Filmmaker.
                <br />
                <span className="text-orange-500">Tool Builder.</span>
              </h1>
              <p className="text-lg text-zinc-300 leading-relaxed">
                I'm Stephen Cousins, and I've been documenting my running journey since 2011.
                What started as a simple blog has grown into a platform for films, tools,
                and resources used by hundreds of thousands of runners every month.
              </p>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="py-12 bg-zinc-900 border-y border-zinc-800">
          <div className="container">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-mono text-3xl lg:text-4xl font-bold text-orange-500">
                    {stat.value}
                  </div>
                  <div className="text-zinc-400 text-sm mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story section */}
        <section className="py-24 lg:py-32 bg-white dark:bg-zinc-950">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Image */}
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
                <Image
                  src="/images/about/stephen.jpg"
                  alt="Stephen Cousins"
                  fill
                  className="object-cover"
                />
              </div>

              {/* Content */}
              <div>
                <span className="text-orange-500 text-sm font-semibold uppercase tracking-wider">
                  My Story
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mt-2 mb-6">
                  From First Marathon to Ultra Running
                </h2>
                <div className="prose dark:prose-invert prose-zinc max-w-none">
                  <p>
                    My running journey began in 2011 with a New Year's resolution to run the
                    London Marathon. I was overweight, undertrained, and had no idea what I
                    was getting into. I finished in 4:45:32, and I was hooked.
                  </p>
                  <p>
                    Since then, running has taken me across the UK and around the world.
                    I've run through the Alps at UTMB, along the Pennine Way in winter,
                    and around the Lake District in a single push. Each race teaches me
                    something new about myself.
                  </p>
                  <p>
                    Film My Run started as a way to document these adventures. Now it's
                    grown into something bigger - a platform for sharing stories, building
                    tools, and connecting with the running community. The calculators,
                    dashboards, and other tools on this site are used by over 250,000
                    runners every week.
                  </p>
                  <p>
                    Whether you're training for your first 5K or your tenth 100-miler,
                    I hope you find something here that helps you on your journey.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Three pillars */}
        <section className="py-24 lg:py-32 bg-zinc-50 dark:bg-zinc-900">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
                What I Do
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Film My Run has evolved into three distinct areas, each driven by a passion
                for running and helping others in the community.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Filmmaking */}
              <div className="p-8 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6">
                  <Camera className="w-7 h-7 text-orange-500" />
                </div>
                <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-3">
                  Filmmaking
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                  Documentary-style race films that capture the spirit of running.
                  From personal journeys to full event coverage.
                </p>
                <Link
                  href="/films"
                  className="inline-flex items-center gap-1 text-orange-500 font-medium hover:gap-2 transition-all"
                >
                  Watch Films <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Tools */}
              <div className="p-8 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
                  <Code className="w-7 h-7 text-blue-500" />
                </div>
                <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-3">
                  Running Tools
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                  Free calculators, dashboards, and apps built for runners.
                  Used by 250,000+ people every week.
                </p>
                <Link
                  href="/tools/calculators"
                  className="inline-flex items-center gap-1 text-orange-500 font-medium hover:gap-2 transition-all"
                >
                  Try Tools <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Content */}
              <div className="p-8 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
                  <Heart className="w-7 h-7 text-emerald-500" />
                </div>
                <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-3">
                  Content & Community
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                  Race reports, training insights, and gear reviews.
                  Sharing 15 years of running experience.
                </p>
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1 text-orange-500 font-medium hover:gap-2 transition-all"
                >
                  Read Blog <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-24 lg:py-32 bg-white dark:bg-zinc-950">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
                Running Milestones
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Key moments from 15 years of running adventures.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="relative border-l-2 border-orange-500/30 pl-8">
                {milestones.map((milestone, index) => (
                  <div key={milestone.year} className="relative mb-10 last:mb-0">
                    {/* Dot */}
                    <div className="absolute -left-[41px] w-4 h-4 rounded-full bg-orange-500" />

                    {/* Content */}
                    <div className="font-mono text-orange-500 text-sm mb-1">
                      {milestone.year}
                    </div>
                    <div className="text-lg font-medium text-zinc-900 dark:text-white">
                      {milestone.event}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Awards */}
        {awards.length > 0 && (
          <section className="py-24 lg:py-32 bg-zinc-900">
            <div className="container">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                  Awards & Recognition
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {awards.map((award, index) => (
                  <div
                    key={index}
                    className="p-6 bg-zinc-800 rounded-2xl border border-zinc-700"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <Award className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <div className="font-display font-bold text-white mb-1">
                          {award.title}
                        </div>
                        <div className="text-zinc-400 text-sm">
                          {award.event} • {award.year}
                        </div>
                        <div className="text-orange-500 text-sm mt-1">
                          For: {award.film}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-24 lg:py-32 bg-white dark:bg-zinc-950">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
                Let's Connect
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-8">
                Whether you want to chat about running, discuss a filming project, or just
                say hello - I'd love to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
                >
                  Get in Touch
                </Link>
                <Link
                  href="/blog"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Read the Blog
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
