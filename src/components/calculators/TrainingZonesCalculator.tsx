'use client';

import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  calculateHRZones as calculateHRZonesResult,
  calculatePaceZones as calculatePaceZonesResult,
  hrZonesInputFromForm,
  paceZonesInputFromForm,
  type HRZone,
  type PaceZone,
} from '@/lib/calculators';

type ZoneMode = 'hr' | 'pace';

export function TrainingZonesCalculator() {
  const { requireAuth, LoginModal } = useRequireAuth({ feature: 'running calculators' });
  const [mode, setMode] = useState<ZoneMode>('hr');

  // HR mode inputs
  const [maxHR, setMaxHR] = useState('180');
  const [restHR, setRestHR] = useState('55');

  // Pace mode inputs
  const [thresholdMin, setThresholdMin] = useState('4');
  const [thresholdSec, setThresholdSec] = useState('30');

  const [hrZones, setHRZones] = useState<HRZone[] | null>(null);
  const [paceZones, setPaceZones] = useState<PaceZone[] | null>(null);

  const calculateHRZones = () => {
    // Maths lives in src/lib/calculators/trainingZones.ts (shared with the iPhone app).
    const zones = calculateHRZonesResult(hrZonesInputFromForm({ maxHR, restHR }));
    if (!zones) return;
    setHRZones(zones);
    setPaceZones(null);
  };

  const calculatePaceZones = () => {
    const zones = calculatePaceZonesResult(paceZonesInputFromForm({ thresholdMin, thresholdSec }));
    if (!zones) return;
    setPaceZones(zones);
    setHRZones(null);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 lg:p-8">
      <h3 className="font-display text-xl font-bold text-white mb-4">
        Training Zones Calculator
      </h3>

      <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-orange-800 dark:text-orange-300">
          <strong>Train smarter, not harder:</strong> Proper training zones prevent overtraining and
          maximize results. 80% of your running should be in Zone 2 (easy), with 20% in higher zones
          for quality work.
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 p-1 bg-zinc-800 rounded-xl mb-6">
        <button
          onClick={() => {
            setMode('hr');
            setPaceZones(null);
          }}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            mode === 'hr'
              ? 'bg-orange-500 text-white'
              : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Heart Rate Based
        </button>
        <button
          onClick={() => {
            setMode('pace');
            setHRZones(null);
          }}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            mode === 'pace'
              ? 'bg-orange-500 text-white'
              : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Pace Based
        </button>
      </div>

      <div className="space-y-6">
        {mode === 'hr' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Maximum Heart Rate (bpm)
              </label>
              <input
                type="number"
                value={maxHR}
                onChange={(e) => setMaxHR(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                placeholder="180"
                min="100"
                max="220"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Estimate: 220 - age, or get tested for accuracy
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Resting Heart Rate (bpm)
              </label>
              <input
                type="number"
                value={restHR}
                onChange={(e) => setRestHR(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                placeholder="55"
                min="30"
                max="100"
              />
              <p className="text-xs text-zinc-500 mt-1">Measure first thing in the morning</p>
            </div>

            <button
              onClick={() => requireAuth(calculateHRZones)}
              className="w-full py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
            >
              Calculate Heart Rate Zones
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Threshold Pace (min/km)
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    value={thresholdMin}
                    onChange={(e) => setThresholdMin(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center focus:outline-none focus:border-orange-500"
                    min="3"
                    max="10"
                  />
                  <span className="text-xs text-zinc-500 block text-center mt-1">min</span>
                </div>
                <span className="text-2xl text-zinc-400 self-start mt-3">:</span>
                <div className="flex-1">
                  <input
                    type="number"
                    value={thresholdSec}
                    onChange={(e) => setThresholdSec(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center focus:outline-none focus:border-orange-500"
                    min="0"
                    max="59"
                  />
                  <span className="text-xs text-zinc-500 block text-center mt-1">sec</span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Pace you could hold for ~1 hour (like a 10K race pace for experienced runners)
              </p>
            </div>

            <button
              onClick={() => requireAuth(calculatePaceZones)}
              className="w-full py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
            >
              Calculate Pace Zones
            </button>
          </>
        )}

        {/* HR Zones Results */}
        {hrZones && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-800 rounded-xl">
              <div className="text-center">
                <div className="text-sm text-zinc-500 mb-1">Heart Rate Reserve</div>
                <div className="text-xl font-mono font-semibold text-white">
                  {parseInt(maxHR) - parseInt(restHR)} bpm
                </div>
                <p className="text-xs text-zinc-500">Max {maxHR} - Rest {restHR}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-orange-500 text-white">
                    <th className="px-3 py-2 text-left rounded-tl-lg">Zone</th>
                    <th className="px-3 py-2 text-left">HR Range</th>
                    <th className="px-3 py-2 text-left">% HR</th>
                    <th className="px-3 py-2 text-left hidden md:table-cell">Purpose</th>
                    <th className="px-3 py-2 text-left rounded-tr-lg">Training %</th>
                  </tr>
                </thead>
                <tbody>
                  {hrZones.map((zone, i) => (
                    <tr
                      key={zone.name}
                      className={`border-b border-zinc-700 ${
                        i === 1
                          ? 'bg-orange-50 dark:bg-orange-500/10'
                          : 'bg-zinc-900'
                      }`}
                    >
                      <td className="px-3 py-3 font-medium text-white">
                        {zone.name}
                        {i === 1 && (
                          <span className="ml-2 text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded">
                            Most Training
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-zinc-300">
                        {zone.minHR}-{zone.maxHR}
                      </td>
                      <td className="px-3 py-3 text-zinc-500">
                        {zone.minPercent}-{zone.maxPercent}%
                      </td>
                      <td className="px-3 py-3 text-zinc-500 hidden md:table-cell">{zone.purpose}</td>
                      <td className="px-3 py-3 text-zinc-500">{zone.trainingPercent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pace Zones Results */}
        {paceZones && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-800 rounded-xl">
              <div className="text-center">
                <div className="text-sm text-zinc-500 mb-1">Threshold Pace</div>
                <div className="text-xl font-mono font-semibold text-white">
                  {thresholdMin}:{thresholdSec.padStart(2, '0')}/km
                </div>
                <p className="text-xs text-zinc-500">Baseline for zone calculation</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-orange-500 text-white">
                    <th className="px-3 py-2 text-left rounded-tl-lg">Zone</th>
                    <th className="px-3 py-2 text-left">Pace</th>
                    <th className="px-3 py-2 text-left rounded-tr-lg">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {paceZones.map((zone, i) => (
                    <tr
                      key={zone.name}
                      className={`border-b border-zinc-700 ${
                        i === 1
                          ? 'bg-orange-50 dark:bg-orange-500/10'
                          : 'bg-zinc-900'
                      }`}
                    >
                      <td className="px-3 py-3 font-medium text-white">
                        {zone.name}
                        {i === 1 && (
                          <span className="ml-2 text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded">
                            Most Training
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-orange-500 font-semibold">
                        ~{zone.pace}
                      </td>
                      <td className="px-3 py-3 text-zinc-500">{zone.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 80/20 Rule */}
        {(hrZones || paceZones) && (
          <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl">
            <h4 className="font-medium text-orange-900 dark:text-orange-300 mb-2">
              The 80/20 Rule
            </h4>
            <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
              <strong>80% of your training should be EASY (Zone 2)</strong> - this builds your
              aerobic base without excessive fatigue. The remaining 20% should be quality work
              (Zones 3-5).
            </p>
            <ul className="text-sm text-orange-800 dark:text-orange-300 space-y-1">
              <li>
                <strong>Weekly structure:</strong> 4 easy runs + 1 tempo + 1 interval session
              </li>
              <li>
                <strong>Ultra training:</strong> Focus even more on Zone 2 - aim for 85-90% easy
              </li>
              <li>
                <strong>Signs you&apos;re going too hard:</strong> Tired legs on easy runs, elevated
                resting HR
              </li>
            </ul>
          </div>
        )}
      </div>
      {LoginModal}
    </div>
  );
}
