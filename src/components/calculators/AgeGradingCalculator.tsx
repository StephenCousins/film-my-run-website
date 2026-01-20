'use client';

import { useState, useEffect } from 'react';
import { formatTimeFromSeconds, getTimeInSeconds, getAgeGradingClassification, ageGradingEvents } from './utils';

interface AgeGradingResult {
  actualTime: string;
  ageGradedTime: string;
  ageGradedPercentage: number;
  classification: string;
  factor: number;
  openRecord: number;
}

export function AgeGradingCalculator() {
  const [age, setAge] = useState('40');
  const [gender, setGender] = useState<'men' | 'women'>('men');
  const [event, setEvent] = useState('5000m');
  const [time, setTime] = useState({ hours: '0', minutes: '25', seconds: '0' });
  const [result, setResult] = useState<AgeGradingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateAgeGrading = async () => {
    const ageNum = parseInt(age);
    const totalSeconds = getTimeInSeconds(
      parseInt(time.hours) || 0,
      parseInt(time.minutes) || 0,
      parseInt(time.seconds) || 0
    );

    if (ageNum < 30 || ageNum > 110) {
      setError('Age must be between 30 and 110 for WMA age grading.');
      return;
    }

    if (totalSeconds <= 0) {
      setError('Please enter a valid time.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/age-grading?gender=${gender}&event=${event}&age=${ageNum}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch age grading data');
      }

      const data = await response.json();
      const factor = data.factor;
      const openRecord = data.openRecord;

      // Calculate age-graded performance
      const ageGradedSeconds = totalSeconds * factor;
      const ageGradedPercentage = (openRecord / ageGradedSeconds) * 100;

      setResult({
        actualTime: formatTimeFromSeconds(totalSeconds),
        ageGradedTime: formatTimeFromSeconds(ageGradedSeconds),
        ageGradedPercentage,
        classification: getAgeGradingClassification(ageGradedPercentage),
        factor,
        openRecord,
      });
    } catch (err) {
      setError('Failed to calculate age grading. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 lg:p-8">
      <h3 className="font-display text-xl font-bold text-white mb-4">
        Age Grading Calculator
      </h3>

      <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-orange-800 dark:text-orange-300">
          Uses official <strong>World Masters Athletics (WMA) 2023</strong> age grading factors to
          compare performances across ages and genders. Age grading allows fair comparison of
          performances by accounting for natural age-related decline.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Age
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
              min="30"
              max="110"
            />
            <p className="text-xs text-zinc-500 mt-1">30-110 years</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as 'men' | 'women')}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
            >
              <option value="men">Male</option>
              <option value="women">Female</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Event
          </label>
          <select
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
          >
            {ageGradingEvents.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Your Time
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

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        <button
          onClick={calculateAgeGrading}
          disabled={loading}
          className="w-full py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Calculate Age Grade'}
        </button>

        {result && (
          <div className="space-y-4">
            {/* Main result */}
            <div className="p-6 bg-zinc-800 rounded-xl text-center">
              <div className="text-5xl font-mono font-bold text-orange-500">
                {result.ageGradedPercentage.toFixed(2)}%
              </div>
              <div className="text-lg font-semibold text-white mt-2">
                {result.classification}
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-800 rounded-xl">
                <div className="text-sm text-zinc-500 mb-1">Your Performance</div>
                <div className="text-lg font-mono font-semibold text-white">
                  {result.actualTime}
                </div>
              </div>
              <div className="p-4 bg-zinc-800 rounded-xl">
                <div className="text-sm text-zinc-500 mb-1">Age Graded Time</div>
                <div className="text-lg font-mono font-semibold text-white">
                  {result.ageGradedTime}
                </div>
              </div>
              <div className="p-4 bg-zinc-800 rounded-xl">
                <div className="text-sm text-zinc-500 mb-1">WMA Factor</div>
                <div className="text-lg font-mono font-semibold text-white">
                  {result.factor.toFixed(4)}
                </div>
              </div>
              <div className="p-4 bg-zinc-800 rounded-xl">
                <div className="text-sm text-zinc-500 mb-1">Open World Record</div>
                <div className="text-lg font-mono font-semibold text-white">
                  {formatTimeFromSeconds(result.openRecord)}
                </div>
              </div>
            </div>

            {/* Classification guide */}
            <div className="p-4 bg-zinc-800 rounded-xl">
              <h4 className="font-medium text-white mb-3">
                Age Grading Classifications
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">World Class:</span>
                  <span className="text-white">100%+</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">National Class:</span>
                  <span className="text-white">90-100%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Regional Class:</span>
                  <span className="text-white">80-90%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Local Class:</span>
                  <span className="text-white">70-80%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Excellent:</span>
                  <span className="text-white">60-70%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Good:</span>
                  <span className="text-white">&lt;60%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
