import { describe, it, expect } from 'vitest';
import {
  buildCumulativeDistances,
  calculateDistance,
  findIndexAtDistance,
  isUsableDistanceChannel,
} from './gps';

/** ~111 m between consecutive points, so n points span ~(n-1) * 0.111 km. */
const track = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ lat: 51 + i * 0.001, lng: -1 }));

/** A clean device odometer: 100 m per point, already in km. */
const odometer = (n: number, startKm = 0) =>
  Array.from({ length: n }, (_, i) => startKm + i * 0.1);

describe('isUsableDistanceChannel', () => {
  it('accepts a complete, monotonic, non-degenerate channel', () => {
    expect(isUsableDistanceChannel(odometer(11), 11)).toBe(true);
  });

  it('rejects a channel with holes in it', () => {
    // A binary search over a null is not merely wrong, it is undefined —
    // this is the case that has to fail closed.
    const withHole = odometer(11);
    withHole[5] = null as unknown as number;
    expect(isUsableDistanceChannel(withHole, 11)).toBe(false);
  });

  it('rejects a channel that goes backwards', () => {
    const backward = odometer(11);
    backward[7] = backward[6] - 0.05;
    expect(isUsableDistanceChannel(backward, 11)).toBe(false);
  });

  it('rejects a channel shorter than the track it must index', () => {
    expect(isUsableDistanceChannel(odometer(9), 11)).toBe(false);
  });

  it('rejects a channel that never advances', () => {
    expect(isUsableDistanceChannel(new Array(11).fill(4.2), 11)).toBe(false);
  });

  it('rejects non-finite values', () => {
    const nan = odometer(11);
    nan[3] = NaN;
    expect(isUsableDistanceChannel(nan, 11)).toBe(false);

    const inf = odometer(11);
    inf[3] = Infinity;
    expect(isUsableDistanceChannel(inf, 11)).toBe(false);
  });

  it('rejects an absent or too-short channel', () => {
    expect(isUsableDistanceChannel([], 0)).toBe(false);
    expect(isUsableDistanceChannel([0.1], 1)).toBe(false);
    expect(isUsableDistanceChannel(undefined as unknown as number[], 11)).toBe(false);
  });

  it('does not require a length when none is given', () => {
    expect(isUsableDistanceChannel(odometer(5))).toBe(true);
  });
});

describe('buildCumulativeDistances', () => {
  const coords = track(11);

  it('falls back to Haversine when no channel is supplied', () => {
    const cumulative = buildCumulativeDistances(coords);
    expect(cumulative).toHaveLength(11);
    expect(cumulative[0]).toBe(0);
    expect(cumulative[10]).toBeCloseTo(calculateDistance(coords), 9);
  });

  it('uses the device channel when it is usable', () => {
    const cumulative = buildCumulativeDistances(coords, odometer(11));
    expect(cumulative[10]).toBeCloseTo(1.0, 9);
    // The device figure differs from the track — that is the whole point.
    expect(cumulative[10]).not.toBeCloseTo(calculateDistance(coords), 3);
  });

  it('rebases the channel to the first plotted point', () => {
    // The odometer is an absolute lifetime-of-activity figure. If the first
    // GPS fix arrives 2 km in, plotting the raw channel would start the x-axis
    // at 2 km and every split would be offset by that much.
    const cumulative = buildCumulativeDistances(coords, odometer(11, 2.0));
    expect(cumulative[0]).toBe(0);
    expect(cumulative[10]).toBeCloseTo(1.0, 9);
  });

  it('falls back to Haversine when the channel is unusable', () => {
    const broken = odometer(11);
    broken[5] = null as unknown as number;
    const cumulative = buildCumulativeDistances(coords, broken);
    expect(cumulative[10]).toBeCloseTo(calculateDistance(coords), 9);
  });

  it('falls back when the channel length does not match the track', () => {
    const cumulative = buildCumulativeDistances(coords, odometer(9));
    expect(cumulative[10]).toBeCloseTo(calculateDistance(coords), 9);
  });

  it('stays sorted, so findIndexAtDistance can binary-search it', () => {
    const cumulative = buildCumulativeDistances(coords, odometer(11, 2.0));
    for (let i = 1; i < cumulative.length; i++) {
      expect(cumulative[i]).toBeGreaterThanOrEqual(cumulative[i - 1]);
    }
    expect(findIndexAtDistance(cumulative, 0.5)).toBe(5);
  });
});
