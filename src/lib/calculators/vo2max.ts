import { getVO2Classification } from './utils';
import { secondsFromFields, type TimeFields } from './forms';

/**
 * VO2 Max Estimator. Extracted unchanged from `VO2MaxCalculator.tsx`
 * (M1-W, 11 Sep 2026).
 */

export type VO2TestType = 'vdot' | 'cooper' | 'custom';
export type VO2Gender = 'male' | 'female';

export type VO2MaxInput =
  | { testType: 'vdot'; distanceMeters: number; totalSeconds: number }
  | { testType: 'cooper'; distanceMeters: number }
  | {
      testType: 'custom';
      gender: VO2Gender;
      age: number;
      /** 5 km time. */
      totalSeconds: number;
      maxHR: number;
      restHR: number;
    };

export interface VO2MaxResult {
  vo2max: number;
  classification: string;
  hrReserve?: number;
}

export function estimateVO2Max(input: VO2MaxInput): VO2MaxResult | null {
  let vo2max = 0;
  let hrReserve: number | undefined;

  if (input.testType === 'vdot') {
    const { distanceMeters: distance, totalSeconds } = input;
    if (!distance || !totalSeconds) return null;

    const totalTimeMinutes = totalSeconds / 60;
    const speed = distance / totalTimeMinutes;
    vo2max = 0.2 * speed + 3.5;
  } else if (input.testType === 'cooper') {
    const distance = input.distanceMeters;
    if (!distance) return null;
    vo2max = (distance - 504.9) / 44.73;
  } else {
    const { age, maxHR, restHR, totalSeconds } = input;
    if (!age || !maxHR || !restHR || !totalSeconds) return null;

    const totalTimeMinutes = totalSeconds / 60;
    const distance = 5000;
    const speed = distance / totalTimeMinutes;
    const vo2maxTime = 0.2 * speed + 3.5;
    const vo2maxHR = 15 * (maxHR / restHR);
    vo2max = (vo2maxTime + vo2maxHR) / 2;

    if (input.gender === 'female') {
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

  return {
    vo2max,
    classification: getVO2Classification(vo2max),
    hrReserve,
  };
}

export interface VO2MaxForm {
  testType: VO2TestType;
  vdotDistance: string;
  vdotTime: TimeFields;
  cooperDistance: string;
  customGender: VO2Gender;
  customAge: string;
  customTime: TimeFields;
  customMaxHR: string;
  customRestHR: string;
}

export function vo2MaxInputFromForm(form: VO2MaxForm): VO2MaxInput {
  switch (form.testType) {
    case 'vdot':
      return {
        testType: 'vdot',
        distanceMeters: parseFloat(form.vdotDistance),
        totalSeconds: secondsFromFields(form.vdotTime),
      };
    case 'cooper':
      return { testType: 'cooper', distanceMeters: parseFloat(form.cooperDistance) };
    case 'custom':
      return {
        testType: 'custom',
        gender: form.customGender,
        age: parseInt(form.customAge),
        totalSeconds: secondsFromFields(form.customTime),
        maxHR: parseFloat(form.customMaxHR),
        restHR: parseFloat(form.customRestHR),
      };
  }
}
