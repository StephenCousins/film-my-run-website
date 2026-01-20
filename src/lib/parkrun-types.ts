// Parkrun types - shared between client and server

// Helper to format time in seconds to HH:MM:SS or MM:SS
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper to parse time string (MM:SS or HH:MM:SS) to seconds
export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] * 60 + parts[1];
}

// Types for parkrun data
export interface ParkrunResult {
  id: number;
  date: string;
  event: string;
  run_number: number;
  position: number;
  time_seconds: number;
  time_formatted: string;
  age_grade: number | null;
  age_category_position: number | null;
  pb: boolean;
}

export interface VenueStats {
  event: string;
  visit_count: number;
  best_time_seconds: number;
  best_time_formatted: string;
  first_visit: string;
  last_visit: string;
  average_time_seconds: number;
}

export interface YearlyStats {
  year: number;
  runs: number;
  best_time_seconds: number;
  best_time_formatted: string;
  best_position: number;
  average_time_seconds: number;
  pb_count: number;
}

export interface AgeCategoryStats {
  position: number;
  count: number;
}

export interface VenueCoordinate {
  event: string;
  latitude: number;
  longitude: number;
  visit_count: number;
}

export interface ParkrunMetadata {
  totalParkruns: number;
  personalBest: number;
  personalBestFormatted: string;
  personalBestVenue: string;
  personalBestDate: string;
  bestPosition: number;
  uniqueVenues: number;
  firstParkrunDate: string;
  lastParkrunDate: string;
  totalDistanceKm: number;
}

export interface UKRanking {
  rank: number;
  venue: string;
  difficulty_rating: number;
  total_finishers: number;
  average_time_seconds: number;
  user_visited: boolean;
  user_best_time: number | null;
  user_visits: number;
}
