import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRouteData } from './file-parser';
import { calculateDistance } from './gps';
import type { SessionSummary } from './types';

/** ~111 m between consecutive points. */
const track = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ lat: 51 + i * 0.001, lng: -1 }));

/** A clean device odometer in km: 100 m per point. */
const odometer = (n: number, startKm = 0) =>
  Array.from({ length: n }, (_, i) => startKm + i * 0.1);

const session = (over: Partial<SessionSummary> = {}): SessionSummary => ({
  totalDistanceKm: null,
  totalElapsedSeconds: null,
  totalTimerSeconds: null,
  totalAscent: null,
  totalDescent: null,
  ...over,
});

const build = (
  coordinates: { lat: number; lng: number }[],
  extras: Parameters<typeof createRouteData>[10] = {},
  timestamps: (Date | null)[] | null = null
) =>
  createRouteData(
    'test.fit',
    '#EA4335',
    coordinates,
    new Array(coordinates.length).fill(100),
    timestamps ?? new Array(coordinates.length).fill(null),
    [],
    [],
    [],
    [],
    [],
    extras
  );

afterEach(() => vi.restoreAllMocks());

describe('distance precedence', () => {
  const coordinates = track(11); // ~1.11 km of GPS track

  it('prefers the session total over everything else', () => {
    const route = build(coordinates, {
      distances: odometer(11),
      sessionSummary: session({ totalDistanceKm: 1.05 }),
    });

    expect(route.stats.distance).toBe(1.05);
    expect(route.stats.distanceSource).toBe('session');
  });

  it('falls back to the record odometer when there is no session total', () => {
    const route = build(coordinates, { distances: odometer(11) });

    expect(route.stats.distance).toBeCloseTo(1.0, 9);
    expect(route.stats.distanceSource).toBe('record');
  });

  it('falls back to the GPS track when neither is present (GPX)', () => {
    const route = build(coordinates);

    expect(route.stats.distanceSource).toBe('gps');
    expect(route.stats.distance).toBeCloseTo(calculateDistance(coordinates), 9);
  });

  it('always reports the track-derived distance alongside', () => {
    // The session self-check measures the device's own totals against the
    // track. Pointing it at the headline stats would report a zero
    // discrepancy on every file and silently retire the check.
    const route = build(coordinates, {
      distances: odometer(11),
      sessionSummary: session({ totalDistanceKm: 1.05 }),
    });

    expect(route.stats.gpsDistance).toBeCloseTo(calculateDistance(coordinates), 9);
    expect(route.stats.gpsDistance).not.toBe(route.stats.distance);
  });

  it('discards a record channel that grossly disagrees with the session total', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Channel reads ~1 km against a session total of 5 km — one of them is
    // not in the units we think it is, so the channel must not be plotted.
    const route = build(coordinates, {
      distances: odometer(11),
      sessionSummary: session({ totalDistanceKm: 5.0 }),
    });

    expect(route.stats.distance).toBe(5.0);
    expect(route.distances).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('keeps a record channel that agrees with the session total', () => {
    const route = build(coordinates, {
      distances: odometer(11),
      sessionSummary: session({ totalDistanceKm: 1.02 }),
    });

    expect(route.distances).toHaveLength(11);
  });

  it('keeps a holed channel out of the plot but still trusts its total', () => {
    // A gap makes the channel unsafe to index against — the binary search in
    // findIndexAtDistance assumes a sorted, complete array. The odometer's
    // span is still the device's own measurement and still spans the gap, so
    // it remains a better headline figure than a Haversine sum.
    const holed = odometer(11);
    holed[5] = null as unknown as number;

    const route = build(coordinates, { distances: holed });

    expect(route.stats.distanceSource).toBe('record');
    expect(route.stats.distance).toBeCloseTo(1.0, 9);
    expect(route.distances).toBeUndefined();
  });

  it('falls back to the track when the channel never advances', () => {
    const flat = new Array(11).fill(3.2);

    const route = build(coordinates, { distances: flat });

    expect(route.stats.distanceSource).toBe('gps');
    expect(route.distances).toBeUndefined();
  });
});

describe('duration precedence', () => {
  const coordinates = track(11);
  const timestamps = Array.from(
    { length: 11 },
    (_, i) => new Date(Date.UTC(2026, 0, 1, 0, 0, i * 10))
  );

  it('prefers the session elapsed time', () => {
    // The track-derived figure starts at the first GPS fix, so it silently
    // loses any pre-lock portion of the recording.
    const route = build(
      coordinates,
      { sessionSummary: session({ totalElapsedSeconds: 240 }) },
      timestamps
    );

    expect(route.stats.duration).toBe(240);
    expect(route.stats.durationSource).toBe('session');
  });

  it('falls back to the timestamp span', () => {
    const route = build(coordinates, {}, timestamps);

    expect(route.stats.duration).toBe(100);
    expect(route.stats.durationSource).toBe('gps');
  });

  it('always reports the track-derived duration alongside', () => {
    const route = build(
      coordinates,
      { sessionSummary: session({ totalElapsedSeconds: 240 }) },
      timestamps
    );

    expect(route.stats.gpsDuration).toBe(100);
  });

  it('carries moving time from the timer field', () => {
    const route = build(
      coordinates,
      { sessionSummary: session({ totalElapsedSeconds: 240, totalTimerSeconds: 200 }) },
      timestamps
    );

    expect(route.stats.movingTime).toBe(200);
  });

  it('leaves moving time null when the device did not record it', () => {
    const route = build(coordinates, {}, timestamps);
    expect(route.stats.movingTime).toBeNull();
  });
});

describe('ascent and descent', () => {
  it('stays recomputed from the track rather than taken from the device', () => {
    // Device ascent is barometric and calibrated per-device, so comparing two
    // watches on their own numbers compares their barometers, not the route.
    const coordinates = track(11);
    const elevations = [100, 110, 120, 130, 140, 150, 140, 130, 120, 110, 100];

    const route = createRouteData(
      'test.fit',
      '#EA4335',
      coordinates,
      elevations,
      new Array(11).fill(null),
      [],
      [],
      [],
      [],
      [],
      { sessionSummary: session({ totalAscent: 999, totalDescent: 999 }) }
    );

    expect(route.stats.elevationGain).not.toBe(999);
    expect(route.stats.elevationGain).toBeCloseTo(50, 6);
    expect(route.stats.elevationLoss).toBeCloseTo(50, 6);
  });
});
