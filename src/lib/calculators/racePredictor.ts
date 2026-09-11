import { formatTimeFromSeconds, standardDistances } from './utils';
import { secondsFromFields, type TimeFields } from './forms';

/**
 * Race Time Predictor. Extracted unchanged from
 * `RaceTimePredictorCalculator.tsx` (M1-W, 11 Sep 2026).
 */

export type PredictorGender = 'male' | 'female';

export interface RacePrediction {
  distance: string;
  km: number;
  seconds: number;
  /** h:mm:ss or m:ss, seconds floored. */
  time: string;
  paceSecondsPerKm: number;
  /** e.g. "5:27/km" (seconds floored, unlike the Pace calculator). */
  pace: string;
  confidence: number;
  isUltra: boolean;
}

function paceLabel(pacePerKm: number): string {
  return `${Math.floor(pacePerKm / 60)}:${Math.floor(pacePerKm % 60)
    .toString()
    .padStart(2, '0')}/km`;
}

// ---- Quick mode ----

export interface QuickPredictionInput {
  knownDistanceKm: number;
  knownSeconds: number;
  targetDistanceKm: number;
  /** Experience level: Elite 1.04, Experienced 1.06, Intermediate 1.08, Novice 1.10. */
  fatigueFactor: number;
  gender: PredictorGender;
}

export function predictQuick(input: QuickPredictionInput): RacePrediction[] | null {
  const distance = input.knownDistanceKm;
  const totalSeconds = input.knownSeconds;
  const target = input.targetDistanceKm;
  let fatigueFactor = input.fatigueFactor;

  if (!distance || !totalSeconds || !target) return null;

  // Gender adjustments for ultra distances
  if (input.gender === 'female' && target > 80) {
    fatigueFactor *= 0.97;
  }
  if (input.gender === 'female' && target > 150) {
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

  const targetName =
    standardDistances.find((d) => Math.abs(d.km - target) < 0.1)?.label || `${target}km`;

  return [
    {
      distance: targetName,
      km: target,
      seconds: predictedSeconds,
      time: formatTimeFromSeconds(predictedSeconds),
      paceSecondsPerKm: pacePerKm,
      pace: paceLabel(pacePerKm),
      confidence: 85,
      isUltra: target > 42.195,
    },
  ];
}

export interface QuickPredictionForm {
  knownDistance: string;
  knownTime: TimeFields;
  targetDistance: string;
  experience: string;
  gender: PredictorGender;
}

export function quickInputFromForm(form: QuickPredictionForm): QuickPredictionInput {
  return {
    knownDistanceKm: parseFloat(form.knownDistance),
    knownSeconds: secondsFromFields(form.knownTime),
    targetDistanceKm: parseFloat(form.targetDistance),
    fatigueFactor: parseFloat(form.experience),
    gender: form.gender,
  };
}

// ---- Advanced mode ----

export interface AdvancedPredictionInput {
  race1DistanceKm: number;
  race1Seconds: number;
  race2DistanceKm: number;
  race2Seconds: number;
  age: number;
  weightKg: number;
  heightCm: number;
  gender: PredictorGender;
}

export const ADVANCED_DISTANCES = [
  { name: '5K', km: 5, isUltra: false },
  { name: '10K', km: 10, isUltra: false },
  { name: 'Half Marathon', km: 21.0975, isUltra: false },
  { name: 'Marathon', km: 42.195, isUltra: false },
  { name: '50K', km: 50, isUltra: true },
  { name: '50 Miles', km: 80.4672, isUltra: true },
  { name: '100K', km: 100, isUltra: true },
  { name: '100 Miles', km: 160.934, isUltra: true },
];

/** True when the inputs are complete enough to predict from. */
export function advancedInputIsComplete(i: AdvancedPredictionInput): boolean {
  return !(
    !i.race1DistanceKm ||
    !i.race1Seconds ||
    !i.race2DistanceKm ||
    !i.race2Seconds ||
    !i.age ||
    !i.weightKg ||
    !i.heightCm
  );
}

/** Race #1 must be shorter than Race #2; the form shows an alert otherwise. */
export function advancedRaceOrderIsValid(i: AdvancedPredictionInput): boolean {
  return i.race1DistanceKm < i.race2DistanceKm;
}

/**
 * Returns null when inputs are incomplete or Race #1 is not shorter than
 * Race #2. Callers wanting the alert check `advancedRaceOrderIsValid` first.
 */
export function predictAdvanced(input: AdvancedPredictionInput): RacePrediction[] | null {
  if (!advancedInputIsComplete(input) || !advancedRaceOrderIsValid(input)) return null;

  const r1Distance = input.race1DistanceKm;
  const r1TimeSeconds = input.race1Seconds;
  const r2Distance = input.race2DistanceKm;
  const r2TimeSeconds = input.race2Seconds;
  const ageNum = input.age;
  const weightNum = input.weightKg;
  const heightNum = input.heightCm;
  const gender = input.gender;

  // Calculate personal exponent
  const personalExponent =
    Math.log(r2TimeSeconds / r1TimeSeconds) / Math.log(r2Distance / r1Distance);

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

  return ADVANCED_DISTANCES.map((distance) => {
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

    const predictedSeconds = baseTime * Math.pow(distance.km / baseDistance, exponent);

    // Confidence calculation
    const distanceRatio = Math.abs(Math.log(distance.km / baseDistance));
    const confidence = Math.max(50, 100 - distanceRatio * 30);

    const pacePerKm = predictedSeconds / distance.km;

    return {
      distance: distance.name,
      km: distance.km,
      seconds: predictedSeconds,
      time: formatTimeFromSeconds(predictedSeconds),
      paceSecondsPerKm: pacePerKm,
      pace: paceLabel(pacePerKm),
      confidence: Math.round(confidence),
      isUltra: distance.isUltra,
    };
  });
}

export interface AdvancedPredictionForm {
  race1Distance: string;
  race1Time: TimeFields;
  race2Distance: string;
  race2Time: TimeFields;
  age: string;
  weight: string;
  height: string;
  gender: PredictorGender;
}

export function advancedInputFromForm(form: AdvancedPredictionForm): AdvancedPredictionInput {
  return {
    race1DistanceKm: parseFloat(form.race1Distance),
    race1Seconds: secondsFromFields(form.race1Time),
    race2DistanceKm: parseFloat(form.race2Distance),
    race2Seconds: secondsFromFields(form.race2Time),
    age: parseInt(form.age),
    weightKg: parseFloat(form.weight),
    heightCm: parseFloat(form.height),
    gender: form.gender,
  };
}
