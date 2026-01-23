'use client';

import Link from 'next/link';
import { Mic, ArrowRight, Users, Clock, Trophy, Volume2, Star, Heart, Megaphone, PartyPopper, CheckCircle, Zap } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// ============================================
// DATA
// ============================================

const stats = [
  { label: 'Events MC\'d', value: '150+', icon: Mic },
  { label: 'Runners Welcomed Home', value: '50K+', icon: Users },
  { label: 'Years on the Mic', value: '10+', icon: Clock },
  { label: 'Presentation Ceremonies', value: '200+', icon: Trophy },
];

const services = [
  {
    icon: Megaphone,
    title: 'Start Line Energy',
    description: 'Building the atmosphere before the gun. Race briefings that inform and inspire, countdown moments that give runners goosebumps.',
  },
  {
    icon: Heart,
    title: 'Finish Line Welcomes',
    description: 'Every runner deserves their moment. Personal welcomes, name call-outs, and genuine celebration for everyone from winners to final finishers.',
  },
  {
    icon: Trophy,
    title: 'Presentation Ceremonies',
    description: 'Professional prize-givings that honour achievements. Engaging the crowd, telling athlete stories, making winners feel like champions.',
  },
  {
    icon: Volume2,
    title: 'Race Commentary',
    description: 'Keeping spectators informed and entertained throughout. Live updates, runner stories, and building excitement at key moments.',
  },
];

const whatMakesGreatMC = [
  {
    title: 'Runner Knowledge',
    description: 'I\'m not reading from a script—I know the sport, the distances, and what runners are going through.',
  },
  {
    title: 'Personal Touch',
    description: 'Learning names, spotting club vests, celebrating personal stories. Every runner gets recognised.',
  },
  {
    title: 'Energy Management',
    description: 'Knowing when to amp up the crowd and when to let the moment breathe. Reading the room.',
  },
  {
    title: 'Professional Reliability',
    description: 'On time, prepared, and adaptable. Whatever the weather or schedule changes, the show goes on.',
  },
];

const eventTypes = [
  'Ultra marathons & trail races',
  'Road marathons & half marathons',
  'Parkrun takeovers',
  'Club championships',
  'Charity running events',
  'Corporate team challenges',
  'Multi-day stage races',
  'Award ceremonies & dinners',
];

// ============================================
// MAIN PAGE
// ============================================

export default function MasterOfCeremoniesPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
        {/* Hero */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-zinc-950 to-orange-900/20" />
          <div className="absolute inset-0">
            <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          </div>

          <div className="container relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 backdrop-blur-sm rounded-full border border-amber-500/30 mb-6">
                <Mic className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 text-sm font-medium">For Race Directors</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                The Voice That Brings Your Event to Life
              </h1>

              <p className="text-lg text-zinc-300 mb-8 max-w-2xl">
                From the nervous energy of the start line to the emotion of welcoming home your
                final finisher, a great MC transforms a race into an unforgettable experience.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/contact?service=mc"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-full hover:from-amber-600 hover:to-orange-600 transition-all"
                >
                  Book MC Services
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
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mb-3">
                      <Icon className="w-6 h-6 text-amber-400" />
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
                More Than Just Announcements
              </h2>
              <p className="text-zinc-400">
                An MC sets the tone for your entire event. I bring energy when it's needed,
                respect for the achievement, and a genuine love for the sport.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <div
                    key={service.title}
                    className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 hover:border-amber-500/50 transition-all"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-amber-400" />
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

        {/* What Makes Great MC */}
        <section className="py-16 lg:py-24 bg-zinc-900/30">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
                  Why Runners Remember the MC
                </h2>
                <p className="text-zinc-400 mb-8">
                  Ask any runner about their favourite race and they'll mention the finish line
                  welcome. That moment when someone calls your name, celebrates your achievement,
                  and makes you feel like a champion—that's what I do.
                </p>

                <div className="space-y-6">
                  {whatMakesGreatMC.map((item) => (
                    <div key={item.title} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-amber-400" />
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
                  Events I Cover
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {eventTypes.map((event) => (
                    <div key={event} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      <span className="text-zinc-300 text-sm">{event}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-800">
                  <p className="text-zinc-400 text-sm mb-4">
                    Available across the UK and internationally for destination races.
                  </p>
                  <Link
                    href="/contact?service=mc"
                    className="text-amber-400 font-semibold text-sm hover:text-amber-300 flex items-center gap-2"
                  >
                    Check availability <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial-style section */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <PartyPopper className="w-12 h-12 text-amber-400 mx-auto mb-6" />
              <blockquote className="font-display text-2xl lg:text-3xl font-bold text-white mb-6">
                "The finish line atmosphere was incredible. Runners were saying it was the best
                welcome they'd ever had."
              </blockquote>
              <p className="text-zinc-400">
                — Race Director feedback
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-24 border-t border-zinc-800">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <Star className="w-12 h-12 text-amber-400 mx-auto mb-6" />
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
                Let's Make Your Event Unforgettable
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                Get in touch to discuss your event. I'd love to hear about what you're
                planning and how I can help create an amazing atmosphere.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact?service=mc"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-full hover:from-amber-600 hover:to-orange-600 transition-all"
                >
                  Book MC Services
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
