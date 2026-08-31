// Type definitions for Route Comparison

import { Coordinate } from './gps';

export type { Coordinate };

/** Where a headline figure came from, in descending order of trust. */
export type DistanceSource = 'session' | 'record' | 'gps';
export type DurationSource = 'session' | 'gps';

/** The device's own totals for the activity, from the FIT session message. */
export interface SessionSummary {
  totalDistanceKm: number | null;
  totalElapsedSeconds: number | null;
  /** Elapsed minus auto-pause — the "moving time" counterpart. */
  totalTimerSeconds: number | null;
  totalAscent: number | null;
  totalDescent: number | null;
}

/** One zone, identified by the value at its upper bound. */
export interface ZoneBoundary {
  high: number;
  name: string | null;
}

export interface RouteStats {
  distance: number;
  elevationGain: number;
  elevationLoss: number;
  minElevation: number;
  maxElevation: number;
  duration: number | null;
  /**
   * Which channel `distance` and `duration` came from. A Haversine sum over
   * the track is the worst distance available for a FIT file: it accumulates
   * positional jitter as real distance, and records with no fix are dropped at
   * parse time, so a lost-fix stretch gets chorded straight across.
   */
  distanceSource: DistanceSource;
  durationSource: DurationSource;
  /**
   * Purely track-derived figures, kept because the session self-check measures
   * the device's self-reported totals against them. Pointing that check at the
   * headline stats would report a zero discrepancy on every file.
   */
  gpsDistance: number;
  gpsDuration: number | null;
  /** Elapsed minus auto-pause, when the device recorded it. */
  movingTime: number | null;
}

export interface RouteData {
  id: string;
  filename: string;
  displayName: string;
  color: string;
  coordinates: Coordinate[];
  elevations: (number | null)[];
  timestamps: (Date | null)[];
  heartRates: (number | null)[];
  cadences: (number | null)[];
  powers: (number | null)[];
  speeds: (number | null)[];
  paces: (number | null)[];
  /**
   * Optional series, only present when the source file carried them. FIT files
   * from a Garmin usually do; GPX rarely does. Absent rather than all-null so
   * the UI can hide a metric outright instead of drawing an empty chart.
   */
  temperatures?: (number | null)[];
  batteryLevels?: (number | null)[];
  gpsAccuracies?: (number | null)[];
  /** GPS altitude, where it differs from the barometric `elevations`. */
  gpsElevations?: (number | null)[];
  /**
   * The device's own cumulative odometer in km, one entry per plotted point.
   * Only present when the channel is complete and monotonic — anything less
   * would corrupt the binary search in `findIndexAtDistance` rather than
   * merely look wrong.
   */
  distances?: number[];
  /** Exact zone boundaries the device used, where the file carried them. */
  hrZoneBoundaries?: ZoneBoundary[];
  powerZoneBoundaries?: ZoneBoundary[];
  stats: RouteStats;
}

export interface Split {
  number: number;
  startKm: number;
  endKm: number;
  distance: number;
  isPartial: boolean;
  duration: number | null;
  pace: number | null;
  elevGain: number;
  avgHR: number | null;
}

export interface BestEffort {
  distance: number;
  distanceLabel: string;
  pace: number;
  duration: number;
  startKm: number;
  elevGain: number;
  startIdx: number;
  endIdx: number;
}

export interface Zone {
  zone: number;
  name: string;
  color: string;
  min: number;
  max: number;
  time: number;
  points: number;
  percent: number;
}

export interface ZoneAnalysis {
  zones: Zone[];
  totalTime: number;
  dominantZone: number;
  metric: string;
  minVal: number;
  maxVal: number;
}

export interface TimeGapResult {
  referenceRouteId: string;
  gaps: {
    distance: number;
    referenceTime: number;
    comparisons: {
      routeId: string;
      time: number;
      gap: number; // Positive = behind, Negative = ahead
    }[];
  }[];
  maxDistance: number;
}

export interface GradePoint {
  grade: number;
  distance: number;
  elevChange: number;
}

export interface SteepSection {
  type: 'climb' | 'descent';
  startKm: number;
  endKm: number;
  distance: number;
  elevChange: number;
  maxGrade: number;
  avgGrade: number;
}

export interface SegmentMetrics {
  startKm: number;
  endKm: number;
  actualDistance: number;
  duration: number | null;
  pace: number | null;
  elevGain: number;
  elevLoss: number;
  avgHR: number | null;
  avgCadence: number | null;
  avgPower: number | null;
}

export interface EffortScore {
  score: number;
  category: string;
  color: string;
  factorsUsed: number;
}

export interface ParsedRawData {
  coordinates: Coordinate[];
  elevations: (number | null)[];
  timestamps: (Date | null)[];
  heartRates: (number | null)[];
  cadences: (number | null)[];
  powers: (number | null)[];
}

export interface ValidatedData extends ParsedRawData {
  skipped: number;
  warnings: string[];
}

export interface ChartDataPoint {
  distance: number;
  [key: string]: number | null;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function calculateMapBounds(routes: RouteData[]): MapBounds | null {
  if (routes.length === 0) return null;

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  for (const route of routes) {
    for (const coord of route.coordinates) {
      if (coord.lat > north) north = coord.lat;
      if (coord.lat < south) south = coord.lat;
      if (coord.lng > east) east = coord.lng;
      if (coord.lng < west) west = coord.lng;
    }
  }

  // Add padding
  const latPadding = (north - south) * 0.1;
  const lngPadding = (east - west) * 0.1;

  return {
    north: north + latPadding,
    south: south - latPadding,
    east: east + lngPadding,
    west: west - lngPadding,
  };
}
