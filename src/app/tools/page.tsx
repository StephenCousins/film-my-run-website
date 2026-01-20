import { Metadata } from 'next';
import Link from 'next/link';
import {
  Calculator,
  Users,
  Map,
  TrendingUp,
  Timer,
  Target,
  Gauge,
  ArrowRight,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: 'Running Tools',
  description:
    'Free running tools used by 250,000+ runners every week. Pace calculators, parkrun statistics, race visualization, and more.',
  openGraph: {
    title: 'Running Tools | Film My Run',
    description: 'Free tools for runners: calculators, parkrun stats, race maps.',
  },
};

// ============================================
// TOOLS DATA
// ============================================

const tools = [
  {
    name: 'Running Calculators',
    description:
      'Pace calculator, race predictor, splits calculator, age grading, VO2 max estimator, and training zones.',
    href: '/tools/calculators',
    icon: Calculator,
    color: 'from-orange-500 to-orange-600',
    stats: '250K+ weekly users',
    popular: true,
  },
  {
    name: 'parkrun Statistics',
    description:
      'Track your parkrun history, compare performances, and visualize your progress over time.',
    href: '/tools/parkrun',
    icon: Users,
    color: 'from-green-500 to-green-600',
    stats: 'All parkrun events',
    popular: true,
  },
  {
    name: 'Race Map',
    description:
      'Visualize race routes with elevation profiles, distance markers, and key waypoints.',
    href: '/tools/race-map',
    icon: Map,
    color: 'from-blue-500 to-blue-600',
    stats: 'GPX/TCX/FIT support',
    popular: false,
  },
];

const calculatorTools = [
  {
    name: 'Pace Calculator',
    description: 'Convert between pace, speed, and finish time',
    icon: Calculator,
    href: '/tools/calculators#pace',
  },
  {
    name: 'Race Predictor',
    description: 'Predict times for other distances',
    icon: Target,
    href: '/tools/calculators#predictor',
  },
  {
    name: 'Splits Calculator',
    description: 'Plan even or negative splits',
    icon: Timer,
    href: '/tools/calculators#splits',
  },
  {
    name: 'Training Zones',
    description: 'Calculate heart rate and pace zones',
    icon: Gauge,
    href: '/tools/calculators#zones',
  },
  {
    name: 'Age Grading',
    description: 'Compare performances across ages',
    icon: TrendingUp,
    href: '/tools/calculators#age-grade',
  },
];

// ============================================
// TOOLS PAGE
// ============================================

export default function ToolsPage() {
  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24 min-h-screen bg-zinc-950">
        {/* Hero */}
        <section className="py-12 lg:py-20 bg-zinc-900 border-b border-zinc-800">
          <div className="container">
            <div className="max-w-3xl">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                Running <span className="text-orange-500">Tools</span>
              </h1>
              <p className="text-xl text-zinc-400">
                Free tools used by over 250,000 runners every week. Calculate pace, predict
                race times, track parkrun stats, and visualize your routes.
              </p>
            </div>
          </div>
        </section>

        {/* Main tools */}
        <section className="py-12 lg:py-16">
          <div className="container">
            <h2 className="font-display text-2xl font-bold text-white mb-8">
              Featured Tools
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    className="group bg-zinc-900 rounded-2xl border border-zinc-800 p-6 hover:border-orange-500/50 hover:-translate-y-1 transition-all duration-300"
                  >
                    {/* Icon */}
                    <div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4`}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="font-display text-xl font-bold text-white mb-2 group-hover:text-orange-500 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-zinc-400 mb-4">{tool.description}</p>

                    {/* Stats and link */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">{tool.stats}</span>
                      <span className="inline-flex items-center gap-1 text-orange-500 font-medium group-hover:gap-2 transition-all">
                        Open
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>

                    {/* Popular badge */}
                    {tool.popular && (
                      <div className="absolute top-4 right-4">
                        <span className="px-2 py-1 text-xs font-medium bg-orange-500/10 text-orange-500 rounded-full">
                          Popular
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Calculator quick links */}
        <section className="py-12 lg:py-16 bg-zinc-900">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-2xl font-bold text-white">
                Calculators
              </h2>
              <Link
                href="/tools/calculators"
                className="text-orange-500 font-medium hover:text-orange-600 transition-colors"
              >
                View all
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {calculatorTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    className="group p-4 bg-zinc-800 rounded-xl hover:bg-orange-500/10 transition-colors"
                  >
                    <Icon className="w-6 h-6 text-orange-500 mb-2" />
                    <div className="font-medium text-white group-hover:text-orange-500 transition-colors text-sm">
                      {tool.name}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">{tool.description}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-3xl font-bold text-white mb-4">
                Need Something Specific?
              </h2>
              <p className="text-zinc-400 mb-8">
                Have a suggestion for a new tool or feature? We&apos;re always looking to
                build tools that help runners train smarter and race faster.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
              >
                Get in Touch
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
