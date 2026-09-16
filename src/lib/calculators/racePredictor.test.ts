import { describe, expect, it } from 'vitest';
import {
  PREDICTOR_TABLES,
  abilityFromMarathon,
  advancedInputFromForm,
  bandExponent,
  percentileFromFatigueFactor,
  predictAdvanced,
  predictQuick,
  predictRoad,
  quickInputFromForm,
  raceById,
  raceCost,
} from './racePredictor';

const H = 3600;
const quick = (over: Partial<Parameters<typeof predictQuick>[0]>) =>
  predictQuick({ knownDistanceKm: 21.0975, knownSeconds: 105 * 60, targetDistanceKm: 42.195, gender: 'male', percentile: 50, ...over })![0];

describe('band exponent', () => {
  it('reads the half → marathon median for a 1:45 half from the 1:45–1:50 band', () => {
    const e = bandExponent('hm', 'mar', 107.5 * 60, 'female', 50)!;
    const band = PREDICTOR_TABLES.roadPairs['hm>mar'].bands.find((b) => b[0] === 105 * 60)!;
    expect(e.k).toBeCloseTo(band[7]!, 6);
    expect(e.outside).toBe(false);
  });
  it('interpolates between band midpoints', () => {
    const a = bandExponent('hm', 'mar', 107.5 * 60, 'male', 50)!.k;
    const b = bandExponent('hm', 'mar', 112.5 * 60, 'male', 50)!.k;
    const mid = bandExponent('hm', 'mar', 110 * 60, 'male', 50)!.k;
    expect(mid).toBeCloseTo((a + b) / 2, 6);
  });
  it('holds the first band below it and flags times outside the table', () => {
    const inside = bandExponent('hm', 'mar', 61 * 60, 'male', 50)!;
    const outside = bandExponent('hm', 'mar', 50 * 60, 'male', 50)!;
    expect(outside.k).toBe(inside.k);
    expect(inside.outside).toBe(false);
    expect(outside.outside).toBe(true);
  });
  it('percentile 25 is a smaller exponent than 75', () => {
    expect(bandExponent('10k', 'mar', 45 * 60, 'male', 25)!.k).toBeLessThan(bandExponent('10k', 'mar', 45 * 60, 'male', 75)!.k);
  });
});

describe('road predictions', () => {
  it('a 1:45 half is about a 4:04 marathon for a typical man, not Riegel’s 3:44', () => {
    const p = quick({});
    expect(p.seconds / H).toBeGreaterThan(4.0);
    expect(p.seconds / H).toBeLessThan(4.1);
    expect(p.method).toBe('band');
    expect(p.factor).toBeGreaterThan(1.15);
    expect(p.lowSeconds).toBeLessThan(p.seconds);
    expect(p.highSeconds).toBeGreaterThan(p.seconds);
    expect(p.confidence).toBe(96);
  });
  it('women slow less than men from the half to the marathon', () => {
    expect(quick({ gender: 'female' }).seconds).toBeLessThan(quick({ gender: 'male' }).seconds);
  });
  it('5K → half is close to Riegel for everyone', () => {
    const p = quick({ knownDistanceKm: 5, knownSeconds: 20 * 60, targetDistanceKm: 21.0975 });
    expect(p.factor).toBeGreaterThan(1.05);
    expect(p.factor).toBeLessThan(1.08);
  });
  it('predicting the shorter race from the longer one inverts the band', () => {
    const marathon = quick({ knownDistanceKm: 10, knownSeconds: 45 * 60, targetDistanceKm: 42.195 }).seconds;
    const back = predictRoad('mar', marathon, '10k', 'male', 50)!;
    expect(back.method).toBe('bandReverse');
    expect(back.seconds).toBeCloseTo(45 * 60, 0);
  });
  it('the same distance returns the known time', () => {
    const p = quick({ targetDistanceKm: 21.0975 });
    expect(p.seconds).toBe(105 * 60);
    expect(p.confidence).toBe(100);
  });
  it('the faster quarter is quicker than typical, which is quicker than the slower quarter', () => {
    expect(quick({ percentile: 25 }).seconds).toBeLessThan(quick({ percentile: 50 }).seconds);
    expect(quick({ percentile: 50 }).seconds).toBeLessThan(quick({ percentile: 75 }).seconds);
  });
  it('flags a soft anchor and a stale one without changing the number', () => {
    const soft = quick({ knownDistanceKm: 5, knownSeconds: 31 * 60, targetDistanceKm: 10 });
    expect(soft.warnings).toContain('softAnchor');
    const stale = quick({ knownAgeYears: 3 });
    expect(stale.warnings).toContain('staleAnchor');
    expect(stale.seconds).toBe(quick({}).seconds);
  });
  it('returns null on empty input', () => {
    expect(predictQuick({ knownDistanceKm: 0, knownSeconds: 0, targetDistanceKm: 10, gender: 'male', percentile: 50 })).toBeNull();
    expect(predictQuick({ knownDistanceKm: 10, knownSeconds: 1800, targetDistanceKm: 0, gender: 'male', percentile: 50 })).toBeNull();
  });
});

describe('ultra predictions', () => {
  it('a 3:07 marathoner on Thames Path 100 is about 21 hours', () => {
    const p = quick({ knownDistanceKm: 42.195, knownSeconds: 3.117 * H, targetDistanceKm: 160.934, target: { raceId: 'thames-path-100' } });
    expect(p.method).toBe('race');
    expect(p.distance).toBe('Thames Path 100');
    expect(p.seconds / H).toBeGreaterThan(20);
    expect(p.seconds / H).toBeLessThan(22);
    expect(p.confidence).toBe(92);
  });
  it('mountain costs more than flat at the same distance', () => {
    const flat = quick({ knownDistanceKm: 42.195, knownSeconds: 3.5 * H, targetDistanceKm: 100, target: { terrain: 'flat' } });
    const mountain = quick({ knownDistanceKm: 42.195, knownSeconds: 3.5 * H, targetDistanceKm: 100, target: { terrain: 'mountain' } });
    expect(mountain.seconds / flat.seconds).toBeGreaterThan(1.4);
    expect(mountain.method).toBe('terrain');
  });
  it('an explicit climb figure is used when given, and road is cheaper than trail', () => {
    const climb = quick({ knownDistanceKm: 42.195, knownSeconds: 3.5 * H, targetDistanceKm: 50, target: { climbPerKm: 60 } });
    expect(climb.method).toBe('climb');
    expect(climb.factor).toBeCloseTo(raceCost(50, 60, 'trail'), 6);
    const road = quick({ knownDistanceKm: 42.195, knownSeconds: 3.5 * H, targetDistanceKm: 50, target: { surface: 'road' } });
    const trail = quick({ knownDistanceKm: 42.195, knownSeconds: 3.5 * H, targetDistanceKm: 50, target: { terrain: 'flat' } });
    expect(road.seconds).toBeLessThan(trail.seconds);
  });
  it('goes through the marathon from a shorter race', () => {
    const p = quick({ knownDistanceKm: 21.0975, knownSeconds: 100 * 60, targetDistanceKm: 100 });
    const marathon = quick({ knownDistanceKm: 21.0975, knownSeconds: 100 * 60, targetDistanceKm: 42.195 }).seconds;
    expect(p.seconds).toBeCloseTo(Math.exp(abilityFromMarathon(marathon) + p.factor), 3);
    expect(p.isUltra).toBe(true);
  });
  it('a known ultra gives the ability directly, so the same race predicts itself', () => {
    const p = quick({ knownDistanceKm: 80, knownSeconds: 11 * H, known: { raceId: 'lakeland-50' }, targetDistanceKm: 80, target: { raceId: 'lakeland-50' } });
    expect(p.seconds).toBeCloseTo(11 * H, 3);
    const hundred = quick({ knownDistanceKm: 80, knownSeconds: 11 * H, known: { raceId: 'lakeland-50' }, targetDistanceKm: 169, target: { raceId: 'lakeland-100' } });
    expect(hundred.seconds / H).toBeGreaterThan(26);
    expect(hundred.seconds / H).toBeLessThan(34);
  });
  it('the range is the middle half around the typical runner whatever the percentile', () => {
    const a = quick({ knownDistanceKm: 42.195, knownSeconds: 3.5 * H, targetDistanceKm: 100, percentile: 25 });
    const b = quick({ knownDistanceKm: 42.195, knownSeconds: 3.5 * H, targetDistanceKm: 100, percentile: 75 });
    expect(a.lowSeconds).toBeCloseTo(b.lowSeconds, 3);
    expect(a.seconds).toBeLessThan(b.seconds);
  });
  it('the race table has the Centurion hundreds with costs that order as the runners do', () => {
    const tp = raceById('thames-path-100')!;
    const sdw = raceById('south-downs-way-100')!;
    const ndw = raceById('north-downs-way-100')!;
    expect(tp.cost).toBeLessThan(sdw.cost);
    expect(sdw.cost).toBeLessThan(ndw.cost);
  });
});

describe('forms and compatibility', () => {
  it('maps the old levels onto the measured spread', () => {
    expect(percentileFromFatigueFactor(1.04)).toBe(25);
    expect(percentileFromFatigueFactor(1.06)).toBe(50);
    expect(percentileFromFatigueFactor(1.08)).toBe(50);
    expect(percentileFromFatigueFactor(1.1)).toBe(75);
    expect(quickInputFromForm({ knownDistance: '10', knownTime: { hours: '0', minutes: '50', seconds: '0' }, targetDistance: '42.195', experience: '1.1', gender: 'male' }).percentile).toBe(75);
    expect(quickInputFromForm({ knownDistance: '10', knownTime: { hours: '0', minutes: '50', seconds: '0' }, targetDistance: '42.195', experience: '25', gender: 'male' }).percentile).toBe(25);
  });
  it('reads the ultra target from the form', () => {
    const i = quickInputFromForm({ knownDistance: '42.195', knownTime: { hours: '3', minutes: '30', seconds: '0' }, targetDistance: '100', experience: '50', gender: 'female', targetTerrain: 'mountain', targetSurface: 'trail', targetClimbPerKm: '' });
    expect(i.target).toEqual({ terrain: 'mountain', surface: 'trail' });
  });
});

describe('advanced: two anchors', () => {
  const input = advancedInputFromForm({ race1Distance: '10', race1Time: { hours: '0', minutes: '50', seconds: '0' }, race2Distance: '21.0975', race2Time: { hours: '1', minutes: '50', seconds: '0' }, gender: 'male' });
  it('predicts each target from the nearer race and cross-checks with the other', () => {
    const out = predictAdvanced(input)!;
    expect(out).toHaveLength(8);
    const tenK = out.find((p) => p.distance === '10K')!;
    expect(tenK.seconds).toBe(50 * 60);
    expect(tenK.anchor).toBe(1);
    const marathon = out.find((p) => p.distance === 'Marathon')!;
    expect(marathon.anchor).toBe(2);
    expect(marathon.crossCheckSeconds).not.toBeNull();
    expect(marathon.seconds / H).toBeGreaterThan(3.9);
    expect(marathon.seconds / H).toBeLessThan(4.3);
  });
  it('needs both races and the right order, nothing else', () => {
    expect(predictAdvanced({ ...input, race2Seconds: 0 })).toBeNull();
    expect(predictAdvanced({ ...input, race1DistanceKm: 42.195 })).toBeNull();
  });
});

describe('non-standard road distances', () => {
  it('interpolates a 7 km target between 5K and 10K and flags it', () => {
    const p = predictQuick({ knownDistanceKm: 5, knownSeconds: 20 * 60, targetDistanceKm: 7, gender: 'male', percentile: 50 })![0];
    const five = 20 * 60;
    const ten = predictQuick({ knownDistanceKm: 5, knownSeconds: 20 * 60, targetDistanceKm: 10, gender: 'male', percentile: 50 })![0].seconds;
    expect(p.seconds).toBeGreaterThan(five * 1.4);
    expect(p.seconds).toBeLessThan(ten * 0.72);
    expect(p.warnings).toContain('nonStandardDistance');
  });
  it('standardises a 7 km known race onto the nearer standard distance', () => {
    const p = predictQuick({ knownDistanceKm: 7, knownSeconds: 30 * 60, targetDistanceKm: 21.0975, gender: 'female', percentile: 50 })![0];
    const fromFive = predictQuick({ knownDistanceKm: 5, knownSeconds: 30 * 60 * Math.pow(5 / 7, PREDICTOR_TABLES.roadPairs['5k>10k'].median), targetDistanceKm: 21.0975, gender: 'female', percentile: 50 })![0];
    expect(p.seconds).toBeCloseTo(fromFive.seconds, 3);
    expect(p.warnings).toContain('nonStandardDistance');
  });
});
