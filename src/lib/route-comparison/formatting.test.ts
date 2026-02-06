import { describe, it, expect } from 'vitest';
import {
  formatDistance,
  formatElevation,
  formatDuration,
  formatPace,
  formatTimeDelta,
  formatHeartRate,
  getDistanceLabel,
  formatSplitElevation,
} from './formatting';

describe('formatDistance', () => {
  it('formats distances >= 1km with two decimals', () => {
    expect(formatDistance(5.123)).toBe('5.12 km');
  });

  it('formats distances < 1km in meters', () => {
    expect(formatDistance(0.5)).toBe('500 m');
  });

  it('formats exactly 1km', () => {
    expect(formatDistance(1)).toBe('1.00 km');
  });
});

describe('formatElevation', () => {
  it('rounds to nearest meter', () => {
    expect(formatElevation(123.7)).toBe('124 m');
  });

  it('handles zero', () => {
    expect(formatElevation(0)).toBe('0 m');
  });
});

describe('formatDuration', () => {
  it('returns N/A for null', () => {
    expect(formatDuration(null)).toBe('N/A');
  });

  it('returns N/A for zero', () => {
    expect(formatDuration(0)).toBe('N/A');
  });

  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2m 5s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3665)).toBe('1h 1m');
  });
});

describe('formatPace', () => {
  it('returns N/A for null', () => {
    expect(formatPace(null)).toBe('N/A');
  });

  it('returns N/A for NaN', () => {
    expect(formatPace(NaN)).toBe('N/A');
  });

  it('returns N/A for pace over 20', () => {
    expect(formatPace(21)).toBe('N/A');
  });

  it('returns N/A for zero or negative', () => {
    expect(formatPace(0)).toBe('N/A');
    expect(formatPace(-1)).toBe('N/A');
  });

  it('formats valid pace', () => {
    expect(formatPace(5.5)).toBe('5:30 /km');
  });

  it('pads seconds with leading zero', () => {
    expect(formatPace(6.083333)).toBe('6:05 /km');
  });
});

describe('formatTimeDelta', () => {
  it('returns N/A for null', () => {
    expect(formatTimeDelta(null)).toBe('N/A');
  });

  it('formats positive delta with plus sign', () => {
    expect(formatTimeDelta(65)).toBe('+1:05');
  });

  it('formats negative delta with minus sign', () => {
    expect(formatTimeDelta(-30)).toBe('-30s');
  });

  it('formats zero as positive', () => {
    expect(formatTimeDelta(0)).toBe('+0s');
  });
});

describe('formatHeartRate', () => {
  it('returns N/A for null', () => {
    expect(formatHeartRate(null)).toBe('N/A');
  });

  it('formats valid heart rate', () => {
    expect(formatHeartRate(155)).toBe('155 bpm');
  });
});

describe('getDistanceLabel', () => {
  it('returns Half Marathon for 21.0975km', () => {
    expect(getDistanceLabel(21.0975)).toBe('Half Marathon');
  });

  it('returns Marathon for 42.195km', () => {
    expect(getDistanceLabel(42.195)).toBe('Marathon');
  });

  it('returns meters for sub-km distances', () => {
    expect(getDistanceLabel(0.4)).toBe('400m');
  });

  it('returns km for standard distances', () => {
    expect(getDistanceLabel(10)).toBe('10km');
  });
});

describe('formatSplitElevation', () => {
  it('returns N/A for null', () => {
    expect(formatSplitElevation(null)).toBe('N/A');
  });

  it('formats positive elevation with plus sign', () => {
    expect(formatSplitElevation(15.3)).toBe('+15m');
  });

  it('formats negative elevation with minus sign', () => {
    expect(formatSplitElevation(-8.7)).toBe('-9m');
  });
});
