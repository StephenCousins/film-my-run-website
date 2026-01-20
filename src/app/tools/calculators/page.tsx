'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calculator,
  Timer,
  Target,
  TrendingUp,
  Zap,
  Gauge,
  Mountain,
  Cookie,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

// Import all calculator components
import {
  VO2MaxCalculator,
  RaceTimePredictorCalculator,
  AgeGradingCalculator,
  ElevationCalculator,
  TrainingZonesCalculator,
  NutritionCalculator,
} from '@/components/calculators';

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
    description: 'Predict race times based on recent performances',
    icon: Target,
    color: 'from-blue-500 to-blue-600',
    popular: true,
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
    id: 'age-grade',
    name: 'Age Grading',
    description: 'Calculate WMA age-graded performance percentages',
    icon: TrendingUp,
    color: 'from-emerald-500 to-emerald-600',
    popular: true,
  },
  {
    id: 'elevation',
    name: 'Elevation Adjustment',
    description: 'Adjust race times for elevation gain and terrain',
    icon: Mountain,
    color: 'from-purple-500 to-purple-600',
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
    id: 'nutrition',
    name: 'Nutrition Calculator',
    description: 'Plan your race nutrition and hydration strategy',
    icon: Cookie,
    color: 'from-amber-500 to-amber-600',
    popular: false,
  },
];

// ============================================
// PACE CALCULATOR COMPONENT
// ============================================

function PaceCalculator() {
  const [distance, setDistance] = useState('42.195');
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'miles'>('km');
  const [time, setTime] = useState({ hours: '3', minutes: '30', seconds: '0' });
  const [pace, setPace] = useState('');
  const [speed, setSpeed] = useState('');
  const [predictions, setPredictions] = useState<{ name: string; time: string }[]>([]);

  const calculatePace = () => {
    let dist = parseFloat(distance);
    if (distanceUnit === 'miles') {
      dist = dist * 1.60934;
    }

    const totalSeconds =
      parseInt(time.hours || '0') * 3600 +
      parseInt(time.minutes || '0') * 60 +
      parseInt(time.seconds || '0');

    if (dist && totalSeconds) {
      const paceSecondsPerKm = totalSeconds / dist;
      const paceMinutes = Math.floor(paceSecondsPerKm / 60);
      const paceSeconds = Math.round(paceSecondsPerKm % 60);
      setPace(`${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /km`);

      const paceSecondsPerMile = paceSecondsPerKm * 1.60934;
      const paceMiMin = Math.floor(paceSecondsPerMile / 60);
      const paceMiSec = Math.round(paceSecondsPerMile % 60);

      const speedKmh = (dist / totalSeconds) * 3600;
      setSpeed(`${speedKmh.toFixed(2)} km/h (${paceMiMin}:${paceMiSec.toString().padStart(2, '0')} /mile)`);

      // Calculate predictions for standard distances
      const distances = [
        { name: '5K', km: 5 },
        { name: '10K', km: 10 },
        { name: 'Half Marathon', km: 21.0975 },
        { name: 'Marathon', km: 42.195 },
      ];

      const preds = distances.map((d) => {
        const predictedSeconds = paceSecondsPerKm * d.km;
        const predHours = Math.floor(predictedSeconds / 3600);
        const predMinutes = Math.floor((predictedSeconds % 3600) / 60);
        const predSeconds = Math.floor(predictedSeconds % 60);
        return {
          name: d.name,
          time:
            predHours > 0
              ? `${predHours}:${predMinutes.toString().padStart(2, '0')}:${predSeconds.toString().padStart(2, '0')}`
              : `${predMinutes}:${predSeconds.toString().padStart(2, '0')}`,
        };
      });

      setPredictions(preds);
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
                onClick={() => {
                  setDistance(d);
                  setDistanceUnit('km');
                }}
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
          <div className="space-y-4">
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

            {predictions.length > 0 && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                <h4 className="font-medium text-zinc-900 dark:text-white mb-3">
                  At This Pace
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {predictions.map((pred) => (
                    <div key={pred.name} className="flex justify-between">
                      <span className="text-zinc-500">{pred.name}:</span>
                      <span className="font-mono text-zinc-900 dark:text-white">{pred.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

  const renderCalculator = () => {
    switch (activeCalculator) {
      case 'pace':
        return <PaceCalculator />;
      case 'predictor':
        return <RaceTimePredictorCalculator />;
      case 'vo2max':
        return <VO2MaxCalculator />;
      case 'age-grade':
        return <AgeGradingCalculator />;
      case 'elevation':
        return <ElevationCalculator />;
      case 'zones':
        return <TrainingZonesCalculator />;
      case 'nutrition':
        return <NutritionCalculator />;
      default:
        return <PaceCalculator />;
    }
  };

  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="relative py-20 lg:py-28 overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
          {/* Background image */}
          <div className="absolute inset-0">
            <Image
              src="https://filmmyrun.co.uk/wp-content/uploads/2017/04/transvulcania2017-5127-scaled.jpg"
              alt="Trail running"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/70 to-zinc-950" />
          </div>

          <div className="container relative">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
                <Calculator className="w-4 h-4 text-orange-500" />
                <span className="text-orange-400 text-sm font-medium">Free Running Tools</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Running Calculators
              </h1>
              <p className="text-lg text-zinc-300">
                Free tools used by over 250,000 runners every week. Calculate pace, predict
                race times, age-grade your results, plan nutrition, and more.
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
              <div className="lg:col-span-8 xl:col-span-9">{renderCalculator()}</div>
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
