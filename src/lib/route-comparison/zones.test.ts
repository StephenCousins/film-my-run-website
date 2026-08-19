import { describe, it, expect } from 'vitest';
import { calculateZones } from './analysis';

/** A run at a steady, easy effort — roughly 65% of the day's max. */
const easyRun = () => {
  const values: number[] = [];
  for (let i = 0; i < 600; i++) values.push(120 + (i % 5)); // 120-124 bpm
  values.push(185); // one hard surge sets the max
  return values;
};

const timestamps = (n: number) =>
  Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 0, 1, 0, 0, i)));

describe('calculateZones', () => {
  it('puts an easy run in the lower zones, not Max', () => {
    const values = easyRun();
    const z = calculateZones(values, timestamps(values.length), 'heartRate')!;
    expect(z).not.toBeNull();

    const max = z.zones.find((x) => x.name === 'Maximum')!;
    // The old min/max-quintile version reported ~100% here.
    expect(max.percent).toBeLessThan(5);

    // 120bpm against a 185 max is ~65% — the "Easy" band (60-70%).
    expect(z.zones.find((x) => x.name === 'Easy')!.percent).toBeGreaterThan(80);
    expect(z.dominantZone).toBe(2);
  });

  it('anchors boundaries to a fraction of max, not to the range', () => {
    const values = easyRun();
    const z = calculateZones(values, timestamps(values.length), 'heartRate')!;
    // 50/60/70/80/90/100% of 185
    expect(z.zones[0].min).toBe(93);
    expect(z.zones[0].max).toBe(111);
    expect(z.zones[4].max).toBe(185);
  });

  it('does not move boundaries when the minimum changes', () => {
    const base = easyRun();
    const withLowReading = [...base, 42]; // a dropout-style low reading
    const a = calculateZones(base, undefined, 'heartRate')!;
    const b = calculateZones(withLowReading, undefined, 'heartRate')!;
    expect(b.zones.map((z) => z.min)).toEqual(a.zones.map((z) => z.min));
  });

  it('counts readings below the first boundary in zone 1', () => {
    const values = [...Array(20).fill(80), 200]; // 80 is under 50% of 200
    const z = calculateZones(values, undefined, 'heartRate')!;
    expect(z.zones[0].points).toBe(20);
  });

  it('uses power bands and names for power', () => {
    const values = [...Array(50).fill(250), 300];
    const z = calculateZones(values, undefined, 'power')!;
    expect(z.zones.map((x) => x.name)).toEqual([
      'Recovery', 'Endurance', 'Tempo', 'Threshold', 'Max',
    ]);
    expect(z.zones[0].max).toBe(Math.round(300 * 0.75));
  });

  it('returns null when there is too little data or no spread', () => {
    expect(calculateZones([120, 121], undefined, 'heartRate')).toBeNull();
    expect(calculateZones(Array(50).fill(150), undefined, 'heartRate')).toBeNull();
  });

  it('ignores null and zero readings', () => {
    const values = [...Array(30).fill(140), null, 0, 180];
    const z = calculateZones(values, undefined, 'heartRate')!;
    expect(z.zones.reduce((n, x) => n + x.points, 0)).toBe(31);
  });

  it('weights zone time by the gap between samples', () => {
    // 12 readings 10s apart: first sample counts as 1s, the other 11 as 10s.
    const values = [...Array(11).fill(150), 200];
    const ts = Array.from({ length: 12 }, (_, i) =>
      new Date(Date.UTC(2026, 0, 1, 0, 0, i * 10))
    );
    const z = calculateZones(values, ts, 'heartRate')!;
    expect(z.totalTime).toBe(1 + 11 * 10);
  });
});
