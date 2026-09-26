import { describe, expect, it } from 'vitest';
import { confidenceHistogram, confusion, passesAt } from './sorter-check';
import type { SorterRow } from './sorter-check';
import type { Verdict } from './types';

const v = (over: Partial<Verdict>): Verdict => ({ type: 'news', confidence: 0.95, isRunning: true, topic: 'trail_ultra', isUk: false, importance: 7, ...over });
const row = (over: Partial<SorterRow>): SorterRow => ({ id: 1, isNews: true, source: 'iRunFar', title: 'T', verdict: v({}), costUsd: 0.001, ...over });

describe('passesAt', () => {
  it('mirrors passesSort but at an arbitrary threshold', () => {
    expect(passesAt(v({ confidence: 0.86 }), 0.85)).toBe(true);
    expect(passesAt(v({ confidence: 0.84 }), 0.85)).toBe(false);
    expect(passesAt(v({ type: 'review' }), 0.5)).toBe(false);
    expect(passesAt(null, 0.5)).toBe(false);
  });
});

describe('confusion', () => {
  it('sorts labelled rows into the four cells and counts nulls', () => {
    const rows: SorterRow[] = [
      row({ id: 1, isNews: true, verdict: v({ confidence: 0.95 }) }), // true pass
      row({ id: 2, isNews: true, verdict: v({ confidence: 0.5 }) }), // missed
      row({ id: 3, isNews: false, verdict: v({ confidence: 0.95 }) }), // false pass
      row({ id: 4, isNews: false, verdict: v({ type: 'preview' }) }), // true reject
      row({ id: 5, isNews: true, verdict: null }), // missed + null
    ];
    const r = confusion(rows, 0.9);
    expect(r.truePass).toBe(1);
    expect(r.trueReject).toBe(1);
    expect(r.falsePass.map((x) => x.id)).toEqual([3]);
    expect(r.missed.map((x) => x.id)).toEqual([2, 5]);
    expect(r.nullVerdicts).toBe(1);
  });

  it('excludes unsure rows entirely', () => {
    const rows: SorterRow[] = [
      row({ id: 1, isNews: false, unsure: true, verdict: v({ confidence: 0.99 }) }),
    ];
    const r = confusion(rows, 0.9);
    expect(r.truePass + r.trueReject + r.falsePass.length + r.missed.length).toBe(0);
  });
});

describe('confidenceHistogram', () => {
  it('buckets news-typed verdicts by 0.1 and splits by label', () => {
    const rows: SorterRow[] = [
      row({ isNews: true, verdict: v({ confidence: 0.93 }) }),
      row({ isNews: false, verdict: v({ confidence: 0.91 }) }),
      row({ isNews: true, unsure: true, verdict: v({ confidence: 0.95 }) }),
      row({ isNews: true, verdict: v({ type: 'preview', confidence: 0.9 }) }), // not news-typed, ignored
      row({ isNews: true, verdict: null }), // no verdict, ignored
    ];
    const h = confidenceHistogram(rows);
    const bucket = h.find((b) => b.bucket === '0.9-1.0')!;
    expect(bucket.news).toBe(1);
    expect(bucket.notNews).toBe(1);
    expect(bucket.unsure).toBe(1);
    expect(h.reduce((s, b) => s + b.news + b.notNews + b.unsure, 0)).toBe(3);
  });

  it('confidence of exactly 1 lands in the top bucket, not off the end', () => {
    const rows: SorterRow[] = [row({ verdict: v({ confidence: 1 }) })];
    const h = confidenceHistogram(rows);
    expect(h[9].news).toBe(1);
  });
});
