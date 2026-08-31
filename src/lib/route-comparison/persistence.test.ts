import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadState, saveState, clearState } from './persistence';
import type { RouteData } from './types';

function makeStore() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _map: map,
  };
}

const route = (id: string, overrides: Partial<RouteData> = {}): RouteData =>
  ({
    id,
    filename: `${id}.fit`,
    displayName: id,
    color: '#EA4335',
    coordinates: [{ lat: 50.8, lng: -0.3 }],
    elevations: [12],
    timestamps: [new Date(Date.UTC(2026, 0, 1, 9, 0, 0))],
    heartRates: [140],
    cadences: [170],
    powers: [250],
    speeds: [12],
    paces: [5],
    stats: {} as RouteData['stats'],
    ...overrides,
  }) as RouteData;

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: makeStore() });
});

describe('route comparison persistence', () => {
  it('round-trips the device distance channel and zone boundaries', () => {
    // These decide the headline distance and every zone percentage, so a
    // reload that dropped them would quietly change the numbers on screen.
    saveState({
      routes: [
        route('a', {
          distances: [0, 0.1, 0.2],
          hrZoneBoundaries: [
            { high: 122, name: 'Warm Up' },
            { high: 136, name: 'Easy' },
          ],
          powerZoneBoundaries: [{ high: 220, name: 'Recovery' }],
          stats: {
            distance: 1.05,
            elevationGain: 10,
            elevationLoss: 10,
            minElevation: 0,
            maxElevation: 20,
            duration: 300,
            distanceSource: 'session',
            durationSource: 'session',
            gpsDistance: 1.11,
            gpsDuration: 290,
            movingTime: 280,
          },
        }),
      ],
      selectedRouteIds: ['a'],
      referenceRouteId: null,
    });

    const r = loadState()!.routes[0];
    expect(r.distances).toEqual([0, 0.1, 0.2]);
    expect(r.hrZoneBoundaries).toEqual([
      { high: 122, name: 'Warm Up' },
      { high: 136, name: 'Easy' },
    ]);
    expect(r.powerZoneBoundaries).toEqual([{ high: 220, name: 'Recovery' }]);
    expect(r.stats.distanceSource).toBe('session');
    expect(r.stats.gpsDistance).toBe(1.11);
    expect(r.stats.movingTime).toBe(280);
  });

  it('round-trips routes and selection', () => {
    const ok = saveState({
      routes: [route('a'), route('b')],
      selectedRouteIds: ['a'],
      referenceRouteId: 'b',
    });
    expect(ok).toBe(true);

    const loaded = loadState()!;
    expect(loaded.routes.map((r) => r.id)).toEqual(['a', 'b']);
    expect(loaded.selectedRouteIds).toEqual(['a']);
    expect(loaded.referenceRouteId).toBe('b');
  });

  it('revives timestamps as Date objects, not strings', () => {
    saveState({ routes: [route('a')], selectedRouteIds: [], referenceRouteId: null });
    const loaded = loadState()!;
    const ts = loaded.routes[0].timestamps[0];
    expect(ts).toBeInstanceOf(Date);
    expect(ts!.toISOString()).toBe('2026-01-01T09:00:00.000Z');
  });

  it('keeps the optional FIT series', () => {
    saveState({
      routes: [route('a', { temperatures: [14], batteryLevels: [87], gpsAccuracies: [3.5] })],
      selectedRouteIds: [],
      referenceRouteId: null,
    });
    const r = loadState()!.routes[0];
    expect(r.temperatures).toEqual([14]);
    expect(r.batteryLevels).toEqual([87]);
    expect(r.gpsAccuracies).toEqual([3.5]);
  });

  it('returns null when nothing is stored', () => {
    expect(loadState()).toBeNull();
  });

  it('treats an empty route list as nothing to restore', () => {
    saveState({ routes: [], selectedRouteIds: [], referenceRouteId: null });
    expect(loadState()).toBeNull();
  });

  it('recovers from corrupt storage instead of throwing', () => {
    (window as unknown as { localStorage: Storage }).localStorage.setItem(
      'fmr:route-comparison:v1',
      '{not json'
    );
    expect(loadState()).toBeNull();
  });

  it('skips saving when the payload is too large for localStorage', () => {
    const huge = route('a', {
      elevations: new Array(700_000).fill(123.456), // ~5.6MB serialised
    });
    expect(saveState({ routes: [huge], selectedRouteIds: [], referenceRouteId: null })).toBe(false);
    expect(loadState()).toBeNull();
  });

  it('survives storage being unavailable', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => { throw new Error('blocked'); },
        setItem: () => { throw new Error('blocked'); },
        removeItem: () => { throw new Error('blocked'); },
      },
    });
    expect(() => loadState()).not.toThrow();
    expect(saveState({ routes: [route('a')], selectedRouteIds: [], referenceRouteId: null })).toBe(false);
  });

  it('clears', () => {
    saveState({ routes: [route('a')], selectedRouteIds: [], referenceRouteId: null });
    clearState();
    expect(loadState()).toBeNull();
  });
});
