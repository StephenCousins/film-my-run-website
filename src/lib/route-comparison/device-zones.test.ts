import { describe, it, expect } from 'vitest';
import { calculateZones } from './analysis';
import { buildHrZoneBoundaries, buildPowerZoneBoundaries } from './file-parser';

/**
 * The website used to anchor zone boundaries to the *observed* maximum of the
 * activity, on the stated grounds that "we have no recorded max HR or FTP".
 * FIT files carry both. On a 103 km easy ultra the observed max was 152
 * against a true max of 178, which reported 15.9% at Threshold and 3.3% at
 * Maximum for a run the device scored as 0% and 0%.
 */

describe('buildHrZoneBoundaries', () => {
  it('prefers the exact boundaries the device recorded', () => {
    const boundaries = buildHrZoneBoundaries({
      time_in_zone: [{ hr_zone_high_boundary: [120, 135, 150, 165, 180] }],
      zones_target: { max_heart_rate: 177, hr_calc_type: 'percent_hrr' },
      user_profile: { resting_heart_rate: 40 },
    });

    expect(boundaries?.map((b) => b.high)).toEqual([120, 135, 150, 165, 180]);
  });

  it('falls back to explicit hr_zone messages, ordered by message index', () => {
    const boundaries = buildHrZoneBoundaries({
      hr_zone: [
        { message_index: 2, high_bpm: 150 },
        { message_index: 0, high_bpm: 120 },
        { message_index: 1, high_bpm: 135 },
      ],
    });

    expect(boundaries?.map((b) => b.high)).toEqual([120, 135, 150]);
  });

  it('computes percent-of-HRR boundaries from zones_target and resting HR', () => {
    // max 177, resting 40 -> HRR 137; 60/70/80/90/100% above resting.
    const boundaries = buildHrZoneBoundaries({
      zones_target: { max_heart_rate: 177, hr_calc_type: 'percent_hrr' },
      user_profile: { resting_heart_rate: 40 },
    });

    expect(boundaries?.map((b) => b.high)).toEqual([122, 136, 150, 163, 177]);
    expect(boundaries?.map((b) => b.name)).toEqual([
      'Warm Up', 'Easy', 'Aerobic', 'Threshold', 'Maximum',
    ]);
  });

  it('computes percent-of-max when there is no resting heart rate', () => {
    const boundaries = buildHrZoneBoundaries({
      zones_target: { max_heart_rate: 180, hr_calc_type: 'percent_max_hr' },
    });

    expect(boundaries?.map((b) => b.high)).toEqual([108, 126, 144, 162, 180]);
  });

  it('returns null when the file carries no zone information at all', () => {
    expect(buildHrZoneBoundaries({})).toBeNull();
    expect(buildHrZoneBoundaries({ zones_target: {} })).toBeNull();
  });
});

describe('buildPowerZoneBoundaries', () => {
  it('computes boundaries from functional threshold power', () => {
    const boundaries = buildPowerZoneBoundaries({
      zones_target: { functional_threshold_power: 400, pwr_calc_type: 'percent_ftp' },
    });

    // 55/75/90/105/120% of FTP.
    expect(boundaries?.map((b) => b.high)).toEqual([220, 300, 360, 420, 480]);
  });

  it('returns null without an FTP', () => {
    expect(buildPowerZoneBoundaries({ zones_target: {} })).toBeNull();
  });
});

describe('calculateZones with device boundaries', () => {
  /** 600 samples at 115-119 bpm — comfortably inside Warm Up — plus one
   *  surge to 166, which is what an observed-max anchor would latch onto. */
  const easyRun = () => {
    const values: number[] = [];
    for (let i = 0; i < 600; i++) values.push(115 + (i % 5));
    values.push(166);
    return values;
  };

  const deviceBoundaries = [
    { high: 122, name: 'Warm Up' },
    { high: 136, name: 'Easy' },
    { high: 150, name: 'Aerobic' },
    { high: 163, name: 'Threshold' },
    { high: 177, name: 'Maximum' },
  ];

  it('uses the supplied boundaries instead of the observed maximum', () => {
    const z = calculateZones(easyRun(), undefined, 'heartRate', deviceBoundaries)!;

    expect(z.zones.map((x) => x.max)).toEqual([122, 136, 150, 163, 177]);
  });

  it('does not push an easy run up into harder zones', () => {
    // One surge to 166 drags the observed-max anchor up with it, and the
    // steady 115-119 bpm body of the run lands in Aerobic. Against the
    // device's real bands the same run reads as Warm Up, which is what it was.
    const values = easyRun();
    const anchored = calculateZones(values, undefined, 'heartRate')!;
    const device = calculateZones(values, undefined, 'heartRate', deviceBoundaries)!;

    expect(device.dominantZone).toBe(1);
    expect(device.zones.find((x) => x.name === 'Warm Up')!.percent).toBeGreaterThan(95);

    expect(anchored.dominantZone).toBe(3);
    expect(anchored.zones.find((x) => x.name === 'Warm Up')!.percent).toBeLessThan(5);
  });

  it('keeps boundaries fixed regardless of what the activity reached', () => {
    const easy = calculateZones(easyRun(), undefined, 'heartRate', deviceBoundaries)!;
    const hard = calculateZones(
      [...easyRun(), ...Array(200).fill(170)],
      undefined,
      'heartRate',
      deviceBoundaries
    )!;

    expect(hard.zones.map((z) => z.max)).toEqual(easy.zones.map((z) => z.max));
  });

  it('falls back to the observed-max bands when no boundaries are supplied', () => {
    // GPX files carry no zone data, so the old behaviour has to survive.
    const z = calculateZones(easyRun(), undefined, 'heartRate')!;
    expect(z.zones[4].max).toBe(166);
  });
});
