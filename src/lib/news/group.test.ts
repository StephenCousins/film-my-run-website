import { describe, expect, it } from 'vitest';
import { bundleImportance, groupItems } from './group';
import type { Candidate, Verdict } from './types';

const cand = (id: number): Candidate => ({ articleId: id, url: `https://x.test/${id}`, source: 'S', title: `T${id}`, pubDate: new Date(), summary: '', text: 't', imageUrl: null, photoCredit: null });
const v = (importance: number, isUk = false): Verdict => ({ type: 'news', confidence: 0.95, isRunning: true, topic: 'trail_ultra', isUk, importance });

describe('grouping', () => {
  it("builds bundles from the model's groups and drops unknown ids", async () => {
    const call = async () => ({ costUsd: 0.002, raw: '', data: { groups: [
      { key: 'utmb-2026-result', headline: 'UTMB result', articleIds: [1, 2, 99], alreadyCovered: false },
      { key: 'london-preview', headline: 'London preview', articleIds: [3], alreadyCovered: true },
    ] } });
    const r = await groupItems([{ c: cand(1), v: v(9) }, { c: cand(2), v: v(8) }, { c: cand(3), v: v(5) }], ['London Marathon preview'], call as never);
    expect(r.bundles).toHaveLength(2);
    expect(r.bundles[0].items.map((i) => i.articleId)).toEqual([1, 2]);
    expect(r.bundles[1].alreadyCovered).toBe(true);
  });
  it('an articleId in more than one group stays only in the first', async () => {
    const call = async () => ({ costUsd: 0.002, raw: '', data: { groups: [
      { key: 'first', headline: 'First', articleIds: [1], alreadyCovered: false },
      { key: 'second', headline: 'Second', articleIds: [1], alreadyCovered: false },
    ] } });
    const r = await groupItems([{ c: cand(1), v: v(9) }], [], call as never);
    expect(r.bundles).toHaveLength(1);
    expect(r.bundles[0].key).toBe('first');
    expect(r.bundles[0].items.map((i) => i.articleId)).toEqual([1]);
  });
  it('a bundle is as important as its most important item, plus 1 for UK', () => {
    expect(bundleImportance({ key: 'k', headline: 'h', items: [], verdicts: [v(6), v(8)], alreadyCovered: false })).toBe(8);
    expect(bundleImportance({ key: 'k', headline: 'h', items: [], verdicts: [v(6, true)], alreadyCovered: false })).toBe(7);
  });
});
