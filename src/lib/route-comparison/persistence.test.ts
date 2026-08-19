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
