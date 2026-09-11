import { formatTimeFromSeconds } from './utils';
import { secondsFromFields, type TimeFields } from './forms';

/**
 * Elevation Adjustment. Extracted unchanged from `ElevationCalculator.tsx`
 * (M1-W, 11 Sep 2026).
 */

export interface ElevationInput {
  distanceKm: number;
  flatTimeSeconds: number;
  elevationGainM: number;
  elevationLossM: number;
  /** 1.0 smooth trail / fire road, 1.1 moderate, 1.2 technical, 1.3 very technical. */
  terrainFactor: number;
}

export interface ElevationResult {
  originalTime: string;
  adjustedSeconds: number;
  adjustedTime: string;
  /** Whole minutes. */
  timeDifference: number;
  equivalentFlatDistance: number;
  /** Whole minutes. */
  gainPenalty: number;
  /** Whole minutes. */
  lossBenefit: number;
  /** Whole minutes. */
  terrainPenalty: number;
}

export function adjustForElevation(input: ElevationInput): ElevationResult | null {
  const dist = input.distanceKm;
  const flatTimeSeconds = input.flatTimeSeconds;
  const gain = input.elevationGainM;
  const loss = input.elevationLossM;
  const terrainFactor = input.terrainFactor;

  if (!dist || !flatTimeSeconds) return null;

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

  return {
    originalTime: formatTimeFromSeconds(flatTimeSeconds),
    adjustedSeconds: adjustedTimeSeconds,
    adjustedTime: formatTimeFromSeconds(adjustedTimeSeconds),
    timeDifference: Math.round(timeDifference / 60),
    equivalentFlatDistance,
    gainPenalty: Math.round(gainPenalty / 60),
    lossBenefit: Math.round(lossBenefit / 60),
    terrainPenalty: Math.round(terrainPenalty / 60),
  };
}

export interface ElevationForm {
  distance: string;
  time: TimeFields;
  elevGain: string;
  elevLoss: string;
  terrain: string;
}

export function elevationInputFromForm(form: ElevationForm): ElevationInput {
  return {
    distanceKm: parseFloat(form.distance),
    flatTimeSeconds: secondsFromFields(form.time),
    elevationGainM: parseFloat(form.elevGain) || 0,
    elevationLossM: parseFloat(form.elevLoss) || 0,
    terrainFactor: parseFloat(form.terrain),
  };
}
