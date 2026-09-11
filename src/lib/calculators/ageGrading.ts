import { formatTimeFromSeconds, getAgeGradingClassification } from './utils';

/**
 * Age Grading maths. Extracted unchanged from `AgeGradingCalculator.tsx`
 * (M1-W, 11 Sep 2026). The WMA factor and open record come from
 * `/api/age-grading` (Postgres `age_grading_factors`); this is the part that
 * runs after the fetch.
 */

export interface AgeGradingInput {
  totalSeconds: number;
  /** WMA factor for the athlete's sex, event and age (≤ 1). */
  factor: number;
  /** Open-class standard for the event, in seconds. */
  openRecord: number;
}

export interface AgeGradingResult {
  actualTime: string;
  ageGradedSeconds: number;
  ageGradedTime: string;
  ageGradedPercentage: number;
  classification: string;
  factor: number;
  openRecord: number;
}

export const WMA_MIN_AGE = 30;
export const WMA_MAX_AGE = 110;

export function gradeAge(input: AgeGradingInput): AgeGradingResult {
  const { totalSeconds, factor, openRecord } = input;

  // Calculate age-graded performance
  const ageGradedSeconds = totalSeconds * factor;
  const ageGradedPercentage = (openRecord / ageGradedSeconds) * 100;

  return {
    actualTime: formatTimeFromSeconds(totalSeconds),
    ageGradedSeconds,
    ageGradedTime: formatTimeFromSeconds(ageGradedSeconds),
    ageGradedPercentage,
    classification: getAgeGradingClassification(ageGradedPercentage),
    factor,
    openRecord,
  };
}
