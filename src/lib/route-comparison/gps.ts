// GPS and distance calculation utilities

export interface Coordinate {
  lat: number;
  lng: number;
}

/**
 * Convert degrees to radians
 */
export function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function haversineDistance(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) *
      Math.cos(toRad(coord2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total distance of a route
 * @returns Total distance in kilometers
 */
export function calculateDistance(coords: Coordinate[]): number {
  let totalDistance = 0;
  for (let i = 1; i < coords.length; i++) {
    totalDistance += haversineDistance(coords[i - 1], coords[i]);
  }
  return totalDistance;
}

/**
 * Is a FIT `record.distance` channel safe to plot and index against?
 *
 * Only if it covers every plotted point and never goes backwards. The x-axis,
 * the split finder and the best-effort window search all assume a sorted
 * array, so a single null or backward step would corrupt a binary search
 * rather than merely look wrong. Anything less than complete and monotonic
 * falls back to Haversine, which is always well-formed.
 */
export function isUsableDistanceChannel(
  distances: number[] | undefined | null,
  expectedLength: number | null = null
): boolean {
  if (!Array.isArray(distances) || distances.length < 2) return false;
  if (expectedLength !== null && distances.length !== expectedLength) return false;

  for (let i = 0; i < distances.length; i++) {
    const d = distances[i];
    if (typeof d !== 'number' || !isFinite(d)) return false;
    if (i > 0 && d < distances[i - 1]) return false;
  }

  return distances[distances.length - 1] > distances[0];
}

/**
 * Build cumulative distances array.
 *
 * Prefers the device's own odometer when one is supplied and usable, rebased
 * to the first plotted point — the raw channel is an absolute figure for the
 * whole activity, so a run whose first GPS fix arrives 2 km in would otherwise
 * start its x-axis at 2 km and offset every split by that much.
 *
 * @returns Array of cumulative distances in kilometers
 */
export function buildCumulativeDistances(
  coords: Coordinate[],
  deviceDistances?: number[] | null
): number[] {
  if (isUsableDistanceChannel(deviceDistances, coords.length)) {
    const base = deviceDistances![0];
    return deviceDistances!.map((d) => d - base);
  }

  const distances = [0];
  for (let i = 1; i < coords.length; i++) {
    const d = haversineDistance(coords[i - 1], coords[i]);
    distances.push(distances[i - 1] + d);
  }
  return distances;
}

/**
 * Total distance according to the device's own odometer. Takes the maximum
 * rather than the last element so a trailing null or a spurious reset at the
 * end of the file can't report a short run — the odometer only ever climbs,
 * so the maximum is the total. Tolerates gaps, unlike the channel check.
 */
export function deviceTotalDistance(distances: number[] | undefined | null): number | null {
  if (!Array.isArray(distances) || distances.length === 0) return null;

  let min: number | null = null;
  let max: number | null = null;
  for (const d of distances) {
    if (typeof d !== 'number' || !isFinite(d)) continue;
    if (min === null || d < min) min = d;
    if (max === null || d > max) max = d;
  }

  if (min === null || max === null || max <= min) return null;
  return max - min;
}

/**
 * Find index at a specific distance using binary search
 */
export function findIndexAtDistance(distances: number[], targetKm: number): number {
  if (!distances || distances.length === 0) return 0;
  if (targetKm <= 0) return 0;
  if (targetKm >= distances[distances.length - 1]) return distances.length - 1;

  let low = 0;
  let high = distances.length - 1;

  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    if (distances[mid] <= targetKm) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low;
}

/**
 * Validation constants for GPS data
 */
export const GPS_VALIDATION = {
  LAT_MIN: -90,
  LAT_MAX: 90,
  LNG_MIN: -180,
  LNG_MAX: 180,
  ELEV_MIN: -500, // Dead Sea is ~-430m
  ELEV_MAX: 9000, // Everest is ~8849m
  MAX_SPEED_KMH: 35, // Max running speed for GPS cleaning
};

/**
 * Validate a single coordinate pair
 */
export function validateCoordinate(
  lat: number | null | undefined,
  lng: number | null | undefined
): { valid: boolean; reason?: string } {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return { valid: false, reason: 'missing' };
  }
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
    return { valid: false, reason: 'invalid_number' };
  }
  if (lat < GPS_VALIDATION.LAT_MIN || lat > GPS_VALIDATION.LAT_MAX) {
    return { valid: false, reason: 'lat_out_of_range' };
  }
  if (lng < GPS_VALIDATION.LNG_MIN || lng > GPS_VALIDATION.LNG_MAX) {
    return { valid: false, reason: 'lng_out_of_range' };
  }
  return { valid: true };
}

/**
 * Validate elevation value
 */
export function validateElevation(
  elevation: number | null | undefined
): { valid: boolean; value: number | null; reason?: string } {
  if (elevation === null || elevation === undefined) {
    return { valid: true, value: null };
  }
  if (isNaN(elevation) || !isFinite(elevation)) {
    return { valid: false, value: null, reason: 'invalid_number' };
  }
  if (elevation < GPS_VALIDATION.ELEV_MIN || elevation > GPS_VALIDATION.ELEV_MAX) {
    return { valid: false, value: null, reason: 'out_of_range' };
  }
  return { valid: true, value: elevation };
}

/**
 * Validate timestamp (must be chronological)
 */
export function validateTimestamp(
  timestamp: Date | null | undefined,
  prevTimestamp: Date | null
): { valid: boolean; value: Date | null; reason?: string } {
  if (timestamp === null || timestamp === undefined) {
    return { valid: true, value: null };
  }
  if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
    return { valid: false, value: null, reason: 'invalid_date' };
  }
  if (prevTimestamp && timestamp < prevTimestamp) {
    return { valid: false, value: null, reason: 'not_chronological' };
  }
  return { valid: true, value: timestamp };
}
