// Elevation, smoothing, and data cleaning utilities

import { Coordinate, haversineDistance, GPS_VALIDATION } from './gps';

export interface ElevationStats {
  gain: number;
  loss: number;
  min: number;
  max: number;
}

/**
 * Calculate elevation statistics
 */
export function calculateElevationStats(elevations: (number | null)[]): ElevationStats {
  if (!elevations || elevations.length === 0) {
    return { gain: 0, loss: 0, min: 0, max: 0 };
  }

  const validElevations = elevations.filter(
    (e): e is number => e !== null && !isNaN(e)
  );
  if (validElevations.length === 0) {
    return { gain: 0, loss: 0, min: 0, max: 0 };
  }

  let gain = 0;
  let loss = 0;
  let min = validElevations[0];
  let max = validElevations[0];

  for (let i = 1; i < validElevations.length; i++) {
    const diff = validElevations[i] - validElevations[i - 1];
    if (diff > 0) gain += diff;
    else loss += Math.abs(diff);
    if (validElevations[i] < min) min = validElevations[i];
    if (validElevations[i] > max) max = validElevations[i];
  }

  return { gain, loss, min, max };
}

/**
 * Calculate median of an array
 */
export function median(arr: number[]): number | null {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculate Median Absolute Deviation (MAD)
 */
export function calculateMAD(arr: number[]): { median: number | null; mad: number | null } {
  if (!arr || arr.length === 0) return { median: null, mad: null };
  const med = median(arr);
  if (med === null) return { median: null, mad: null };
  const deviations = arr.map((val) => Math.abs(val - med));
  const mad = median(deviations);
  return { median: med, mad };
}

/**
 * Smooth data using moving average
 */
export function smoothData<T extends number | null>(data: T[], windowSize = 20): T[] {
  if (data.length < windowSize) return data;
  const smoothed: T[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, i + Math.floor(windowSize / 2) + 1);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      if (data[j] !== null && data[j] !== undefined) {
        sum += data[j] as number;
        count++;
      }
    }
    smoothed.push((count > 0 ? sum / count : data[i]) as T);
  }
  return smoothed;
}

/**
 * Rolling median filter
 */
export function rollingMedian(data: (number | null)[], windowSize = 5): (number | null)[] {
  if (!data || data.length < windowSize) return data;

  const result: (number | null)[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(data.length, i + halfWindow + 1);
    const window = data
      .slice(start, end)
      .filter((v): v is number => v !== null && !isNaN(v));

    if (window.length > 0) {
      result.push(median(window));
    } else {
      result.push(data[i]);
    }
  }

  return result;
}

/**
 * Decimate data to reduce points
 */
export function decimateData<T>(
  data: T[],
  distances: number[],
  factor = 20
): { data: T[]; distances: number[] } {
  if (data.length <= factor * 2) return { data, distances };
  const decimatedData: T[] = [data[0]];
  const decimatedDistances: number[] = [distances[0]];
  for (let i = factor; i < data.length - 1; i += factor) {
    decimatedData.push(data[i]);
    decimatedDistances.push(distances[i]);
  }
  decimatedData.push(data[data.length - 1]);
  decimatedDistances.push(distances[distances.length - 1]);
  return { data: decimatedData, distances: decimatedDistances };
}

/**
 * Get adaptive smoothing parameters based on route distance
 */
export function getAdaptiveSmoothingParams(totalDistanceKm: number): {
  windowSize: number;
  decimationFactor: number;
} {
  if (totalDistanceKm < 10) return { windowSize: 50, decimationFactor: 5 };
  if (totalDistanceKm < 25) return { windowSize: 100, decimationFactor: 10 };
  if (totalDistanceKm < 50) return { windowSize: 200, decimationFactor: 15 };
  if (totalDistanceKm < 100) return { windowSize: 300, decimationFactor: 25 };
  return { windowSize: 500, decimationFactor: 50 };
}

/**
 * Filter outliers using IQR method
 */
export function filterOutliersIQR(data: number[], multiplier = 1.5): number[] {
  if (!data || data.length < 4) return data;

  const sorted = [...data].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;

  return data.filter((val) => val >= lowerBound && val <= upperBound);
}

/**
 * Filter outliers using MAD method
 */
export function filterOutliersMAD(data: number[], threshold = 3): number[] {
  if (!data || data.length < 4) return data;

  const { median: med, mad } = calculateMAD(data);
  if (mad === null || mad === 0 || med === null) return data;

  return data.filter((val) => {
    const modifiedZScore = (0.6745 * Math.abs(val - med)) / mad;
    return modifiedZScore <= threshold;
  });
}

/**
 * Filter acceleration spikes from speed data
 */
export function filterAccelerationSpikes(
  speeds: (number | null)[],
  timestamps: (Date | null)[],
  maxAcceleration = 10
): (number | null)[] {
  if (!speeds || !timestamps || speeds.length < 2) return speeds;

  const filtered: (number | null)[] = [speeds[0]];

  for (let i = 1; i < speeds.length; i++) {
    if (!speeds[i] || !speeds[i - 1] || !timestamps[i] || !timestamps[i - 1]) {
      filtered.push(speeds[i]);
      continue;
    }

    const deltaSpeed = Math.abs((speeds[i]! - speeds[i - 1]!) * (1000 / 3600));
    const deltaTime = (timestamps[i]!.getTime() - timestamps[i - 1]!.getTime()) / 1000;

    if (deltaTime > 0) {
      const acceleration = deltaSpeed / deltaTime;

      if (acceleration > maxAcceleration) {
        filtered.push(null);
        continue;
      }
    }

    filtered.push(speeds[i]);
  }

  return filtered;
}

/**
 * Filter distance jumps based on implied speed
 */
export function filterDistanceJumps(
  coordinates: Coordinate[],
  timestamps: (Date | null)[],
  maxSpeedKmh = 35
): boolean[] {
  if (!coordinates || !timestamps || coordinates.length < 2) {
    return coordinates.map(() => true);
  }

  const validFlags: boolean[] = [true];

  for (let i = 1; i < coordinates.length; i++) {
    if (!timestamps[i] || !timestamps[i - 1]) {
      validFlags.push(true);
      continue;
    }

    const distance = haversineDistance(coordinates[i - 1], coordinates[i]) * 1000;
    const deltaTime = (timestamps[i]!.getTime() - timestamps[i - 1]!.getTime()) / 1000;

    if (deltaTime > 0) {
      const impliedSpeed = (distance / deltaTime) * 3.6;

      if (impliedSpeed > maxSpeedKmh) {
        validFlags.push(false);
        continue;
      }
    }

    validFlags.push(true);
  }

  return validFlags;
}

/**
 * Clean GPS data by filtering outliers and smoothing
 */
export function cleanGPSData(
  speeds: (number | null)[],
  paces: (number | null)[],
  coordinates: Coordinate[],
  timestamps: (Date | null)[],
  maxSpeed = GPS_VALIDATION.MAX_SPEED_KMH
): {
  speeds: (number | null)[];
  paces: (number | null)[];
  validIndices: number[];
} {
  const cleaned = {
    speeds: [...speeds],
    paces: [...paces],
    validIndices: [] as number[],
  };

  const distanceFlags = filterDistanceJumps(coordinates, timestamps, maxSpeed);
  const accelFiltered = filterAccelerationSpikes(speeds, timestamps);

  for (let i = 0; i < speeds.length; i++) {
    if (!distanceFlags[i] || accelFiltered[i] === null) {
      cleaned.speeds[i] = null;
      cleaned.paces[i] = null;
    } else if (speeds[i] !== null && (speeds[i]! > maxSpeed || speeds[i]! < 0)) {
      cleaned.speeds[i] = null;
      cleaned.paces[i] = null;
    } else {
      cleaned.validIndices.push(i);
    }
  }

  return cleaned;
}
