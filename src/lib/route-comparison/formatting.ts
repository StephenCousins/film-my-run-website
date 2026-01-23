// Formatting utilities for route comparison

/**
 * Format distance in km or m
 */
export function formatDistance(km: number): string {
  return km >= 1 ? `${km.toFixed(2)} km` : `${(km * 1000).toFixed(0)} m`;
}

/**
 * Format elevation in meters
 */
export function formatElevation(m: number): string {
  return `${Math.round(m)} m`;
}

/**
 * Format duration as human-readable string
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Format break duration
 */
export function formatBreakDuration(seconds: number | null): string {
  if (!seconds) return 'N/A';
  if (seconds < 60) {
    return `${Math.round(seconds)} seconds`;
  } else {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Format heart rate in bpm
 */
export function formatHeartRate(bpm: number | null): string {
  return !bpm || isNaN(bpm) ? 'N/A' : `${Math.round(bpm)} bpm`;
}

/**
 * Format pace in min/km
 */
export function formatPace(minPerKm: number | null): string {
  if (
    minPerKm === null ||
    minPerKm === undefined ||
    isNaN(minPerKm) ||
    !isFinite(minPerKm) ||
    minPerKm <= 0 ||
    minPerKm > 20
  ) {
    return 'N/A';
  }
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
}

/**
 * Format cadence in spm
 */
export function formatCadence(spm: number | null): string {
  return !spm || isNaN(spm) ? 'N/A' : `${Math.round(spm)} spm`;
}

/**
 * Format time delta (can be positive or negative)
 */
export function formatTimeDelta(seconds: number | null): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return 'N/A';

  const sign = seconds >= 0 ? '+' : '-';
  const absSeconds = Math.abs(seconds);
  const mins = Math.floor(absSeconds / 60);
  const secs = Math.floor(absSeconds % 60);

  if (mins > 0) {
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${sign}${secs}s`;
  }
}

/**
 * Format split pace (no /km suffix)
 */
export function formatSplitPace(pace: number | null): string {
  if (pace === null || pace === undefined || isNaN(pace) || !isFinite(pace)) {
    return 'N/A';
  }
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format split elevation gain/loss
 */
export function formatSplitElevation(meters: number | null): string {
  if (meters === null || meters === undefined || isNaN(meters)) {
    return 'N/A';
  }
  const rounded = Math.round(meters);
  return rounded >= 0 ? `+${rounded}m` : `${rounded}m`;
}

/**
 * Format split heart rate
 */
export function formatSplitHR(hr: number | null): string {
  if (hr === null || hr === undefined || isNaN(hr)) {
    return 'N/A';
  }
  return Math.round(hr).toString();
}

/**
 * Format split time
 */
export function formatSplitTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return 'N/A';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format split gap
 */
export function formatSplitGap(seconds: number | null): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return '-';
  }
  const sign = seconds >= 0 ? '+' : '-';
  const absSecs = Math.abs(seconds);
  const mins = Math.floor(absSecs / 60);
  const secs = Math.round(absSecs % 60);
  if (mins > 0) {
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${sign}${Math.round(absSecs)}s`;
}

/**
 * Format segment duration
 */
export function formatSegmentDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return 'N/A';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get distance label for best efforts
 */
export function getDistanceLabel(km: number): string {
  if (km === 21.1 || km === 21.0975) return 'Half Marathon';
  if (km === 42.195 || km === 42.2) return 'Marathon';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km}km`;
}

/**
 * Route colors for display
 */
export const ROUTE_COLORS = [
  '#EA4335',
  '#4285F4',
  '#FBBC04',
  '#34A853',
  '#FF6D00',
  '#46BDC6',
  '#7B1FA2',
  '#C2185B',
  '#00BCD4',
  '#8BC34A',
  '#FF5722',
  '#9C27B0',
  '#03A9F4',
  '#FFEB3B',
  '#E91E63',
  '#00ACC1',
  '#7CB342',
  '#F57C00',
  '#5E35B1',
  '#D81B60',
];

/**
 * Get next available route color
 */
export function getNextColor(usedColors: string[]): string {
  for (const color of ROUTE_COLORS) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }
  // If all colors used, cycle back
  return ROUTE_COLORS[usedColors.length % ROUTE_COLORS.length];
}

/**
 * Interpolate between two colors
 */
export function interpolateColor(color1: string, color2: string, factor: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Get pace color based on value
 */
export function getPaceColor(
  pace: number | null,
  minPace: number,
  maxPace: number
): string {
  const GREEN = '#34A853';
  const YELLOW = '#FBBC04';
  const RED = '#EA4335';

  if (pace === null || pace === undefined || isNaN(pace)) {
    return YELLOW;
  }

  const clampedPace = Math.max(minPace, Math.min(maxPace, pace));
  const normalized = (clampedPace - minPace) / (maxPace - minPace);

  if (normalized <= 0.5) {
    return interpolateColor(GREEN, YELLOW, normalized * 2);
  } else {
    return interpolateColor(YELLOW, RED, (normalized - 0.5) * 2);
  }
}
