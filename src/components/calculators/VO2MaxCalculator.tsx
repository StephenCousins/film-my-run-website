'use client';

import { useState } from 'react';
import { getVO2Classification, getTimeInSeconds } from './utils';

type TestType = 'vdot' | 'cooper' | 'custom';

export function VO2MaxCalculator() {
  const [testType, setTestType] = useState<TestType>('vdot');
  const [result, setResult] = useState<{
    vo2max: number;
    classification: string;
    hrReserve?: number;
  } | null>(null);

  // VDOT inputs
  const [vdotDistance, setVdotDistance] = useState('5000');
  const [vdotTime, setVdotTime] = useState({ hours: '0', minutes: '25', seconds: '0' });

  // Cooper test inputs
  const [cooperDistance, setCooperDistance] = useState('2400');

  // Custom inputs
  const [customGender, setCustomGender] = useState<'male' | 'female'>('male');
  const [customAge, setCustomAge] = useState('30');
  const [customTime, setCustomTime] = useState({ hours: '0', minutes: '25', seconds: '0' });
  const [customMaxHR, setCustomMaxHR] = useState('190');
  const [customRestHR, setCustomRestHR] = useState('60');

  const calculateVO2Max = () => {
    let vo2max = 0;
    let hrReserve: number | undefined;

    if (testType === 'vdot') {
      const distance = parseFloat(vdotDistance);
      const totalSeconds = getTimeInSeconds(
        parseInt(vdotTime.hours) || 0,
        parseInt(vdotTime.minutes) || 0,
        parseInt(vdotTime.seconds) || 0
      );

      if (!distance || !totalSeconds) return;

      const totalTimeMinutes = totalSeconds / 60;
      const speed = distance / totalTimeMinutes;
      vo2max = 0.2 * speed + 3.5;
    } else if (testType === 'cooper') {
      const distance = parseFloat(cooperDistance);
      if (!distance) return;
      vo2max = (distance - 504.9) / 44.73;
    } else if (testType === 'custom') {
      const age = parseInt(customAge);
      const maxHR = parseFloat(customMaxHR);
      const restHR = parseFloat(customRestHR);
      const totalSeconds = getTimeInSeconds(
        parseInt(customTime.hours) || 0,
        parseInt(customTime.minutes) || 0,
        parseInt(customTime.seconds) || 0
      );

      if (!age || !maxHR || !restHR || !totalSeconds) return;

      const totalTimeMinutes = totalSeconds / 60;
      const distance = 5000;
      const speed = distance / totalTimeMinutes;
      const vo2maxTime = 0.2 * speed + 3.5;
      const vo2maxHR = 15 * (maxHR / restHR);
      vo2max = (vo2maxTime + vo2maxHR) / 2;

      if (customGender === 'female') {
        vo2max = vo2max * 0.95;
      }

      if (age > 25) {
        const yearsOver25 = age - 25;
        let ageAdjustmentFactor = 1 - 0.002 * yearsOver25;
        ageAdjustmentFactor = Math.max(ageAdjustmentFactor, 0.7);
        vo2max = vo2max * ageAdjustmentFactor;
      }

      hrReserve = maxHR - restHR;
    }

    setResult({
      vo2max,
      classification: getVO2Classification(vo2max),
      hrReserve,
    });
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 lg:p-8">
      <h3 className="font-display text-xl font-bold text-white mb-4">
        VO2 Max Estimator
      </h3>

      <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-orange-800 dark:text-orange-300">
          <strong>VO2 Max</strong> is the maximum rate of oxygen your body can use during exercise.
          It&apos;s a key indicator of aerobic fitness.
        </p>
      </div>

      <div className="space-y-6">
        {/* Test type selector */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Test Method
          </label>
          <select
            value={testType}
            onChange={(e) => {
              setTestType(e.target.value as TestType);
              setResult(null);
            }}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
          >
            <option value="vdot">VDOT (Race Time)</option>
            <option value="cooper">Cooper Test (12-min run)</option>
            <option value="custom">Custom (with HR data)</option>
          </select>
        </div>

        {/* VDOT Form */}
        {testType === 'vdot' && (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Race Distance (meters)
              </label>
              <input
                type="number"
                value={vdotDistance}
                onChange={(e) => setVdotDistance(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                placeholder="5000"
              />
              <div className="flex gap-2 mt-2">
                {['1609', '5000', '10000', '21097'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setVdotDistance(d)}
                    className="px-3 py-1 text-xs bg-zinc-800 rounded-full hover:bg-orange-500/10 hover:text-orange-500 transition-colors"
                  >
                    {d === '1609' ? 'Mile' : d === '21097' ? 'Half' : `${parseInt(d) / 1000}K`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Race Time
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    value={vdotTime.hours}
                    onChange={(e) => setVdotTime({ ...vdotTime, hours: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center focus:outline-none focus:border-orange-500"
                    min="0"
                  />
                  <span className="text-xs text-zinc-500 block text-center mt-1">hours</span>
                </div>
                <span className="text-2xl text-zinc-400 self-start mt-3">:</span>
                <div className="flex-1">
                  <input
                    type="number"
                    value={vdotTime.minutes}
                    onChange={(e) => setVdotTime({ ...vdotTime, minutes: e.target.value })}
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
                    value={vdotTime.seconds}
                    onChange={(e) => setVdotTime({ ...vdotTime, seconds: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center focus:outline-none focus:border-orange-500"
                    min="0"
                    max="59"
                  />
                  <span className="text-xs text-zinc-500 block text-center mt-1">sec</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Cooper Test Form */}
        {testType === 'cooper' && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Distance covered in 12 minutes (meters)
            </label>
            <input
              type="number"
              value={cooperDistance}
              onChange={(e) => setCooperDistance(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
              placeholder="2400"
            />
            <p className="text-xs text-zinc-500 mt-2">
              Run as far as you can in 12 minutes and enter the distance.
            </p>
          </div>
        )}

        {/* Custom Form */}
        {testType === 'custom' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Gender
                </label>
                <select
                  value={customGender}
                  onChange={(e) => setCustomGender(e.target.value as 'male' | 'female')}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={customAge}
                  onChange={(e) => setCustomAge(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  min="10"
                  max="100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                5K Time
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    value={customTime.hours}
                    onChange={(e) => setCustomTime({ ...customTime, hours: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center focus:outline-none focus:border-orange-500"
                    min="0"
                  />
                  <span className="text-xs text-zinc-500 block text-center mt-1">hours</span>
                </div>
                <span className="text-2xl text-zinc-400 self-start mt-3">:</span>
                <div className="flex-1">
                  <input
                    type="number"
                    value={customTime.minutes}
                    onChange={(e) => setCustomTime({ ...customTime, minutes: e.target.value })}
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
                    value={customTime.seconds}
                    onChange={(e) => setCustomTime({ ...customTime, seconds: e.target.value })}
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
                  Max Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  value={customMaxHR}
                  onChange={(e) => setCustomMaxHR(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  placeholder="190"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Resting HR (bpm)
                </label>
                <input
                  type="number"
                  value={customRestHR}
                  onChange={(e) => setCustomRestHR(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  placeholder="60"
                />
              </div>
            </div>
          </>
        )}

        <button
          onClick={calculateVO2Max}
          className="w-full py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
        >
          Calculate VO2 Max
        </button>

        {result && (
          <div className="p-6 bg-zinc-800 rounded-xl space-y-4">
            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-orange-500">
                {result.vo2max.toFixed(1)}
              </div>
              <div className="text-sm text-zinc-500 mt-1">ml/kg/min</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-zinc-900 rounded-lg">
                <div className="text-lg font-semibold text-white">
                  {result.classification}
                </div>
                <div className="text-xs text-zinc-500">Classification</div>
              </div>
              {result.hrReserve && (
                <div className="text-center p-3 bg-zinc-900 rounded-lg">
                  <div className="text-lg font-semibold text-white">
                    {result.hrReserve} bpm
                  </div>
                  <div className="text-xs text-zinc-500">HR Reserve</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
