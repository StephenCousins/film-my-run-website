import { describe, expect, it } from 'vitest';
import { dailyCapReached, isQuietSkip, londonDayStart, photoProblem, planSocialRun, switchIsOn, type SocialChoice } from './rules';

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
  it('one a day', () => {
    expect(dailyCapReached(0)).toBe(false);
    expect(dailyCapReached(1)).toBe(true);
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

describe("one news run's stories", () => {
  const at = (h: number) => new Date(`2026-11-26T${String(h).padStart(2, '0')}:00:00Z`);
  const st = (id: number, over: Partial<SocialChoice> = {}): SocialChoice => ({ id, slug: `s${id}`, importance: 5, published_at: at(9), ...photo, ...over });
  const reasons = (p: ReturnType<typeof planSocialRun>) => Object.fromEntries(p.skip.map((x) => [x.story.id, x.reason]));

  it('posts only the newest story with a usable photo; the others are not chosen', () => {
    const p = planSocialRun([st(1, { published_at: at(9) }), st(2, { published_at: at(10) }), st(3, { published_at: at(8) })], false);
    expect(p.post?.id).toBe(2);
    expect(reasons(p)).toEqual({ 1: 'not chosen today', 3: 'not chosen today' });
  });
  it('same publish time: the more important story', () => {
    expect(planSocialRun([st(1, { importance: 6 }), st(2, { importance: 8 }), st(3, { importance: 7 })], false).post?.id).toBe(2);
  });
  it('a newer story without a usable photo does not take the slot', () => {
    const p = planSocialRun([st(1, { published_at: at(9) }), st(2, { published_at: at(10), image_source_width: 800 })], false);
    expect(p.post?.id).toBe(1);
    expect(reasons(p)[2]).toMatch(/^photo too small/);
  });
  it('no usable photo at all: nothing posted, each skip says why', () => {
    const p = planSocialRun([st(1, { image_url: null }), st(2, { photo_credit: null, image_source_width: null })], false);
    expect(p.post).toBeNull();
    expect(reasons(p)).toEqual({ 1: 'no photo', 2: 'branded fallback' });
  });
  it("today's post already out: nothing posted", () => {
    const p = planSocialRun([st(1), st(2, { image_url: null })], true);
    expect(p.post).toBeNull();
    expect(reasons(p)).toEqual({ 1: 'daily cap reached', 2: 'no photo' });
  });
  it('no stories: nothing to do', () => {
    expect(planSocialRun([], false)).toEqual({ post: null, skip: [] });
  });
});

describe('which social outcomes the news email leaves out', () => {
  it('expected skips are quiet', () => {
    for (const r of ['no photo', 'branded fallback', 'photo too small (900px wide, needs 1080)', 'photo too small (source width unknown)', 'daily cap reached', 'not chosen today']) {
      expect(isQuietSkip('skipped', r)).toBe(true);
    }
  });
  it('posted, partial, failed and anything unusual are shown', () => {
    expect(isQuietSkip('posted', null)).toBe(false);
    expect(isQuietSkip('partial', 'Instagram: x')).toBe(false);
    expect(isQuietSkip('failed', 'no photo')).toBe(false);
    expect(isQuietSkip('skipped', "account lock: Instagram account is 'x'; posting switched off")).toBe(false);
    expect(isQuietSkip('skipped', null)).toBe(false);
  });
});
