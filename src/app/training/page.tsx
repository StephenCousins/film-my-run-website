import Link from 'next/link';
import { ArrowRight, Smartphone, Scale, TrendingUp, Timer, Mountain, Zap, Gauge } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AppScreensFan, { type AppScreen } from '@/components/sections/AppScreensFan';

// The training plans in the Film My Run iPhone app (FMRCore's PlanGenerator).
// This page replaced the Adrian AI-coach page on 26 Sep 2026 (Stephen: "remove
// Adrian from the site and replace it with the training plans we developed on
// the iOS app"). Every rule below is what the generator does; the method and
// its sources are in filmmyrun-ios docs/TRAINING-METHOD.md.

const SCREENS: [AppScreen, AppScreen, AppScreen] = [
  { src: '/images/app/builder.webp', alt: 'Choosing a plan: every race from 5K to 100 miles' },
  { src: '/images/app/detail.webp', alt: 'A 16-week intermediate marathon plan, with its running time by week' },
  { src: '/images/app/plan.webp', alt: "This week's runs in a half marathon plan" },
];

const DISTANCES = [
  ['5K', 'From nothing to a parkrun'],
  ['10K', 'The next step up'],
  ['Half marathon', 'The distance most people love'],
  ['Marathon', '8 to 24 weeks'],
  ['50K', 'Your first ultra'],
  ['100K', 'A long day out'],
  ['100 miles', 'The long night'],
];

const METHOD = [
  {
    icon: Scale,
    title: '80/20, by time',
    body: 'Around four fifths of your running is easy enough to talk through. Every week is checked, and if a session would tip the balance, the hard work is trimmed first.',
  },
  {
    icon: TrendingUp,
    title: 'Builds without the spikes',
    body: 'The long run never grows more than 10% past your longest of the last four weeks, which is where the injury research says the risk lives. Three weeks up, one easier.',
  },
  {
    icon: Timer,
    title: 'A proper taper',
    body: 'Ten days for a 5K or 10K, two weeks for a half, three for a marathon or an ultra. Less running, the same intensity, fresh legs on the day.',
  },
  {
    icon: Mountain,
    title: 'Ultras counted in hours',
    body: 'Long runs that build to five to seven hours, back-to-back weekends, a weekly hill session and time on your feet, not just miles.',
  },
  {
    icon: Zap,
    title: 'Strides and strength',
    body: 'Short strides on an easy run each week, and an optional strength session on rest days for the intermediate and advanced plans.',
  },
  {
    icon: Gauge,
    title: 'Paces from your own racing',
    body: 'Give it a recent race and every session gets a pace. Ultra plans take theirs from a road race, because a 100-mile finish time is mostly the course.',
  },
];

function StoreButtons() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 text-white font-semibold rounded-full border border-white/20">
        <Smartphone className="w-5 h-5" />
        Coming soon to the App Store
      </span>
      <Link
        href="/club"
        className="inline-flex items-center gap-2 px-7 py-3.5 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
      >
        Join FMR Club
        <ArrowRight className="w-5 h-5" />
      </Link>
    </div>
  );
}

export default function TrainingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero: what the plans are, and the app they live in */}
        <section className="bg-zinc-950 border-b border-border">
          <div className="container py-16 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 rounded-full border border-orange-500/30 mb-6">
                <Smartphone className="w-4 h-4 text-orange-500" />
                <span className="text-orange-400 text-sm font-medium">Training plans in the Film My Run app</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                A plan for every race,
                <br />
                <span className="text-orange-500">5K to 100 miles</span>
              </h1>
              <p className="text-zinc-300 text-lg leading-relaxed mb-8 max-w-xl">
                Pick your race, your level and how many days a week you can run. The app builds the whole
                block, week by week: most of your running easy, the hard days properly hard, and a taper
                that gets you to the start line fresh. Move a run, skip one, tick it off from Apple Health.
              </p>
              <StoreButtons />
            </div>
            <AppScreensFan screens={SCREENS} label="Training plan screens from the Film My Run app" />
          </div>
        </section>

        {/* The races */}
        <section className="py-16 lg:py-20">
          <div className="container">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-3">Seven races, three levels</h2>
            <p className="text-secondary text-lg max-w-2xl mb-10">
              Beginner, intermediate or advanced, three or four days a week or five or six, over 8 to 24
              weeks. Pick a goal time, a custom one, or just aim to finish.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {DISTANCES.map(([name, line]) => (
                <div key={name} className="p-5 rounded-2xl border border-border bg-surface">
                  <div className="font-display text-xl font-bold text-foreground">{name}</div>
                  <div className="text-sm text-secondary mt-1">{line}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The method */}
        <section className="py-16 lg:py-20 bg-surface-secondary border-y border-border">
          <div className="container">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-3">How the plans are built</h2>
            <p className="text-secondary text-lg max-w-2xl mb-10">
              Built on what the research says, not on what sounds impressive. Every plan follows the same
              rules, whatever the distance.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {METHOD.map(({ icon: Icon, title, body }) => (
                <div key={title} className="p-6 rounded-2xl border border-border bg-surface">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/15 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-secondary text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Free, and what FMR Club adds */}
        <section className="py-16 lg:py-20">
          <div className="container grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">Free, for good</h2>
              <p className="text-secondary text-lg leading-relaxed">
                Every plan, every distance, the calendar, the reminders and the Apple Health tick-offs are free
                in the app. So are the calculators and the race predictor.
              </p>
            </div>
            <div className="p-6 lg:p-8 rounded-2xl border border-orange-500/30 bg-orange-500/5">
              <h3 className="font-display text-2xl font-bold text-foreground mb-3">FMR Club adds</h3>
              <ul className="space-y-2 text-secondary">
                <li>Your own paces on every session, from your racing</li>
                <li>Ultra Race Pacing: your arrival time at every checkpoint</li>
                <li>Ask Stephen: a one-to-one thread with me about anything running</li>
                <li>15% off everything in the shop</li>
              </ul>
              <p className="text-sm text-muted mt-4">£2.99 a month or £29 a year.</p>
            </div>
          </div>
        </section>

        {/* Closing call */}
        <section className="bg-zinc-950">
          <div className="container py-14 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white">The Film My Run app is coming to iPhone</h2>
              <p className="text-zinc-400 mt-2">Join FMR Club now and it follows your account into the app.</p>
            </div>
            <StoreButtons />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
