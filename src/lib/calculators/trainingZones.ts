/**
 * Training Zones. Extracted unchanged from `TrainingZonesCalculator.tsx`
 * (M1-W, 11 Sep 2026).
 */

export interface HRZone {
  name: string;
  minHR: number;
  maxHR: number;
  minPercent: number;
  maxPercent: number;
  purpose: string;
  trainingPercent: string;
}

export interface PaceZone {
  name: string;
  paceSecondsPerKm: number;
  /** e.g. "5:10/km" (seconds rounded). */
  pace: string;
  purpose: string;
}

export const HR_ZONE_DEFINITIONS = [
  {
    name: 'Zone 1 - Recovery',
    range: [0.5, 0.6],
    purpose: 'Active recovery, warm-up, cool-down',
    training: '0-10%',
  },
  {
    name: 'Zone 2 - Aerobic Base',
    range: [0.6, 0.7],
    purpose: 'Build aerobic base, fat burning, easy runs',
    training: '70-80%',
  },
  {
    name: 'Zone 3 - Tempo',
    range: [0.7, 0.8],
    purpose: 'Improve aerobic capacity, tempo runs',
    training: '10-15%',
  },
  {
    name: 'Zone 4 - Threshold',
    range: [0.8, 0.9],
    purpose: 'Lactate threshold, race pace for 10K-Half',
    training: '5-10%',
  },
  {
    name: 'Zone 5 - VO2 Max',
    range: [0.9, 1.0],
    purpose: 'Improve VO2 max, intervals, 5K race pace',
    training: '0-5%',
  },
] as const;

export const PACE_ZONE_DEFINITIONS = [
  { name: 'Zone 1 - Recovery', factor: 1.25, purpose: 'Active recovery runs' },
  { name: 'Zone 2 - Easy/Base', factor: 1.15, purpose: 'Build aerobic base (most training here!)' },
  { name: 'Zone 3 - Tempo', factor: 1.05, purpose: 'Aerobic capacity, tempo runs' },
  { name: 'Zone 4 - Threshold', factor: 1.0, purpose: 'Lactate threshold, 10K-Half race pace' },
  { name: 'Zone 5 - VO2 Max', factor: 0.9, purpose: '5K race pace, intervals' },
] as const;

export interface HRZonesInput {
  maxHR: number;
  restHR: number;
}

/** Heart-rate reserve (Karvonen) zones. Null when max < 100 or rest < 30. */
export function calculateHRZones(input: HRZonesInput): HRZone[] | null {
  const max = input.maxHR;
  const rest = input.restHR;

  if (!max || !rest || max < 100 || rest < 30) return null;

  const hrReserve = max - rest;

  return HR_ZONE_DEFINITIONS.map((zone) => ({
    name: zone.name,
    minHR: Math.round(rest + hrReserve * zone.range[0]),
    maxHR: Math.round(rest + hrReserve * zone.range[1]),
    minPercent: Math.round(zone.range[0] * 100),
    maxPercent: Math.round(zone.range[1] * 100),
    purpose: zone.purpose,
    trainingPercent: zone.training,
  }));
}

export interface PaceZonesInput {
  /** Threshold pace in seconds per km. */
  thresholdSecondsPerKm: number;
  /** The form's whole-minutes field; null when it is 0 or below 3. */
  thresholdMinutes: number;
}

/** Pace zones as multiples of threshold pace. Null when minutes < 3. */
export function calculatePaceZones(input: PaceZonesInput): PaceZone[] | null {
  const min = input.thresholdMinutes;
  if (!min || min < 3) return null;

  const thresholdPaceSeconds = input.thresholdSecondsPerKm;

  return PACE_ZONE_DEFINITIONS.map((zone) => {
    const zonePaceSeconds = thresholdPaceSeconds * zone.factor;
    const paceMin = Math.floor(zonePaceSeconds / 60);
    const paceSec = Math.round(zonePaceSeconds % 60);
    return {
      name: zone.name,
      paceSecondsPerKm: zonePaceSeconds,
      pace: `${paceMin}:${paceSec.toString().padStart(2, '0')}/km`,
      purpose: zone.purpose,
    };
  });
}

export function hrZonesInputFromForm(form: { maxHR: string; restHR: string }): HRZonesInput {
  return { maxHR: parseInt(form.maxHR), restHR: parseInt(form.restHR) };
}

export function paceZonesInputFromForm(form: {
  thresholdMin: string;
  thresholdSec: string;
}): PaceZonesInput {
  const min = parseInt(form.thresholdMin);
  const sec = parseInt(form.thresholdSec) || 0;
  return { thresholdMinutes: min, thresholdSecondsPerKm: min * 60 + sec };
}
