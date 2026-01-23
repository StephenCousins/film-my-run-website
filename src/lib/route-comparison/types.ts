// Type definitions for Route Comparison

import { Coordinate } from './gps';

export type { Coordinate };

export interface RouteStats {
  distance: number;
  elevationGain: number;
  elevationLoss: number;
  minElevation: number;
  maxElevation: number;
  duration: number | null;
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
