// Map utility functions
import type { Coordinate, Routes } from './types';

/**
 * Extract Strava activity ID from URL
 */
export const extractActivityId = (stravaUrl: string): string | null => {
  if (!stravaUrl) return null;
  const match = stravaUrl.match(/activities\/(\d+)/);
  return match ? match[1] : null;
};

/**
 * Calculate bounds for a set of routes
 */
export const calculateBounds = (routes: Routes): google.maps.LatLngBounds | null => {
  if (!routes || Object.keys(routes).length === 0) {
    return null;
  }

  if (!window.google?.maps?.LatLngBounds) {
    console.warn('Google Maps not loaded');
    return null;
  }

  const bounds = new window.google.maps.LatLngBounds();
  let hasValidCoords = false;

  Object.values(routes).forEach((coordinates) => {
    if (coordinates && Array.isArray(coordinates)) {
      coordinates.forEach((coord) => {
        if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
          bounds.extend(new window.google.maps.LatLng(coord.lat, coord.lng));
          hasValidCoords = true;
        }
      });
    }
  });

  return hasValidCoords ? bounds : null;
};

/**
 * Calculate bounds for a single route's coordinates
 */
export const calculateRouteBounds = (coordinates: Coordinate[]): google.maps.LatLngBounds | null => {
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
    return null;
  }

  if (!window.google?.maps?.LatLngBounds) {
    console.warn('Google Maps not loaded');
    return null;
  }

  const bounds = new window.google.maps.LatLngBounds();
  let hasValidCoords = false;

  coordinates.forEach((coord) => {
    if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
      bounds.extend(new window.google.maps.LatLng(coord.lat, coord.lng));
      hasValidCoords = true;
    }
  });

  return hasValidCoords ? bounds : null;
};

/**
 * Convert HSL to hex color
 */
export const hslToHex = (h: number, s: number, l: number): string => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

/**
 * Animation configuration constants
 */
export const ANIMATION_CONFIG = {
  NUM_SEGMENTS: 10,
  ANIMATION_INTERVAL: 60,
  STROKE_WEIGHT: 6,
  STROKE_OPACITY: 0.9,
  MAX_ZOOM_LEVEL: 13,
};

/**
 * Extract year from date string (supports DD/MM/YYYY and YYYY-MM-DD)
 */
export const extractYear = (dateStr: string): string | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  // Try DD/MM/YYYY format
  const slashParts = dateStr.split('/');
  if (slashParts.length === 3 && slashParts[2].length === 4) {
    return slashParts[2];
  }
  // Try YYYY-MM-DD format
  const dashParts = dateStr.split('-');
  if (dashParts.length === 3 && dashParts[0].length === 4) {
    return dashParts[0];
  }
  return null;
};
