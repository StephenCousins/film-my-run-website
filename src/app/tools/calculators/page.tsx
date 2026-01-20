'use client';

import { useState } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  Calculator,
  Timer,
  Target,
  TrendingUp,
  Zap,
  Gauge,
  Scale,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

// ============================================
// CALCULATOR TYPES
// ============================================

const calculators = [
  {
    id: 'pace',
    name: 'Pace Calculator',
    description: 'Convert between pace, speed, and time for any distance',
    icon: Calculator,
    color: 'from-orange-500 to-orange-600',
    popular: true,
  },
  {
    id: 'predictor',
    name: 'Race Predictor',
    description: 'Predict race times based on a recent performance',
    icon: Target,
    color: 'from-blue-500 to-blue-600',
    popular: true,
  },
  {
    id: 'splits',
    name: 'Splits Calculator',
    description: 'Calculate even or negative splits for your target time',
    icon: Timer,
    color: 'from-purple-500 to-purple-600',
    popular: false,
  },
  {
    id: 'age-grade',
    name: 'Age Grading',
    description: 'Calculate age-graded performance percentages',
    icon: TrendingUp,
    color: 'from-emerald-500 to-emerald-600',
    popular: false,
  },
  {
    id: 'vo2max',
    name: 'VO2 Max Estimator',
    description: 'Estimate your VO2 max from race results',
    icon: Zap,
    color: 'from-red-500 to-red-600',
    popular: false,
  },
  {
    id: 'zones',
    name: 'Training Zones',
    description: 'Calculate heart rate and pace training zones',
    icon: Gauge,
    color: 'from-cyan-500 to-cyan-600',
    popular: false,
  },
  {
    id: 'bmi',
    name: 'BMI Calculator',
    description: 'Calculate body mass index and ideal race weight',
    icon: Scale,
    color: 'from-amber-500 to-amber-600',
    popular: false,
  },
];

// ============================================
// PACE CALCULATOR COMPONENT (Example)
// ============================================

function PaceCalculator() {
  const [distance, setDistance] = useState('42.195');
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'miles'>('km');
  const [time, setTime] = useState({ hours: '3', minutes: '30', seconds: '0' });
  const [pace, setPace] = useState('');
  const [speed, setSpeed] = useState('');

  const calculatePace = () => {
    const dist = parseFloat(distance);
    const totalSeconds =
      parseInt(time.hours) * 3600 +
      parseInt(time.minutes) * 60 +
      parseInt(time.seconds);

    if (dist && totalSeconds) {
      const paceSecondsPerKm = totalSeconds / dist;
      const paceMinutes = Math.floor(paceSecondsPerKm / 60);
      const paceSeconds = Math.round(paceSecondsPerKm % 60);
      setPace(`${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /km`);

      const speedKmh = (dist / totalSeconds) * 3600;
      setSpeed(`${speedKmh.toFixed(2)} km/h`);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 lg:p-8">
      <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-6">
        Pace Calculator
      </h3>

      <div className="grid gap-6">
        {/* Distance input */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Distance
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              placeholder="42.195"
            />
            <select
              value={distanceUnit}
              onChange={(e) => setDistanceUnit(e.target.value as 'km' | 'miles')}
              className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            >
              <option value="km">km</option>
              <option value="miles">miles</option>
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            {['5', '10', '21.0975', '42.195'].map((d) => (
              <button
                key={d}
                onClick={() => setDistance(d)}
                className="px-3 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-orange-500/10 hover:text-orange-500 transition-colors"
              >
                {d === '21.0975' ? 'Half' : d === '42.195' ? 'Full' : `${d}K`}
              </button>
            ))}
          </div>
        </div>

        {/* Time input */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Time
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                value={time.hours}
                onChange={(e) => setTime({ ...time, hours: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white text-center focus:outline-none focus:border-orange-500"
                placeholder="0"
                min="0"
              />
              <span className="text-xs text-zinc-500 block text-center mt-1">hours</span>
            </div>
            <span className="text-2xl text-zinc-400 self-start mt-3">:</span>
            <div className="flex-1">
              <input
                type="number"
                value={time.minutes}
                onChange={(e) => setTime({ ...time, minutes: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white text-center focus:outline-none focus:border-orange-500"
                placeholder="0"
                min="0"
                max="59"
              />
              <span className="text-xs text-zinc-500 block text-center mt-1">minutes</span>
            </div>
            <span className="text-2xl text-zinc-400 self-start mt-3">:</span>
            <div className="flex-1">
              <input
                type="number"
                value={time.seconds}
                onChange={(e) => setTime({ ...time, seconds: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white text-center focus:outline-none focus:border-orange-500"
                placeholder="0"
                min="0"
                max="59"
              />
              <span className="text-xs text-zinc-500 block text-center mt-1">seconds</span>
            </div>
          </div>
        </div>

        {/* Calculate button */}
        <button
          onClick={calculatePace}
          className="w-full py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
        >
          Calculate
        </button>

        {/* Results */}
        {pace && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-orange-500">{pace}</div>
              <div className="text-xs text-zinc-500 mt-1">Pace</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-orange-500">{speed}</div>
              <div className="text-xs text-zinc-500 mt-1">Speed</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// CALCULATOR NAV
// ============================================

interface CalculatorNavProps {
  activeId: string;
  onChange: (id: string) => void;
}

function CalculatorNav({ activeId, onChange }: CalculatorNavProps) {
  return (
    <nav className="space-y-2">
      {calculators.map((calc) => {
        const Icon = calc.icon;
        const isActive = activeId === calc.id;

        return (
          <button
            key={calc.id}
            onClick={() => onChange(calc.id)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all',
              isActive
                ? 'bg-orange-500/10 text-orange-500'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                isActive ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800'
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className={cn('font-medium', isActive && 'text-orange-500')}>
                {calc.name}
              </div>
              <div className="text-xs text-zinc-500 line-clamp-1">{calc.description}</div>
            </div>
            {calc.popular && (
              <span className="px-2 py-0.5 text-xs bg-orange-500/10 text-orange-500 rounded-full">
                Popular
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ============================================
// CALCULATORS PAGE
// ============================================

export default function CalculatorsPage() {
  const [activeCalculator, setActiveCalculator] = useState('pace');

  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="py-12 lg:py-16 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="container">
            <div className="max-w-2xl">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
                Running Calculators
              </h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-400">
                Free tools used by over 250,000 runners every week. Calculate pace, predict
                race times, plan your splits, and more.
              </p>
            </div>
          </div>
        </section>

        {/* Calculators */}
        <section className="py-12 lg:py-16 bg-white dark:bg-zinc-950">
          <div className="container">
            <div className="grid lg:grid-cols-12 gap-8">
              {/* Calculator navigation - sidebar on desktop, dropdown on mobile */}
              <div className="lg:col-span-4 xl:col-span-3">
                <div className="lg:sticky lg:top-28">
                  {/* Mobile dropdown */}
                  <div className="lg:hidden mb-6">
                    <select
                      value={activeCalculator}
                      onChange={(e) => setActiveCalculator(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white"
                    >
                      {calculators.map((calc) => (
                        <option key={calc.id} value={calc.id}>
                          {calc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Desktop nav */}
                  <div className="hidden lg:block">
                    <h2 className="font-display font-bold text-zinc-900 dark:text-white mb-4">
                      Calculators
                    </h2>
                    <CalculatorNav
                      activeId={activeCalculator}
                      onChange={setActiveCalculator}
                    />
                  </div>
                </div>
              </div>

              {/* Active calculator */}
              <div className="lg:col-span-8 xl:col-span-9">
                {/* Currently showing pace calculator as example */}
                {/* TODO: Add all calculator components */}
                {activeCalculator === 'pace' && <PaceCalculator />}

                {activeCalculator !== 'pace' && (
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                      {(() => {
                        const calc = calculators.find((c) => c.id === activeCalculator);
                        const Icon = calc?.icon || Calculator;
                        return <Icon className="w-8 h-8 text-orange-500" />;
                      })()}
                    </div>
                    <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-2">
                      {calculators.find((c) => c.id === activeCalculator)?.name}
                    </h3>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                      {calculators.find((c) => c.id === activeCalculator)?.description}
                    </p>
                    <p className="text-sm text-zinc-500">
                      This calculator will be fully functional when integrated with the
                      existing running calculator codebase.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Other tools CTA */}
        <section className="py-16 bg-zinc-50 dark:bg-zinc-900">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-4">
                More Running Tools
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Explore our other free tools for runners.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Link
                href="/tools/parkrun"
                className="group p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-orange-500/50 transition-all"
              >
                <h3 className="font-display font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-orange-500 transition-colors">
                  Parkrun Stats
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Track your parkrun history and compare with friends.
                </p>
              </Link>

              <Link
                href="/tools/race-map"
                className="group p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-orange-500/50 transition-all"
              >
                <h3 className="font-display font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-orange-500 transition-colors">
                  Race Map
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Visualize race routes with elevation and markers.
                </p>
              </Link>

              <Link
                href="/races"
                className="group p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-orange-500/50 transition-all"
              >
                <h3 className="font-display font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-orange-500 transition-colors">
                  Race Dashboard
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Track and analyze all your race results.
                </p>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
