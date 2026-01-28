'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  Target,
  TrendingUp,
  Zap,
  Clock,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Play,
  Star,
  Users,
  Award,
  Heart,
  ArrowRight,
  Lock,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

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
  highlighted?: boolean;
  badge?: string;
}

interface Testimonial {
  id: string;
  name: string;
  image: string;
  role: string;
  quote: string;
  result: string;
}

// ============================================
// DATA
// ============================================

const features = [
  {
    icon: Calendar,
    title: 'Personalized Plans',
    description:
      'AI-generated training schedules tailored to your goal race, current fitness, and available time.',
  },
  {
    icon: Target,
    title: 'Goal Setting',
    description:
      'Set your target time and let the app calculate the optimal training paces and progression.',
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    description:
      'Visualize your improvement over time with detailed analytics and performance metrics.',
  },
  {
    icon: Zap,
    title: 'Workout Guidance',
    description:
      'Each session comes with detailed instructions, target paces, and coaching tips.',
  },
  {
    icon: Clock,
    title: 'Flexible Scheduling',
    description:
      'Adjust your plan on the fly when life gets in the way. The AI adapts to keep you on track.',
  },
  {
    icon: BarChart3,
    title: 'Race Predictions',
    description:
      'Get accurate race time predictions based on your training data and recent performances.',
  },
];

const plans: PricingPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 9.99,
    period: '/month',
    description: 'Perfect for trying out the platform or short training blocks.',
    features: [
      'Full access to all training plans',
      'Personalized pace calculations',
      'Progress tracking & analytics',
      'Workout library with 100+ sessions',
      'Email support',
    ],
  },
  {
    id: 'annual',
    name: 'Annual',
    price: 79.99,
    period: '/year',
    description: 'Best value for committed runners. Train smarter all year.',
    features: [
      'Everything in Monthly',
      '2 months free (save £40)',
      'Priority support',
      'Early access to new features',
      'Exclusive training guides',
      'Race day preparation toolkit',
    ],
    highlighted: true,
    badge: 'Best Value',
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: 199.99,
    period: 'one-time',
    description: 'One payment, unlimited access forever. For the dedicated runner.',
    features: [
      'Everything in Annual',
      'Never pay again',
      'Founding member badge',
      '1-on-1 onboarding call',
      'Custom plan consultation',
      'Support the community',
    ],
    badge: 'Limited',
  },
];

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    image: 'https://images.filmmyrun.co.uk/testimonials/sarah.jpg',
    role: 'First-time marathoner',
    quote:
      'The personalized plan took me from barely running 5K to completing my first marathon. The pacing guidance was spot-on.',
    result: '4:12 marathon',
  },
  {
    id: '2',
    name: 'James Cooper',
    image: 'https://images.filmmyrun.co.uk/testimonials/james.jpg',
    role: 'Sub-3 chaser',
    quote:
      'After years of plateauing, the structured approach helped me finally break 3 hours. The workout variety kept me engaged.',
    result: '2:58 marathon',
  },
  {
    id: '3',
    name: 'Emma Thompson',
    image: 'https://images.filmmyrun.co.uk/testimonials/emma.jpg',
    role: 'Ultra runner',
    quote:
      'Adapting the training around my busy schedule was seamless. The app understood that life happens and adjusted accordingly.',
    result: '50K finisher',
  },
];

const stats = [
  { value: '50K+', label: 'Active Users' },
  { value: '2M+', label: 'Workouts Completed' },
  { value: '4.9', label: 'App Store Rating' },
  { value: '23min', label: 'Avg. PB Improvement' },
];

// ============================================
// PRICING CARD
// ============================================

function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div
      className={cn(
        'relative rounded-2xl p-8 transition-all duration-300',
        plan.highlighted
          ? 'bg-orange-500 text-white scale-105 shadow-2xl shadow-orange-500/30'
          : 'bg-zinc-900 border border-zinc-800 hover:border-orange-500/50'
      )}
    >
      {/* Badge */}
      {plan.badge && (
        <div className="absolute -top-3 right-6">
          <span
            className={cn(
              'px-3 py-1 text-xs font-bold rounded-full',
              plan.highlighted
                ? 'bg-white text-orange-500'
                : 'bg-orange-500 text-white'
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
          plan.highlighted ? 'text-white' : 'text-white'
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
        <span
          className={cn(
            'text-sm ml-1',
            plan.highlighted ? 'text-white/80' : 'text-zinc-500'
          )}
        >
          {plan.period}
        </span>
      </div>

      {/* Description */}
      <p
        className={cn(
          'text-sm mb-6',
          plan.highlighted ? 'text-white/90' : 'text-zinc-400'
        )}
      >
        {plan.description}
      </p>

      {/* Features */}
      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <CheckCircle2
              className={cn(
                'w-5 h-5 flex-shrink-0 mt-0.5',
                plan.highlighted ? 'text-white' : 'text-orange-500'
              )}
            />
            <span
              className={cn(
                'text-sm',
                plan.highlighted ? 'text-white/90' : 'text-zinc-300'
              )}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        className={cn(
          'w-full py-3 font-semibold rounded-full transition-all',
          plan.highlighted
            ? 'bg-white text-orange-500 hover:bg-zinc-100'
            : 'bg-orange-500 text-white hover:bg-orange-600'
        )}
      >
        Get Started
      </button>
    </div>
  );
}

// ============================================
// TESTIMONIAL CARD
// ============================================

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
        ))}
      </div>

      {/* Quote */}
      <p className="text-zinc-300 mb-6 leading-relaxed">
        "{testimonial.quote}"
      </p>

      {/* Result badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 rounded-full mb-6">
        <Award className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-medium text-orange-500">{testimonial.result}</span>
      </div>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          {/* Placeholder for avatar */}
          <div className="w-full h-full flex items-center justify-center text-zinc-400">
            <Users className="w-6 h-6" />
          </div>
        </div>
        <div>
          <div className="font-medium text-white">
            {testimonial.name}
          </div>
          <div className="text-sm text-zinc-500">{testimonial.role}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// TRAINING PAGE
// ============================================

export default function TrainingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');

  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-purple-500/10" />

          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(251,146,60,0.3) 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />

          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-full mb-6">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-500">
                  Marathon Plan App
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                Train Smarter.
                <br />
                <span className="text-orange-500">Race Faster.</span>
              </h1>

              <p className="text-lg lg:text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
                Personalized marathon and half-marathon training plans powered by AI.
                Join 50,000+ runners who've achieved their goals with our proven methodology.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="#pricing"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button className="inline-flex items-center gap-2 px-8 py-4 border border-zinc-700 rounded-full hover:border-orange-500 transition-colors group">
                  <Play className="w-5 h-5 text-orange-500" />
                  <span className="group-hover:text-orange-500 transition-colors">
                    Watch Demo
                  </span>
                </button>
              </div>

              {/* Social proof */}
              <div className="flex items-center justify-center gap-6 mt-12 pt-8 border-t border-zinc-800">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-white dark:border-zinc-950"
                    />
                  ))}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                    <span className="text-sm font-medium text-white ml-1">
                      4.9
                    </span>
                  </div>
                  <div className="text-sm text-zinc-500">from 2,500+ reviews</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 bg-zinc-900 dark:bg-zinc-950">
          <div className="container">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-mono text-3xl lg:text-4xl font-bold text-orange-500 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-zinc-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 lg:py-32 bg-zinc-950">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                Everything You Need to
                <span className="text-orange-500"> Reach Your Goal</span>
              </h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                Our comprehensive training platform adapts to your life, not the other way around.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group p-6 bg-zinc-900 rounded-2xl hover:bg-orange-500 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 group-hover:bg-white/20 flex items-center justify-center mb-4 transition-colors">
                      <Icon className="w-6 h-6 text-orange-500 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-white group-hover:text-white mb-2 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-zinc-400 group-hover:text-white/80 transition-colors">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* App preview */}
        <section className="py-20 lg:py-32 bg-zinc-900 overflow-hidden">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
                  Your Personal Coach,
                  <br />
                  <span className="text-orange-500">Always Available</span>
                </h2>
                <p className="text-lg text-zinc-400 mb-8">
                  The Marathon Plan App combines years of coaching expertise with modern AI
                  to deliver personalized training that adapts to your progress, schedule, and goals.
                </p>

                <ul className="space-y-4 mb-8">
                  {[
                    'Plans for 5K to Ultra Marathon distances',
                    'Syncs with Strava, Garmin, and Apple Watch',
                    'Adjusts automatically when you miss workouts',
                    'Built-in pace calculator and race predictor',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      <span className="text-zinc-300">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="#pricing"
                  className="inline-flex items-center gap-2 text-orange-500 font-semibold hover:text-orange-600 transition-colors"
                >
                  Start your free trial
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>

              {/* App mockup placeholder */}
              <div className="relative">
                <div className="relative mx-auto w-64 lg:w-80">
                  {/* Phone frame */}
                  <div className="relative bg-zinc-900 rounded-[3rem] p-3 shadow-2xl">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-900 rounded-b-2xl" />
                    <div className="aspect-[9/19] bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-[2.5rem] overflow-hidden">
                      {/* App screen placeholder */}
                      <div className="h-full flex flex-col p-4">
                        <div className="text-white text-sm font-medium mb-4">Today's Workout</div>
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

                  {/* Decorative elements */}
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl" />
                  <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 lg:py-32 bg-zinc-950">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                Trusted by <span className="text-orange-500">Thousands</span> of Runners
              </h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                See what our community has achieved with personalized training.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 lg:py-32 bg-zinc-900">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                Simple, <span className="text-orange-500">Transparent</span> Pricing
              </h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
                Start with a 14-day free trial. No credit card required.
              </p>

              {/* Billing toggle */}
              <div className="inline-flex items-center gap-4 p-1 bg-zinc-800 rounded-full shadow-sm">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={cn(
                    'px-6 py-2 rounded-full text-sm font-medium transition-all',
                    billingPeriod === 'monthly'
                      ? 'bg-orange-500 text-white'
                      : 'text-zinc-400 hover:text-orange-500'
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={cn(
                    'px-6 py-2 rounded-full text-sm font-medium transition-all',
                    billingPeriod === 'annual'
                      ? 'bg-orange-500 text-white'
                      : 'text-zinc-400 hover:text-orange-500'
                  )}
                >
                  Annual
                  <span className="ml-2 text-xs text-emerald-500">Save 33%</span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
              {plans.map((plan) => (
                <PricingCard key={plan.id} plan={plan} />
              ))}
            </div>

            {/* Guarantee */}
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-2 text-zinc-400">
                <Lock className="w-4 h-4" />
                <span className="text-sm">30-day money-back guarantee. Cancel anytime.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 lg:py-32 bg-zinc-900 dark:bg-black relative overflow-hidden">
          {/* Background pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px',
            }}
          />

          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <Heart className="w-12 h-12 text-orange-500 mx-auto mb-6" />
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to Transform
                <br />
                Your Running?
              </h2>
              <p className="text-lg text-zinc-400 mb-8">
                Join the Film My Run community and start training with purpose.
                Your marathon goals are closer than you think.
              </p>
              <Link
                href="#pricing"
                className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
              >
                Start Your Free Trial
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
