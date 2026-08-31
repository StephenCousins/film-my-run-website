import { describe, it, expect } from 'vitest';
import { calculateSplits, calculateBestEfforts } from './analysis';
import { calculateDistance } from './gps';
import type { RouteData } from './types';

/**
 * Once the headline distance comes from the device, every derived figure has
 * to be priced in the same currency. A split bounded at 1 device-km but paced
 * over the Haversine length of those same points is wrong by exactly the
 * jitter the device fix was introduced to remove — 2-4% on a real ultra.
 */

/**
 * ~111 m apart by Haversine; the device says a flat 125 m per point.
 *
 * 0.125 is exact in binary, so `cum[i] + 1.0` lands exactly on `cum[i + 8]`.
 * With a spacing like 0.1 the same sum falls one ULP short of the boundary and
 * the window closes an index early — a fixture artefact that has nothing to
 * say about which distance channel is in use.
 */
const track = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ lat: 51 + i * 0.001, lng: -1 }));

/** Points per device km, at 0.125 km spacing. */
const PTS_PER_KM = 8;

const route = (n: number, withChannel: boolean): RouteData => {
  const coordinates = track(n);
  const distances = Array.from({ length: n }, (_, i) => i * 0.125);
  const gpsDistance = calculateDistance(coordinates);

  return {
    id: 'r1',
    filename: 'test.fit',
    displayName: 'test',
    color: '#EA4335',
    coordinates,
    elevations: new Array(n).fill(100),
    // One point per second, so a 1 km split takes as many seconds as points.
    timestamps: Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 0, 1, 0, 0, i))),
    heartRates: new Array(n).fill(140),
    cadences: new Array(n).fill(170),
    powers: new Array(n).fill(250),
    speeds: new Array(n).fill(6),
    paces: new Array(n).fill(10),
    ...(withChannel ? { distances } : {}),
    stats: {
      distance: withChannel ? distances[n - 1] : gpsDistance,
      elevationGain: 0,
      elevationLoss: 0,
      minElevation: 100,
      maxElevation: 100,
      duration: n - 1,
      distanceSource: withChannel ? 'record' : 'gps',
      durationSource: 'gps',
      gpsDistance,
      gpsDuration: n - 1,
      movingTime: null,
    },
  };
};

describe('splits priced against the device channel', () => {
  it('measures a split in the same units it bounded it with', () => {
    // 25 points: 3.0 km by the device, ~2.67 km by Haversine.
    const r = route(25, true);
    const splits = calculateSplits(r, 1.0);

    const full = splits.filter((s) => !s.isPartial);
    expect(full.length).toBeGreaterThanOrEqual(3);

    for (const split of full) {
      // 8 points at 1 s apart per device km, so 8 s / km = 8/60 min/km.
      // Priced over the Haversine length of those same points (~0.89 km) it
      // would read 0.15 — about 12% faster than the watch said.
      expect(split.pace).toBeCloseTo(PTS_PER_KM / 60, 6);
    }
  });

  it('still prices against the track when there is no device channel', () => {
    const r = route(25, false);
    const splits = calculateSplits(r, 1.0);
    const first = splits[0];

    // A Haversine-bounded km takes ~9 points, so the pace differs from the
    // device case — the point is that bounds and pricing agree with each other.
    expect(first.pace).toBeGreaterThan(0);
    expect(first.distance).toBeCloseTo(1.0, 6);
  });
});

describe('best efforts bounded by the array they index', () => {
  it('does not admit a target the cumulative array cannot reach', () => {
    const r = route(25, true);
    // Session says the run was longer than the plotted track reaches.
    r.stats.distance = 5.0;
    r.stats.distanceSource = 'session';

    const efforts = calculateBestEfforts(r, [1, 5]);

    // 1 km fits inside the 3.0 km channel; 5 km does not, whatever the
    // session total claims.
    expect(efforts.map((e) => e.distance)).toEqual([1]);
  });

  it('finds efforts that do fit', () => {
    const r = route(25, true);
    const efforts = calculateBestEfforts(r, [1]);

    expect(efforts).toHaveLength(1);
    expect(efforts[0].pace).toBeCloseTo(PTS_PER_KM / 60, 6);
  });
});
