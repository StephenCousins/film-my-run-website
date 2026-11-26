import { describe, expect, it } from 'vitest';
import { dailyCapReached, londonDayStart, photoProblem, switchIsOn } from './rules';

const photo = { image_url: 'https://r2.test/news/x.webp', photo_credit: 'Photo: Jane / iRunFar', image_source_width: 1600 };

describe('the photo rule', () => {
  it('a real photo at least 1080px wide is fine', () => {
    expect(photoProblem(photo)).toBeNull();
    expect(photoProblem({ ...photo, image_source_width: 1080 })).toBeNull();
  });
  it('no photo, the branded fallback, or under 1080px wide: no post', () => {
    expect(photoProblem({ ...photo, image_url: null })).toBe('no photo');
    // storyImage's fallback card and news:publish's card both leave photo_credit null.
    expect(photoProblem({ ...photo, photo_credit: null, image_source_width: null })).toBe('branded fallback');
    expect(photoProblem({ ...photo, image_source_width: 1079 })).toMatch(/^photo too small/);
    // Stored at 1200x675 whatever the source was: an unknown source width is not trusted.
    expect(photoProblem({ ...photo, image_source_width: null })).toMatch(/^photo too small/);
  });
});

describe('the daily cap', () => {
  it('three a day', () => {
    expect(dailyCapReached(2)).toBe(false);
    expect(dailyCapReached(3)).toBe(true);
  });
  it('counts from London midnight, in summer (BST) and winter (GMT)', () => {
    // 00:30 BST on 2 July is still 1 July in UTC: the day began at 23:00 UTC.
    expect(londonDayStart(new Date('2026-07-01T23:30:00Z')).toISOString()).toBe('2026-07-01T23:00:00.000Z');
    // 23:30 BST on 1 July: the same London day began the previous evening UTC.
    expect(londonDayStart(new Date('2026-07-01T22:30:00Z')).toISOString()).toBe('2026-06-30T23:00:00.000Z');
    expect(londonDayStart(new Date('2026-11-26T00:30:00Z')).toISOString()).toBe('2026-11-26T00:00:00.000Z');
    expect(londonDayStart(new Date('2026-11-25T23:59:00Z')).toISOString()).toBe('2026-11-25T00:00:00.000Z');
  });
});

describe('the on/off switch', () => {
  it('is on only when set to true; missing or anything else is off', () => {
    expect(switchIsOn(true)).toBe(true);
    expect(switchIsOn({ enabled: true })).toBe(true);
    for (const v of [undefined, null, false, 'true', 1, { enabled: 'yes' }]) expect(switchIsOn(v)).toBe(false);
  });
});
