import { describe, it, expect } from 'vitest';
import {
  parseTimeToSeconds,
  secondsToTimeStr,
  getPercentile,
  getAbilityLevel,
  getRatingMessage,
  compareToAverages,
} from './comparisons';

describe('parseTimeToSeconds', () => {
  it('parses mm:ss format', () => {
    expect(parseTimeToSeconds('25:30')).toBe(1530);
  });

  it('parses h:mm:ss format', () => {
    expect(parseTimeToSeconds('1:30:00')).toBe(5400);
  });

  it('returns null for empty string', () => {
    expect(parseTimeToSeconds('')).toBeNull();
  });

  it('returns null for double dash', () => {
    expect(parseTimeToSeconds('--')).toBeNull();
  });

  it('handles trailing letter (e.g. "25:30s")', () => {
    expect(parseTimeToSeconds('25:30s')).toBe(1530);
  });
});

describe('secondsToTimeStr', () => {
  it('formats sub-hour times as mm:ss', () => {
    expect(secondsToTimeStr(1530)).toBe('25:30');
  });

  it('formats hour+ times as h:mm:ss', () => {
    expect(secondsToTimeStr(5400)).toBe('1:30:00');
  });

  it('pads minutes and seconds with zeros', () => {
    expect(secondsToTimeStr(3661)).toBe('1:01:01');
  });

  it('handles exact minutes', () => {
    expect(secondsToTimeStr(1200)).toBe('20:00');
  });
});

describe('getPercentile', () => {
  it('returns very high percentile for fast 5K', () => {
    // Sub 15 minutes = top 0.1%
    expect(getPercentile(890, '5k')).toBe(99.9);
  });

  it('returns ~50 percentile for median 5K', () => {
    // ~34 minutes = median
    expect(getPercentile(2040, '5k')).toBe(50);
  });

  it('returns low percentile for slow time', () => {
    // Over 60 minutes
    expect(getPercentile(3700, '5k')).toBe(1);
  });

  it('works for marathon distance', () => {
    // Sub 3:00 marathon = top 3%
    expect(getPercentile(10800, 'marathon')).toBe(97);
  });
});

describe('getAbilityLevel', () => {
  it('returns elite for very fast runner', () => {
    expect(getAbilityLevel(1000, 30, 'male')).toBe('elite');
  });

  it('returns beginner for slow time', () => {
    expect(getAbilityLevel(2500, 30, 'male')).toBe('beginner');
  });

  it('adjusts for age', () => {
    // Same time at 70 should be a better level than at 20
    const level20 = getAbilityLevel(1600, 20, 'male');
    const level70 = getAbilityLevel(1600, 70, 'male');
    // At 20, 1600s is novice; at 70, elite threshold is 1558s so 1600s is advanced
    expect(level20).toBe('novice');
    expect(level70).toBe('advanced');
  });
});

describe('getRatingMessage', () => {
  it('returns encouraging message for high percentile', () => {
    const msg = getRatingMessage(99);
    expect(msg).toContain('fastest');
  });

  it('returns encouraging message for low percentile', () => {
    const msg = getRatingMessage(10);
    expect(msg).toContain('great');
  });
});

describe('compareToAverages', () => {
  it('returns comparisons for all parkrun averages', () => {
    const results = compareToAverages(1500);
    expect(results.length).toBe(4);
    expect(results[0].category).toBe('Parkrun');
  });

  it('marks faster when user is faster than average', () => {
    // 1200s = 20:00, faster than all parkrun averages
    const results = compareToAverages(1200);
    results.forEach((r) => {
      expect(r.faster).toBe(true);
    });
  });

  it('marks not faster when user is slower than average', () => {
    // 3600s = 60:00, slower than all parkrun averages
    const results = compareToAverages(3600);
    results.forEach((r) => {
      expect(r.faster).toBe(false);
    });
  });
});
