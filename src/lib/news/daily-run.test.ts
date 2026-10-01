import { describe, it, expect } from 'vitest';
import { isCompletedDailyRun, londonMidnight } from './daily-run';

describe('isCompletedDailyRun', () => {
  it('counts a normal run', () => expect(isCompletedDailyRun({ published: [] })).toBe(true));
  it('rejects failed, on-demand, monthly and empty', () => {
    expect(isCompletedDailyRun({ error: 'boom' })).toBe(false);
    expect(isCompletedDailyRun({ onDemand: true })).toBe(false);
    expect(isCompletedDailyRun({ monthlyRefresh: {} })).toBe(false);
    expect(isCompletedDailyRun(null)).toBe(false);
  });
});
describe('londonMidnight', () => {
  it('BST starts the previous UTC evening', () => expect(londonMidnight('2026-07-01').toISOString()).toBe('2026-06-30T23:00:00.000Z'));
  it('GMT is UTC midnight', () => expect(londonMidnight('2026-12-01').toISOString()).toBe('2026-12-01T00:00:00.000Z'));
});
