'use client';

import { useState } from 'react';
import { formatTimeFromSeconds, getTimeInSeconds, standardDistances } from './utils';

export function RaceTimePredictorCalculator() {
  const [mode, setMode] = useState<'quick' | 'advanced'>('quick');

  // Quick mode inputs
  const [knownDistance, setKnownDistance] = useState('10');
  const [knownTime, setKnownTime] = useState({ hours: '0', minutes: '50', seconds: '0' });
  const [targetDistance, setTargetDistance] = useState('42.195');
  const [experience, setExperience] = useState('1.06');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  // Advanced mode inputs
  const [race1Distance, setRace1Distance] = useState('10');
  const [race1Time, setRace1Time] = useState({ hours: '0', minutes: '50', seconds: '0' });
  const [race2Distance, setRace2Distance] = useState('21.0975');
  const [race2Time, setRace2Time] = useState({ hours: '1', minutes: '50', seconds: '0' });
  const [age, setAge] = useState('35');
  const [weight, setWeight] = useState('70');
  const [height, setHeight] = useState('175');

  const [results, setResults] = useState<
    {
      distance: string;
      km: number;
      time: string;
      pace: string;
      confidence: number;
      isUltra: boolean;
    }[]
  >([]);

  const calculateQuick = () => {
    const distance = parseFloat(knownDistance);
    const totalSeconds = getTimeInSeconds(
      parseInt(knownTime.hours) || 0,
      parseInt(knownTime.minutes) || 0,
      parseInt(knownTime.seconds) || 0
    );
    const target = parseFloat(targetDistance);
    let fatigueFactor = parseFloat(experience);

    if (!distance || !totalSeconds || !target) return;

    // Gender adjustments for ultra distances
    if (gender === 'female' && target > 80) {
      fatigueFactor *= 0.97;
    }
    if (gender === 'female' && target > 150) {
      fatigueFactor *= 0.95;
    }

    // Ultra distance adjustment
    if (target > 42.195) {
      const distanceRatio = target / distance;
      if (distanceRatio > 4) {
        fatigueFactor += 0.2;
      } else if (distanceRatio > 2) {
        fatigueFactor += 0.1;
      }
    }

    const predictedSeconds = totalSeconds * Math.pow(target / distance, fatigueFactor);
    const pacePerKm = predictedSeconds / target;

    // Get target distance name
    const targetName =
      standardDistances.find((d) => Math.abs(d.km - target) < 0.1)?.label || `${target}km`;

    setResults([
      {
        distance: targetName,
        km: target,
        time: formatTimeFromSeconds(predictedSeconds),
        pace: `${Math.floor(pacePerKm / 60)}:${Math.floor(pacePerKm % 60)
          .toString()
          .padStart(2, '0')}/km`,
        confidence: 85,
        isUltra: target > 42.195,
      },
    ]);
  };

  const calculateAdvanced = () => {
    const r1Distance = parseFloat(race1Distance);
    const r1TimeSeconds = getTimeInSeconds(
      parseInt(race1Time.hours) || 0,
      parseInt(race1Time.minutes) || 0,
      parseInt(race1Time.seconds) || 0
    );
    const r2Distance = parseFloat(race2Distance);
    const r2TimeSeconds = getTimeInSeconds(
      parseInt(race2Time.hours) || 0,
      parseInt(race2Time.minutes) || 0,
      parseInt(race2Time.seconds) || 0
    );
    const ageNum = parseInt(age);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (
      !r1Distance ||
      !r1TimeSeconds ||
      !r2Distance ||
      !r2TimeSeconds ||
      !ageNum ||
      !weightNum ||
      !heightNum
    )
      return;

    if (r1Distance >= r2Distance) {
      alert('Race #1 should be shorter than Race #2');
      return;
    }

    // Calculate personal exponent
    const personalExponent = Math.log(r2TimeSeconds / r1TimeSeconds) / Math.log(r2Distance / r1Distance);

    // BMI calculation
    const heightM = heightNum / 100;
    const bmi = weightNum / (heightM * heightM);

    // Age adjustment
    let ageAdjustment = 1.0;
    if (ageNum > 35) {
      ageAdjustment = 1.0 + (ageNum - 35) * 0.002;
      if (gender === 'female' && ageNum > 40) {
        ageAdjustment *= 0.98;
      }
    } else if (ageNum < 25) {
      ageAdjustment = 1.0 + (25 - ageNum) * 0.001;
    }

    // BMI adjustment
    const optimalBMI = gender === 'female' ? 21 : 20;
    let bmiAdjustment = 1.0;
    if (bmi < 18) {
      bmiAdjustment = 1.02;
    } else if (bmi > 25) {
      bmiAdjustment = 1.0 + (bmi - 25) * 0.01;
    } else if (bmi > optimalBMI + 1 && bmi <= 25) {
      bmiAdjustment = 1.0 + (bmi - optimalBMI - 1) * 0.005;
    }

    const distances = [
      { name: '5K', km: 5, isUltra: false },
      { name: '10K', km: 10, isUltra: false },
      { name: 'Half Marathon', km: 21.0975, isUltra: false },
      { name: 'Marathon', km: 42.195, isUltra: false },
      { name: '50K', km: 50, isUltra: true },
      { name: '50 Miles', km: 80.4672, isUltra: true },
      { name: '100K', km: 100, isUltra: true },
      { name: '100 Miles', km: 160.934, isUltra: true },
    ];

    const predictions = distances.map((distance) => {
      let exponent = personalExponent;
      let baseDistance: number;
      let baseTime: number;

      // Choose which known race to base the prediction on
      if (distance.km < r1Distance) {
        baseDistance = r1Distance;
        baseTime = r1TimeSeconds;
      } else if (distance.km >= r1Distance && distance.km <= r2Distance) {
        const dist1Diff = Math.abs(distance.km - r1Distance);
        const dist2Diff = Math.abs(distance.km - r2Distance);
        if (dist1Diff < dist2Diff) {
          baseDistance = r1Distance;
          baseTime = r1TimeSeconds;
        } else {
          baseDistance = r2Distance;
          baseTime = r2TimeSeconds;
        }
      } else {
        baseDistance = r2Distance;
        baseTime = r2TimeSeconds;
      }

      if (distance.isUltra) {
        const ultraMultiplier = Math.pow(distance.km / 42.195, 0.15);
        exponent = exponent * (1 + ultraMultiplier * 0.08);

        if (distance.km > 80) {
          exponent *= 1.05;
          if (gender === 'female') exponent *= 0.97;
        }
        if (distance.km > 150) {
          exponent *= 1.08;
          if (gender === 'female') exponent *= 0.95;
        }
      }

      exponent *= ageAdjustment;
      exponent *= bmiAdjustment;

      let predictedSeconds = baseTime * Math.pow(distance.km / baseDistance, exponent);

      // Confidence calculation
      const distanceRatio = Math.abs(Math.log(distance.km / baseDistance));
      const confidence = Math.max(50, 100 - distanceRatio * 30);

      const pacePerKm = predictedSeconds / distance.km;

      return {
        distance: distance.name,
        km: distance.km,
        time: formatTimeFromSeconds(predictedSeconds),
        pace: `${Math.floor(pacePerKm / 60)}:${Math.floor(pacePerKm % 60)
          .toString()
          .padStart(2, '0')}/km`,
        confidence: Math.round(confidence),
        isUltra: distance.isUltra,
      };
    });

    setResults(predictions);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 lg:p-8">
      <h3 className="font-display text-xl font-bold text-white mb-4">
        Race Time Predictor
      </h3>

      <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-orange-800 dark:text-orange-300">
          Predict your race times using the Riegel formula with personal calibration. Use{' '}
          <strong>Quick Mode</strong> for basic predictions or <strong>Advanced Mode</strong> for
          personalized results using two race times.
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 p-1 bg-zinc-800 rounded-xl mb-6">
        <button
          onClick={() => {
            setMode('quick');
            setResults([]);
          }}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            mode === 'quick'
              ? 'bg-orange-500 text-white'
              : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Quick Mode
        </button>
        <button
          onClick={() => {
            setMode('advanced');
            setResults([]);
          }}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            mode === 'advanced'
              ? 'bg-orange-500 text-white'
              : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Advanced Mode
        </button>
      </div>

      <div className="space-y-6">
        {mode === 'quick' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Known Race Distance (km)
              </label>
              <select
                value={knownDistance}
                onChange={(e) => setKnownDistance(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
              >
                {standardDistances.slice(0, 4).map((d) => (
                  <option key={d.km} value={d.km}>
                    {d.label}
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
                    value={knownTime.hours}
                    onChange={(e) => setKnownTime({ ...knownTime, hours: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center focus:outline-none focus:border-orange-500"
                    min="0"
                  />
                  <span className="text-xs text-zinc-500 block text-center mt-1">hours</span>
                </div>
                <span className="text-2xl text-zinc-400 self-start mt-3">:</span>
                <div className="flex-1">
                  <input
                    type="number"
                    value={knownTime.minutes}
                    onChange={(e) => setKnownTime({ ...knownTime, minutes: e.target.value })}
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
                    value={knownTime.seconds}
                    onChange={(e) => setKnownTime({ ...knownTime, seconds: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center focus:outline-none focus:border-orange-500"
                    min="0"
                    max="59"
                  />
                  <span className="text-xs text-zinc-500 block text-center mt-1">sec</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Target Distance
              </label>
              <select
                value={targetDistance}
                onChange={(e) => setTargetDistance(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
              >
                {standardDistances.map((d) => (
                  <option key={d.km} value={d.km}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Experience Level
              </label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
              >
                <option value="1.04">Elite (1.04)</option>
                <option value="1.06">Experienced (1.06)</option>
                <option value="1.08">Intermediate (1.08)</option>
                <option value="1.10">Novice (1.10)</option>
              </select>
              <p className="text-xs text-zinc-500 mt-1">
                Lower factor = less slowdown at longer distances
              </p>
            </div>

            <button
              onClick={calculateQuick}
              className="w-full py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
            >
              Predict Race Time
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Race 1 */}
            <div className="p-4 bg-zinc-800 rounded-xl">
              <h4 className="font-medium text-white mb-3">
                Race #1 (Shorter Distance)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Distance</label>
                  <select
                    value={race1Distance}
                    onChange={(e) => setRace1Distance(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                  >
                    {standardDistances.slice(0, 4).map((d) => (
                      <option key={d.km} value={d.km}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Time</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={race1Time.hours}
                      onChange={(e) => setRace1Time({ ...race1Time, hours: e.target.value })}
                      className="w-12 px-2 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm text-center focus:outline-none focus:border-orange-500"
                      placeholder="H"
                    />
                    <span className="text-zinc-400 self-center">:</span>
                    <input
                      type="number"
                      value={race1Time.minutes}
                      onChange={(e) => setRace1Time({ ...race1Time, minutes: e.target.value })}
                      className="w-12 px-2 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm text-center focus:outline-none focus:border-orange-500"
                      placeholder="M"
                    />
                    <span className="text-zinc-400 self-center">:</span>
                    <input
                      type="number"
                      value={race1Time.seconds}
                      onChange={(e) => setRace1Time({ ...race1Time, seconds: e.target.value })}
                      className="w-12 px-2 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm text-center focus:outline-none focus:border-orange-500"
                      placeholder="S"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Race 2 */}
            <div className="p-4 bg-zinc-800 rounded-xl">
              <h4 className="font-medium text-white mb-3">
                Race #2 (Longer Distance)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Distance</label>
                  <select
                    value={race2Distance}
                    onChange={(e) => setRace2Distance(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                  >
                    {standardDistances.map((d) => (
                      <option key={d.km} value={d.km}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Time</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={race2Time.hours}
                      onChange={(e) => setRace2Time({ ...race2Time, hours: e.target.value })}
                      className="w-12 px-2 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm text-center focus:outline-none focus:border-orange-500"
                      placeholder="H"
                    />
                    <span className="text-zinc-400 self-center">:</span>
                    <input
                      type="number"
                      value={race2Time.minutes}
                      onChange={(e) => setRace2Time({ ...race2Time, minutes: e.target.value })}
                      className="w-12 px-2 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm text-center focus:outline-none focus:border-orange-500"
                      placeholder="M"
                    />
                    <span className="text-zinc-400 self-center">:</span>
                    <input
                      type="number"
                      value={race2Time.seconds}
                      onChange={(e) => setRace2Time({ ...race2Time, seconds: e.target.value })}
                      className="w-12 px-2 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm text-center focus:outline-none focus:border-orange-500"
                      placeholder="S"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={calculateAdvanced}
              className="w-full py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
            >
              Calculate All Predictions
            </button>
          </>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">Predicted Times</h4>
            <div className="grid gap-3">
              {results.map((result) => (
                <div
                  key={result.distance}
                  className={`p-4 rounded-xl border ${
                    result.isUltra
                      ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30'
                      : 'bg-zinc-800 border-zinc-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-white">
                        {result.distance}
                        {result.isUltra && (
                          <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                            Ultra
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-zinc-500">{result.km.toFixed(1)} km</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-mono font-bold text-orange-500">
                        {result.time}
                      </div>
                      <div className="text-sm text-zinc-500">{result.pace}</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                      <span>Confidence</span>
                      <span>{result.confidence}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
