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
 * Build cumulative distances array
 * @returns Array of cumulative distances in kilometers
 */
export function buildCumulativeDistances(coords: Coordinate[]): number[] {
  const distances = [0];
  for (let i = 1; i < coords.length; i++) {
    const d = haversineDistance(coords[i - 1], coords[i]);
    distances.push(distances[i - 1] + d);
  }
  return distances;
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
