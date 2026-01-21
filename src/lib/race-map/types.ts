// Race Map Types

export interface Race {
  number: string;
  date: string;
  name: string;
  distance: string;
  time: string;
  position: string;
  elevation: string;
  video: string;
  report: string;
  strava: string;
  officialResults: string;
  type: 'Marathon' | 'Ultra' | string;
  terrain: 'Road' | 'Trail' | string;
  marathonCount: string;
  ultraCount: string;
  roadCount: string;
  trailCount: string;
  hundredMilers: string;
  raceCount: string;
}

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RouteData {
  activityId?: string;
  name?: string;
  date?: string;
  coordinates: Coordinate[];
}

// Routes can be either direct coordinate arrays or objects with coordinates property
export interface Routes {
  [activityId: string]: Coordinate[] | RouteData;
}

export interface Filters {
  showMarathons: boolean;
  showUltras: boolean;
  showRoad: boolean;
  showTrail: boolean;
  year: string;
}

export interface Progress {
  current: number;
  total: number;
  percentage: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'success' | 'info';
  retryable: boolean;
  duration: number;
}
