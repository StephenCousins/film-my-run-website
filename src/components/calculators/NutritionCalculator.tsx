'use client';

import { useState } from 'react';

interface NutritionResult {
  totalTimeHours: number;
  speedKmh: number;
  caloriesPerHour: number;
  totalCalories: number;
  carbsPerHour: number;
  totalCarbs: number;
  hydrationPerHour: number;
  totalHydration: number;
  sodiumPerHour: number;
  totalSodium: number;
  gelsPerHour: number;
}

export function NutritionCalculator() {
  const [weight, setWeight] = useState('70');
  const [distance, setDistance] = useState('42.195');
  const [paceMin, setPaceMin] = useState('5');
  const [paceSec, setPaceSec] = useState('30');
  const [terrain, setTerrain] = useState('1.0');
  const [temperature, setTemperature] = useState('1.0');

  const [result, setResult] = useState<NutritionResult | null>(null);

  const calculateNutrition = () => {
    const weightNum = parseFloat(weight);
    const distanceNum = parseFloat(distance);
    const paceMinNum = parseInt(paceMin);
    const paceSecNum = parseInt(paceSec) || 0;
    const terrainFactor = parseFloat(terrain);
    const tempFactor = parseFloat(temperature);

    if (!weightNum || !distanceNum || !paceMinNum) return;

    const paceMinPerKm = paceMinNum + paceSecNum / 60;
    const totalTimeHours = (distanceNum * paceMinPerKm) / 60;
    const speedKmh = 60 / paceMinPerKm;

    // Calorie calculation: approximately 1 kcal per kg per km, adjusted for speed and terrain
    const baseCaloriesPerHour = weightNum * speedKmh;
    const adjustedCaloriesPerHour = baseCaloriesPerHour * terrainFactor * tempFactor;
    const totalCalories = adjustedCaloriesPerHour * totalTimeHours;

    // Carb needs (60-90g per hour for events > 2.5 hours)
    const carbsPerHour = totalTimeHours > 2.5 ? 70 : 50;
    const totalCarbs = carbsPerHour * totalTimeHours;

    // Hydration (500-800ml per hour, adjusted for temperature)
    const baseHydrationPerHour = 600;
    const hydrationPerHour = Math.round(baseHydrationPerHour * tempFactor);
    const totalHydration = hydrationPerHour * totalTimeHours;

    // Sodium (300-700mg per hour for long events)
    const sodiumPerHour = 500;
    const totalSodium = sodiumPerHour * totalTimeHours;

    // Gels calculation (assuming 25g carbs per gel)
    const gelsPerHour = carbsPerHour / 25;

    setResult({
      totalTimeHours,
      speedKmh,
      caloriesPerHour: Math.round(adjustedCaloriesPerHour),
      totalCalories: Math.round(totalCalories),
      carbsPerHour,
      totalCarbs: Math.round(totalCarbs),
      hydrationPerHour,
      totalHydration: Math.round(totalHydration),
      sodiumPerHour,
      totalSodium: Math.round(totalSodium),
      gelsPerHour: Math.round(gelsPerHour * 10) / 10,
    });
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 lg:p-8">
      <h3 className="font-display text-xl font-bold text-white mb-4">
        Nutrition & Hydration Calculator
      </h3>

      <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-orange-800 dark:text-orange-300">
          <strong>Fuel your performance:</strong> Proper nutrition is critical for long runs.
          Running out of energy (&quot;bonking&quot;) is the #1 reason people DNF. This calculator shows
          exactly how many calories and how much hydration you need.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Body Weight (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
              placeholder="70"
              min="40"
              max="150"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Distance (km)
            </label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
              placeholder="42.195"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {['21.0975', '42.195', '50', '80.4672', '100', '160.934'].map((d) => (
            <button
              key={d}
              onClick={() => setDistance(d)}
              className="px-3 py-1 text-xs bg-zinc-800 rounded-full hover:bg-orange-500/10 hover:text-orange-500 transition-colors"
            >
              {d === '21.0975'
                ? 'Half'
                : d === '42.195'
                  ? 'Marathon'
                  : d === '80.4672'
                    ? '50M'
                    : d === '160.934'
                      ? '100M'
                      : `${d}K`}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Estimated Pace (min/km)
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                value={paceMin}
                onChange={(e) => setPaceMin(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center focus:outline-none focus:border-orange-500"
                min="4"
                max="12"
              />
              <span className="text-xs text-zinc-500 block text-center mt-1">min</span>
            </div>
            <span className="text-2xl text-zinc-400 self-start mt-3">:</span>
            <div className="flex-1">
              <input
                type="number"
                value={paceSec}
                onChange={(e) => setPaceSec(e.target.value)}
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
              Terrain Type
            </label>
            <select
              value={terrain}
              onChange={(e) => setTerrain(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
            >
              <option value="1.0">Road / Flat trail</option>
              <option value="1.1">Rolling hills</option>
              <option value="1.2">Moderate mountains</option>
              <option value="1.3">Steep mountains</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Temperature
            </label>
            <select
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
            >
              <option value="0.9">Cold (&lt; 10°C)</option>
              <option value="1.0">Moderate (10-20°C)</option>
              <option value="1.15">Warm (20-25°C)</option>
              <option value="1.3">Hot (25-30°C)</option>
              <option value="1.5">Very Hot (&gt; 30°C)</option>
            </select>
          </div>
        </div>

        <button
          onClick={calculateNutrition}
          className="w-full py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
        >
          Calculate Nutrition Needs
        </button>

        {result && (
          <div className="space-y-4">
            {/* Race overview */}
            <div className="p-4 bg-zinc-800 rounded-xl">
              <h4 className="font-medium text-white mb-3">Race Overview</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold text-orange-500">
                    {result.totalTimeHours.toFixed(1)}h
                  </div>
                  <div className="text-xs text-zinc-500">Estimated Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold text-white">
                    {result.speedKmh.toFixed(1)} km/h
                  </div>
                  <div className="text-xs text-zinc-500">Average Speed</div>
                </div>
              </div>
            </div>

            {/* Nutrition table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-orange-500 text-white">
                    <th className="px-4 py-2 text-left rounded-tl-lg">Metric</th>
                    <th className="px-4 py-2 text-right">Per Hour</th>
                    <th className="px-4 py-2 text-right rounded-tr-lg">Total Race</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-700 bg-zinc-900">
                    <td className="px-4 py-3 font-medium text-white">
                      Calories
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300 font-mono">
                      {result.caloriesPerHour} kcal
                    </td>
                    <td className="px-4 py-3 text-right text-orange-500 font-mono font-semibold">
                      {result.totalCalories} kcal
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-700 bg-zinc-900">
                    <td className="px-4 py-3 font-medium text-white">
                      Carbohydrates
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300 font-mono">
                      {result.carbsPerHour}g
                    </td>
                    <td className="px-4 py-3 text-right text-orange-500 font-mono font-semibold">
                      {result.totalCarbs}g
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-700 bg-zinc-900">
                    <td className="px-4 py-3 font-medium text-white">
                      Hydration
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300 font-mono">
                      {result.hydrationPerHour}ml
                    </td>
                    <td className="px-4 py-3 text-right text-orange-500 font-mono font-semibold">
                      {(result.totalHydration / 1000).toFixed(1)}L
                    </td>
                  </tr>
                  <tr className="bg-zinc-900">
                    <td className="px-4 py-3 font-medium text-white">Sodium</td>
                    <td className="px-4 py-3 text-right text-zinc-300 font-mono">
                      {result.sodiumPerHour}mg
                    </td>
                    <td className="px-4 py-3 text-right text-orange-500 font-mono font-semibold">
                      {result.totalSodium}mg
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Practical strategy */}
            <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl">
              <h4 className="font-medium text-orange-900 dark:text-orange-300 mb-2">
                Practical Aid Station Strategy
              </h4>
              <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
                <strong>Every hour, aim to consume:</strong>
              </p>
              <ul className="text-sm text-orange-800 dark:text-orange-300 space-y-1 mb-3">
                <li>
                  <strong>{result.gelsPerHour} energy gels</strong> (25g carbs each) OR
                </li>
                <li>Mix of: 1-2 gels + sports drink + real food (banana, pretzels)</li>
                <li>
                  <strong>{Math.round(result.hydrationPerHour / 500)} bottles</strong> of water/sports
                  drink (500ml each)
                </li>
                <li>Electrolyte tablets or salt capsules for sodium</li>
              </ul>

              <h5 className="font-medium text-orange-900 dark:text-orange-300 mb-1">Pro Tips:</h5>
              <ul className="text-sm text-orange-800 dark:text-orange-300 space-y-1">
                <li>
                  <strong>Start early:</strong> Begin fueling at 30-45 minutes, not when you feel
                  hungry
                </li>
                <li>
                  <strong>Practice:</strong> Train your gut in training - never try new foods on race
                  day
                </li>
                <li>
                  <strong>Real food:</strong> After 4+ hours, real food often sits better than gels
                </li>
                <li>
                  <strong>Caffeinated gels:</strong> Save for the last 1/3 of the race
                </li>
              </ul>
            </div>

            {/* Ultra warning */}
            {result.totalTimeHours > 6 && (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                <h4 className="font-medium text-red-900 dark:text-red-300 mb-2">
                  Ultra Distance Alert ({result.totalTimeHours.toFixed(1)} hours)
                </h4>
                <p className="text-sm text-red-800 dark:text-red-300">
                  For races over 6 hours, your gut may struggle. Consider:
                </p>
                <ul className="text-sm text-red-800 dark:text-red-300 space-y-1 mt-2">
                  <li>Mix liquid and solid calories (don&apos;t rely on gels alone)</li>
                  <li>Use real food: boiled potatoes with salt, rice balls, soup</li>
                  <li>Take walk breaks at aid stations to aid digestion</li>
                  <li>Have a crew prepare foods you&apos;re craving</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
