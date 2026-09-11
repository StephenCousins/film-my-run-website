/**
 * Nutrition & Hydration. Extracted unchanged from `NutritionCalculator.tsx`
 * (M1-W, 11 Sep 2026).
 */

export interface NutritionInput {
  weightKg: number;
  distanceKm: number;
  /** Whole minutes of the pace field; the form rejects 0. */
  paceMinutes: number;
  paceSeconds: number;
  /** 1.0 road/flat, 1.1 rolling, 1.2 moderate mountains, 1.3 steep mountains. */
  terrainFactor: number;
  /** 0.9 cold, 1.0 moderate, 1.15 warm, 1.3 hot, 1.5 very hot. */
  temperatureFactor: number;
}

export interface NutritionResult {
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

export function planNutrition(input: NutritionInput): NutritionResult | null {
  const weightNum = input.weightKg;
  const distanceNum = input.distanceKm;
  const paceMinNum = input.paceMinutes;
  const paceSecNum = input.paceSeconds;
  const terrainFactor = input.terrainFactor;
  const tempFactor = input.temperatureFactor;

  if (!weightNum || !distanceNum || !paceMinNum) return null;

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

  return {
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
  };
}

export interface NutritionForm {
  weight: string;
  distance: string;
  paceMin: string;
  paceSec: string;
  terrain: string;
  temperature: string;
}

export function nutritionInputFromForm(form: NutritionForm): NutritionInput {
  return {
    weightKg: parseFloat(form.weight),
    distanceKm: parseFloat(form.distance),
    paceMinutes: parseInt(form.paceMin),
    paceSeconds: parseInt(form.paceSec) || 0,
    terrainFactor: parseFloat(form.terrain),
    temperatureFactor: parseFloat(form.temperature),
  };
}
