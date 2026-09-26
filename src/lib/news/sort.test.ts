import { describe, expect, it } from 'vitest';
import { passesSort, isBorderline, sortItem } from './sort';
import type { Candidate, Verdict } from './types';

const v = (over: Partial<Verdict>): Verdict => ({ type: 'news', confidence: 0.95, isRunning: true, topic: 'trail_ultra', isUk: false, importance: 7, ...over });
const c: Candidate = { articleId: 1, url: 'https://x.test/a', source: 'iRunFar', title: 'T', pubDate: new Date(), summary: 's', text: 'full', imageUrl: null, photoCredit: null };

describe('sorting', () => {
  it('passes only running news at 0.90 or more', () => {
    expect(passesSort(v({}))).toBe(true);
    expect(passesSort(v({ confidence: 0.89 }))).toBe(false);
    expect(passesSort(v({ type: 'review' }))).toBe(false);
    expect(passesSort(v({ isRunning: false }))).toBe(false);
    expect(passesSort(null)).toBe(false);
  });
  it('marks news at 0.50-0.90 as borderline for the log', () => {
    expect(isBorderline(v({ confidence: 0.7 }))).toBe(true);
    expect(isBorderline(v({ confidence: 0.95 }))).toBe(false);
    expect(isBorderline(v({ type: 'opinion', confidence: 0.7 }))).toBe(false);
  });
  it('a reply that is not a verdict gives null, not a throw', async () => {
    const call = async () => ({ data: null, costUsd: 0.001, raw: 'nope' });
    const r = await sortItem(c, call as never);
    expect(r.verdict).toBeNull();
    expect(r.costUsd).toBe(0.001);
  });
  it('a confidence outside [0, 1] fails closed', async () => {
    const call = async () => ({ data: v({ confidence: 1.5 }), costUsd: 0.001, raw: '' });
    const r = await sortItem(c, call as never);
    expect(r.verdict).toBeNull();
  });
});
