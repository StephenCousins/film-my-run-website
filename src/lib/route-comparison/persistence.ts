import type { RouteData } from './types';

/**
 * Keeps loaded routes across a page reload.
 *
 * Until now the tool held everything in React state, so a refresh — or a
 * mis-click on the back button — threw away files the user had just dropped in.
 * Routes are stored in localStorage; timestamps need reviving because JSON
 * turns Date objects into strings.
 */

const STORAGE_KEY = 'fmr:route-comparison:v1';

/**
 * Rough ceiling on what we'll try to persist. localStorage is typically capped
 * around 5MB and a long run with per-second samples is not small; better to
 * skip saving than to throw a QuotaExceededError mid-session.
 */
const MAX_BYTES = 3_500_000;

export interface PersistedState {
  routes: RouteData[];
  selectedRouteIds: string[];
  referenceRouteId: string | null;
  savedAt: string;
}

function reviveDates(routes: RouteData[]): RouteData[] {
  return routes.map((route) => ({
    ...route,
    timestamps: (route.timestamps ?? []).map((t) =>
      t === null ? null : new Date(t as unknown as string)
    ),
  }));
}

export function loadState(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedState;
    if (!Array.isArray(parsed.routes) || parsed.routes.length === 0) return null;

    return { ...parsed, routes: reviveDates(parsed.routes) };
  } catch {
    // Corrupt or from an older shape — start clean rather than break the page.
    clearState();
    return null;
  }
}

export function saveState(state: Omit<PersistedState, 'savedAt'>): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (state.routes.length === 0) {
      clearState();
      return true;
    }

    const payload = JSON.stringify({ ...state, savedAt: new Date().toISOString() });
    if (payload.length > MAX_BYTES) return false;

    window.localStorage.setItem(STORAGE_KEY, payload);
    return true;
  } catch {
    // Quota exceeded, or storage blocked (private browsing, cookie settings).
    return false;
  }
}

export function clearState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing useful to do
  }
}
