'use client';

import { useState } from 'react';
import { formatTimeFromSeconds, getTimeInSeconds } from './utils';

export function ElevationCalculator() {
  const [distance, setDistance] = useState('21.0975');
  const [time, setTime] = useState({ hours: '1', minutes: '45', seconds: '0' });
  const [elevGain, setElevGain] = useState('500');
  const [elevLoss, setElevLoss] = useState('500');
  const [terrain, setTerrain] = useState('1.1');

  const [result, setResult] = useState<{
    originalTime: string;
    adjustedTime: string;
    timeDifference: number;
    equivalentFlatDistance: number;
    gainPenalty: number;
    lossBenefit: number;
    terrainPenalty: number;
  } | null>(null);

  const calculateElevation = () => {
    const dist = parseFloat(distance);
    const flatTimeSeconds = getTimeInSeconds(
      parseInt(time.hours) || 0,
      parseInt(time.minutes) || 0,
      parseInt(time.seconds) || 0
    );
    const gain = parseFloat(elevGain) || 0;
    const loss = parseFloat(elevLoss) || 0;
    const terrainFactor = parseFloat(terrain);

    if (!dist || !flatTimeSeconds) return;

    // Naismith's Rule: +1 minute per 10m elevation gain
    // Modified: -0.5 minutes per 10m elevation loss (but capped)
    const gainPenalty = (gain / 10) * 60; // seconds
    const lossBenefit = Math.min((loss / 10) * 30, (gain / 10) * 30); // seconds, capped at half the gain penalty

    // Apply terrain factor
    const terrainPenalty = flatTimeSeconds * (terrainFactor - 1);

    const adjustedTimeSeconds = flatTimeSeconds + gainPenalty - lossBenefit + terrainPenalty;

    // Calculate equivalent flat distance
    const flatPacePerKm = flatTimeSeconds / dist;
    const equivalentFlatDistance = adjustedTimeSeconds / flatPacePerKm;

    const timeDifference = adjustedTimeSeconds - flatTimeSeconds;

    setResult({
      originalTime: formatTimeFromSeconds(flatTimeSeconds),
      adjustedTime: formatTimeFromSeconds(adjustedTimeSeconds),
      timeDifference: Math.round(timeDifference / 60),
      equivalentFlatDistance,
      gainPenalty: Math.round(gainPenalty / 60),
      lossBenefit: Math.round(lossBenefit / 60),
      terrainPenalty: Math.round(terrainPenalty / 60),
    });
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 lg:p-8">
      <h3 className="font-display text-xl font-bold text-white mb-4">
        Elevation Adjustment Calculator
      </h3>

      <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-orange-800 dark:text-orange-300">
          Uses <strong>Naismith&apos;s Rule</strong> to adjust your flat time for elevation gain/loss and
          terrain difficulty. Essential for planning trail and mountain races.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Distance (km)
          </label>
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
            placeholder="21.0975"
          />
          <div className="flex gap-2 mt-2">
            {['10', '21.0975', '42.195', '50'].map((d) => (
              <button
                key={d}
                onClick={() => setDistance(d)}
                className="px-3 py-1 text-xs bg-zinc-800 rounded-full hover:bg-orange-500/10 hover:text-orange-500 transition-colors"
              >
                {d === '21.0975' ? 'Half' : d === '42.195' ? 'Full' : `${d}K`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Flat Time (your road pace for this distance)
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                value={time.hours}
                onChange={(e) => setTime({ ...time, hours: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center focus:outline-none focus:border-orange-500"
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
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center focus:outline-none focus:border-orange-500"
                min="0"
                max="59"
              />
              <span className="text-xs text-zinc-500 block text-center mt-1">min</span>
            </div>
            <span className="text-2xl text-zinc-400 self-start mt-3">:</span>
            <div className="flex-1">
              <input
                type="number"
                value={time.seconds}
                onChange={(e) => setTime({ ...time, seconds: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center focus:outline-none focus:border-orange-500"
                min="0"
                max="59"
              />
              <span className="text-xs text-zinc-500 block text-center mt-1">sec</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Elevation Gain (m)
            </label>
            <input
              type="number"
              value={elevGain}
              onChange={(e) => setElevGain(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
              placeholder="500"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Elevation Loss (m)
            </label>
            <input
              type="number"
              value={elevLoss}
              onChange={(e) => setElevLoss(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
              placeholder="500"
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Terrain Difficulty
          </label>
          <select
            value={terrain}
            onChange={(e) => setTerrain(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
          >
            <option value="1.0">Smooth trail / Fire road</option>
            <option value="1.1">Moderate trail</option>
            <option value="1.2">Technical trail / Rocky</option>
            <option value="1.3">Very technical / Scrambling</option>
          </select>
        </div>

        <button
          onClick={calculateElevation}
          className="w-full py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
        >
          Calculate Adjusted Time
        </button>

        {result && (
          <div className="space-y-4">
            {/* Main result */}
            <div className="p-6 bg-zinc-800 rounded-xl">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-sm text-zinc-500 mb-1">Flat Time</div>
                  <div className="text-2xl font-mono font-bold text-white">
                    {result.originalTime}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-zinc-500 mb-1">Adjusted Time</div>
                  <div className="text-2xl font-mono font-bold text-orange-500">
                    {result.adjustedTime}
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="p-4 bg-zinc-800 rounded-xl">
              <h4 className="font-medium text-white mb-3">Time Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Elevation gain penalty:</span>
                  <span className="text-red-500">+{result.gainPenalty} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Elevation loss benefit:</span>
                  <span className="text-green-500">-{result.lossBenefit} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Terrain factor:</span>
                  <span className="text-red-500">+{result.terrainPenalty} min</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-700 font-medium">
                  <span className="text-white">Total added time:</span>
                  <span className="text-orange-500">+{result.timeDifference} min</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-800 rounded-xl">
              <div className="text-center">
                <div className="text-sm text-zinc-500 mb-1">Equivalent Flat Distance</div>
                <div className="text-xl font-mono font-semibold text-white">
                  {result.equivalentFlatDistance.toFixed(1)} km
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  This race is equivalent to running {result.equivalentFlatDistance.toFixed(1)}km on
                  flat ground
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl">
              <h4 className="font-medium text-orange-900 dark:text-orange-300 mb-2">
                Race Day Tips
              </h4>
              <ul className="text-sm text-orange-800 dark:text-orange-300 space-y-1">
                <li>
                  <strong>Start conservative:</strong> Hills at the beginning feel easier than they
                  are
                </li>
                <li>
                  <strong>Walk steep climbs:</strong> Power hiking saves energy for later
                </li>
                <li>
                  <strong>Control descents:</strong> Eccentric damage from downhills causes
                  late-race fatigue
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
