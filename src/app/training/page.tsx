'use client';

import Link from 'next/link';
import {
  Calendar,
  Target,
  TrendingUp,
  Zap,
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Award,
  Heart,
  MessageCircle,
  Youtube,
  Sparkles,
  Crown,
  Lock,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

// ============================================
// ADRIAN APP (kept as a separate app — link out for sign-up & training)
// ============================================

const ADRIAN_APP_URL =
  process.env.NEXT_PUBLIC_ADRIAN_APP_URL ||
  'https://marathon-plan-app-production.up.railway.app';
const REGISTER_URL = `${ADRIAN_APP_URL}/register`;
const LOGIN_URL = `${ADRIAN_APP_URL}/login`;

// ============================================
// TYPES
// ============================================

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
}

// ============================================
// DATA
// ============================================

const features = [
  {
    icon: Calendar,
    title: 'Personalised Plans',
    description:
      'Fully periodised training built around your goal race, current fitness, and the days you can actually run.',
  },
  {
    icon: Target,
    title: 'Four Proven Methods',
    description:
      'Choose Starrett, Hansons, 80/20 Polarised or Pfitzinger — each with a distinct philosophy for how you like to train.',
  },
  {
    icon: Sparkles,
    title: 'Adrian, Your AI Coach',
    description:
      'Instant feedback after every run, weekly reviews, and answers to your training questions the moment you have them.',
  },
  {
    icon: Zap,
    title: 'Adapts to Real Life',
    description:
      'Miss a session or have a rough week? Adrian adjusts your plan using your wellness and progress to keep you on track.',
  },
  {
    icon: Activity,
    title: 'Strava & Garmin Sync',
    description:
      'Connect your watch to auto-complete sessions and feed sleep, HRV and recovery into smarter coaching.',
  },
  {
    icon: BarChart3,
    title: 'Paces & Predictions',
    description:
      'Every pace is calculated from your goal time, with race predictions and VO2max insights as you improve.',
  },
];

const plans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '/month',
    description: 'Build a real training plan and get started — no card needed.',
    cta: 'Start free',
    features: [
      '1 training plan — any distance',
      'Beginner 5K, 5K, 10K & marathon',
      'Starrett marathon method',
      'Session tracking',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    period: '/month',
    description: 'For runners who want the full AI coaching experience.',
    cta: 'Get Pro',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      'Unlimited training plans',
      'All 4 methodologies',
      'Adrian AI coach',
      'Strava & Garmin sync',
      'Wellness tracking',
      'AI weekly reviews',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    period: '/month',
    description: 'AI coaching plus a real coach in your corner.',
    cta: 'Get Premium',
    badge: 'Personal Coaching',
    features: [
      'Everything in Pro',
      '1-to-1 WhatsApp coaching with Stephen',
      'Personal race-day strategy',
      'Advanced analytics',
      'VO2max predictions',
      'Priority AI responses',
    ],
  },
];

const stats = [
  { value: '5K–Marathon', label: 'Every distance' },
  { value: '4', label: 'Proven methods' },
  { value: '24/7', label: 'AI coaching' },
  { value: '60K+', label: 'Film My Run community' },
];

const methodologies = ['Starrett', 'Hansons', '80/20 Polarised', 'Pfitzinger'];

// ============================================
// PRICING CARD
// ============================================

function PricingCard({ plan }: { plan: PricingPlan }) {
  // Free → plain signup; paid tiers carry the selection so the app sends the
  // user straight to checkout for that tier after they create an account.
  const href = plan.id === 'free' ? REGISTER_URL : `${REGISTER_URL}?plan=${plan.id}`;
  return (
    <div
      className={cn(
        'relative rounded-2xl p-8 transition-all duration-300 flex flex-col',
        plan.highlighted
          ? 'bg-orange-500 text-white scale-105 shadow-2xl shadow-orange-500/30'
          : 'bg-surface border border-border hover:border-orange-500/50'
      )}
    >
      {/* Badge */}
      {plan.badge && (
        <div className="absolute -top-3 right-6">
          <span
            className={cn(
              'px-3 py-1 text-xs font-bold rounded-full',
              plan.highlighted ? 'bg-white text-orange-500' : 'bg-orange-500 text-white'
            )}
          >
            {plan.badge}
          </span>
        </div>
      )}

      {/* Plan name */}
      <h3
        className={cn(
          'font-display text-xl font-bold mb-2',
          plan.highlighted ? 'text-white' : 'text-foreground'
        )}
      >
        {plan.name}
      </h3>

      {/* Price */}
      <div className="mb-4">
        <span
          className={cn(
            'font-mono text-4xl font-bold',
            plan.highlighted ? 'text-white' : 'text-orange-500'
          )}
        >
          £{plan.price}
        </span>
        <span className={cn('text-sm ml-1', plan.highlighted ? 'text-white/80' : 'text-muted')}>
          {plan.period}
        </span>
      </div>

      {/* Description */}
      <p className={cn('text-sm mb-6', plan.highlighted ? 'text-white/90' : 'text-secondary')}>
        {plan.description}
      </p>

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <CheckCircle2
              className={cn(
                'w-5 h-5 flex-shrink-0 mt-0.5',
                plan.highlighted ? 'text-white' : 'text-orange-500'
              )}
            />
            <span
              className={cn('text-sm', plan.highlighted ? 'text-white/90' : 'text-secondary')}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA — sign up in the Adrian app (paid tiers go straight to checkout) */}
      <a
        href={href}
        className={cn(
          'w-full py-3 font-semibold rounded-full transition-all text-center',
          plan.highlighted
            ? 'bg-white text-orange-500 hover:bg-surface-tertiary'
            : 'bg-orange-500 text-white hover:bg-orange-600'
        )}
      >
        {plan.cta}
      </a>
    </div>
  );
}

// ============================================
// TRAINING PAGE
// ============================================

export default function TrainingPage() {
  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-purple-500/10" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(251,146,60,0.3) 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />

          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-full mb-6">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-500">
                  Adrian · the Film My Run training app
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                Train Smarter.
                <br />
                <span className="text-orange-500">Race Faster.</span>
              </h1>

              <p className="text-lg lg:text-xl text-secondary mb-8 max-w-2xl mx-auto">
                Meet Adrian — an AI running coach that builds a fully periodised plan around your
                goal, adapts to your life, and gives feedback after every run. Built on the methods
                Stephen has tested over 15+ years of racing.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={REGISTER_URL}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
                >
                  Start free
                  <ArrowRight className="w-5 h-5" />
                </a>
                <Link
                  href="#pricing"
                  className="inline-flex items-center gap-2 px-8 py-4 border border-border-secondary rounded-full hover:border-orange-500 transition-colors group"
                >
                  <span className="group-hover:text-orange-500 transition-colors">See pricing</span>
                </Link>
              </div>

              <p className="text-sm text-muted mt-6">
                Free plan available — no card needed.{' '}
                <a href={LOGIN_URL} className="text-orange-500 hover:text-orange-600 font-medium">
                  Already have an account? Sign in
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 bg-surface-secondary">
          <div className="container">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-mono text-2xl lg:text-3xl font-bold text-orange-500 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-secondary">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 lg:py-32 bg-background">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Everything You Need to
                <span className="text-orange-500"> Reach Your Goal</span>
              </h2>
              <p className="text-lg text-secondary max-w-2xl mx-auto">
                A complete training platform that adapts to your life, not the other way around.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group p-6 bg-surface rounded-2xl hover:bg-orange-500 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 group-hover:bg-white/20 flex items-center justify-center mb-4 transition-colors">
                      <Icon className="w-6 h-6 text-orange-500 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-foreground group-hover:text-white mb-2 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-secondary group-hover:text-white/80 transition-colors">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* App preview */}
        <section className="py-20 lg:py-32 bg-surface-secondary overflow-hidden">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-6">
                  Your Personal Coach,
                  <br />
                  <span className="text-orange-500">Always Available</span>
                </h2>
                <p className="text-lg text-secondary mb-8">
                  Adrian combines proven coaching methodology with modern AI to deliver training
                  that adapts to your progress, your schedule, and your goals.
                </p>

                <ul className="space-y-4 mb-8">
                  {[
                    'Plans for beginner 5K through to the marathon',
                    'Syncs with Strava and Garmin',
                    'Adjusts automatically when you miss workouts',
                    'Built-in pace calculator and race predictor',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      <span className="text-secondary">{item}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={REGISTER_URL}
                  className="inline-flex items-center gap-2 text-orange-500 font-semibold hover:text-orange-600 transition-colors"
                >
                  Start free
                  <ChevronRight className="w-5 h-5" />
                </a>
              </div>

              {/* App mockup */}
              <div className="relative">
                <div className="relative mx-auto w-64 lg:w-80">
                  <div className="relative bg-surface rounded-[3rem] p-3 shadow-2xl">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-surface rounded-b-2xl" />
                    <div className="aspect-[9/19] bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-[2.5rem] overflow-hidden">
                      <div className="h-full flex flex-col p-4">
                        <div className="text-white text-sm font-medium mb-4">Today&apos;s Workout</div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-3">
                          <div className="text-orange-400 text-xs mb-1">EASY RUN</div>
                          <div className="text-white font-bold text-lg">8km @ 5:30/km</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                          <div className="text-white/60 text-xs mb-2">This Week</div>
                          <div className="flex gap-1">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                              <div
                                key={day + i}
                                className={cn(
                                  'flex-1 h-8 rounded text-xs flex items-center justify-center',
                                  i < 3 ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/60'
                                )}
                              >
                                {day}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl" />
                  <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Coached by a real runner */}
        <section className="py-20 lg:py-32 bg-background">
          <div className="container">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-full mb-6">
                    <Youtube className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-orange-500">Built by a real runner</span>
                  </div>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-6">
                    Methods proven on the road and trail
                  </h2>
                  <p className="text-lg text-secondary mb-6">
                    Adrian isn&apos;t generic AI. Its plans are built on established coaching
                    methodologies and shaped by Stephen Cousins — ultra-marathoner, award-winning
                    filmmaker, and the runner behind Film My Run.
                  </p>

                  <div className="flex flex-wrap gap-2 mb-8">
                    {methodologies.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-full text-sm text-secondary"
                      >
                        <Award className="w-3.5 h-3.5 text-orange-500" />
                        {m}
                      </span>
                    ))}
                  </div>

                  <div className="p-5 rounded-2xl bg-surface border border-border">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          Want a human coach too?
                        </p>
                        <p className="text-sm text-secondary mt-1">
                          Premium members get Stephen 1-to-1 on WhatsApp — real answers about your
                          training, niggles, and race-day nerves from someone who&apos;s run it.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="aspect-square rounded-3xl overflow-hidden bg-surface-secondary border border-border">
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="w-20 h-20 rounded-full bg-orange-500/15 flex items-center justify-center mb-4">
                        <Youtube className="w-10 h-10 text-orange-500" />
                      </div>
                      <p className="font-display text-2xl font-bold text-foreground">Stephen Cousins</p>
                      <p className="text-secondary mt-1">Film My Run</p>
                      <p className="text-sm text-muted mt-3 max-w-xs">
                        15+ years racing everything from parkruns to 100-mile ultras, shared with a
                        community of 60,000+ runners.
                      </p>
                    </div>
                  </div>
                  <div className="absolute -top-6 -right-6 w-28 h-28 bg-orange-500/20 rounded-full blur-2xl" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 lg:py-32 bg-surface-secondary">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Simple, <span className="text-orange-500">Transparent</span> Pricing
              </h2>
              <p className="text-lg text-secondary max-w-2xl mx-auto">
                Start on the free plan and build a real training plan today. Upgrade when you want
                the AI coach, device sync, and personal coaching.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
              {plans.map((plan) => (
                <PricingCard key={plan.id} plan={plan} />
              ))}
            </div>

            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-2 text-muted">
                <Lock className="w-4 h-4" />
                <span className="text-sm">
                  No card required for the free plan. Upgrade or cancel anytime.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 lg:py-32 bg-background relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
              backgroundSize: '32px 32px',
            }}
          />

          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <Heart className="w-12 h-12 text-orange-500 mx-auto mb-6" />
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Ready to Transform
                <br />
                Your Running?
              </h2>
              <p className="text-lg text-secondary mb-8">
                Join the Film My Run community and start training with purpose. Your next race is
                closer than you think.
              </p>
              <a
                href={REGISTER_URL}
                className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
              >
                Start free
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
