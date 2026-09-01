import { describe, it, expect } from 'vitest';
import { formatCount, selectStaleIds, STATS_MAX_AGE_MS } from './youtube-stats';

describe('formatCount', () => {
  it('leaves counts under 1000 exact and unsuffixed', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1)).toBe('1');
    expect(formatCount(999)).toBe('999');
  });

  it('formats thousands with one decimal, rounding down', () => {
    expect(formatCount(1000)).toBe('1K+');
    expect(formatCount(1573)).toBe('1.5K+');
    expect(formatCount(1921)).toBe('1.9K+');
    expect(formatCount(4465)).toBe('4.4K+');
    expect(formatCount(9999)).toBe('9.9K+');
  });

  it('drops a trailing .0 rather than printing "4.0K+"', () => {
    expect(formatCount(4001)).toBe('4K+');
    expect(formatCount(2000)).toBe('2K+');
  });

  it('formats ten-thousands and above as whole thousands', () => {
    expect(formatCount(10000)).toBe('10K+');
    expect(formatCount(48827)).toBe('48K+');
    expect(formatCount(61400)).toBe('61K+');
    expect(formatCount(93810)).toBe('93K+');
    expect(formatCount(999999)).toBe('999K+');
  });

  it('formats millions with one decimal, rounding down', () => {
    expect(formatCount(1000000)).toBe('1M+');
    expect(formatCount(7500000)).toBe('7.5M+');
    expect(formatCount(8022632)).toBe('8M+');
    expect(formatCount(12750000)).toBe('12.7M+');
  });

  it('never reports more views than the channel actually has', () => {
    for (const n of [1999, 4999, 9099, 48999, 7999999]) {
      const digits = formatCount(n);
      const multiplier = digits.includes('M') ? 1_000_000 : 1000;
      const claimed = parseFloat(digits) * multiplier;
      expect(claimed).toBeLessThanOrEqual(n);
    }
  });
});

describe('selectStaleIds', () => {
  const now = new Date('2026-09-01T12:00:00Z');
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  it('treats an id with no cached row as stale', () => {
    expect(selectStaleIds(['abc'], [], now)).toEqual(['abc']);
  });

  it('treats a row older than the max age as stale', () => {
    const cached = [{ youtube_id: 'abc', updated_at: daysAgo(8) }];
    expect(selectStaleIds(['abc'], cached, now)).toEqual(['abc']);
  });

  it('leaves a row fresher than the max age alone', () => {
    const cached = [{ youtube_id: 'abc', updated_at: daysAgo(6) }];
    expect(selectStaleIds(['abc'], cached, now)).toEqual([]);
  });

  it('uses a seven day window by default', () => {
    expect(STATS_MAX_AGE_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(selectStaleIds(['a'], [{ youtube_id: 'a', updated_at: daysAgo(7.01) }], now)).toEqual(['a']);
    expect(selectStaleIds(['a'], [{ youtube_id: 'a', updated_at: daysAgo(6.99) }], now)).toEqual([]);
  });

  it('honours an explicit max age', () => {
    const cached = [{ youtube_id: 'abc', updated_at: daysAgo(2) }];
    expect(selectStaleIds(['abc'], cached, now, 24 * 60 * 60 * 1000)).toEqual(['abc']);
  });

  it('returns only the stale ids from a mixed set, in input order', () => {
    const cached = [
      { youtube_id: 'fresh', updated_at: daysAgo(1) },
      { youtube_id: 'old', updated_at: daysAgo(30) },
    ];
    expect(selectStaleIds(['fresh', 'old', 'missing'], cached, now)).toEqual(['old', 'missing']);
  });

  it('deduplicates repeated ids so we never ask YouTube twice', () => {
    expect(selectStaleIds(['abc', 'abc'], [], now)).toEqual(['abc']);
  });
});
