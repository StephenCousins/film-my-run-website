import type { TimeFields } from './forms';

/**
 * Pace Calculator. Extracted unchanged from `PaceCalculator` in
 * `src/app/tools/calculators/page.tsx` (M1-W, 11 Sep 2026).
 */

export interface PaceInput {
  /** Distance in kilometres (miles already converted, ×1.60934). */
  distanceKm: number;
  totalSeconds: number;
}

export interface PacePrediction {
  name: string;
  km: number;
  seconds: number;
  /** h:mm:ss or m:ss, seconds floored. */
  time: string;
}

export interface PaceResult {
  paceSecondsPerKm: number;
  /** e.g. "4:59 /km" (seconds rounded). */
  pace: string;
  paceSecondsPerMile: number;
  speedKmh: number;
  /** e.g. "12.06 km/h (8:01 /mile)". */
  speed: string;
  predictions: PacePrediction[];
}

const PREDICTION_DISTANCES = [
  { name: '5K', km: 5 },
  { name: '10K', km: 10 },
  { name: 'Half Marathon', km: 21.0975 },
  { name: 'Marathon', km: 42.195 },
];

export function calculatePace(input: PaceInput): PaceResult | null {
  const dist = input.distanceKm;
  const totalSeconds = input.totalSeconds;
  if (!(dist && totalSeconds)) return null;

  const paceSecondsPerKm = totalSeconds / dist;
  const paceMinutes = Math.floor(paceSecondsPerKm / 60);
  const paceSeconds = Math.round(paceSecondsPerKm % 60);
  const pace = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /km`;

  const paceSecondsPerMile = paceSecondsPerKm * 1.60934;
  const paceMiMin = Math.floor(paceSecondsPerMile / 60);
  const paceMiSec = Math.round(paceSecondsPerMile % 60);

  const speedKmh = (dist / totalSeconds) * 3600;
  const speed = `${speedKmh.toFixed(2)} km/h (${paceMiMin}:${paceMiSec.toString().padStart(2, '0')} /mile)`;

  const predictions = PREDICTION_DISTANCES.map((d) => {
    const predictedSeconds = paceSecondsPerKm * d.km;
    const predHours = Math.floor(predictedSeconds / 3600);
    const predMinutes = Math.floor((predictedSeconds % 3600) / 60);
    const predSeconds = Math.floor(predictedSeconds % 60);
    return {
      name: d.name,
      km: d.km,
      seconds: predictedSeconds,
      time:
        predHours > 0
          ? `${predHours}:${predMinutes.toString().padStart(2, '0')}:${predSeconds.toString().padStart(2, '0')}`
          : `${predMinutes}:${predSeconds.toString().padStart(2, '0')}`,
    };
  });

  return { paceSecondsPerKm, pace, paceSecondsPerMile, speedKmh, speed, predictions };
}

export interface PaceForm {
  distance: string;
  distanceUnit: 'km' | 'miles';
  time: TimeFields;
}

/** The form's own parsing: `parseInt(field || '0')`, miles × 1.60934. */
export function paceInputFromForm(form: PaceForm): PaceInput {
  let dist = parseFloat(form.distance);
  if (form.distanceUnit === 'miles') {
    dist = dist * 1.60934;
  }
  const totalSeconds =
    parseInt(form.time.hours || '0') * 3600 +
    parseInt(form.time.minutes || '0') * 60 +
    parseInt(form.time.seconds || '0');
  return { distanceKm: dist, totalSeconds };
}
