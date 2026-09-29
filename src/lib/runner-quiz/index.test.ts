import { describe, it, expect } from 'vitest';
import { QUIZ, scoreAnswers, rankTypes, result, parseScores, typeById, type AxisId, type Scores } from './index';

const AXES: AxisId[] = ['S', 'M', 'D', 'R'];

// Per question, the answer whose deltas best align with the type's direction (target - 50).
// That alone pushes every axis to its extreme, which overshoots mid-range targets (Lab Rat's
// road/trail 55 lands on Marathon Hunter, Free Runner lands on Ultra Wanderer), so then change
// one answer at a time while it brings the scores closer to the target.
function persona(target: Scores): number[] {
  let ans = QUIZ.questions.map((q) => {
    const score = (i: number) => AXES.reduce((s, a, k) => s + (q.answers[i].scores[a] ?? 0) * (target[k] - 50), 0);
    return [0, 1, 2, 3].reduce((best, i) => (score(i) > score(best) ? i : best), 0);
  });
  const dist = (a: number[]) => Math.hypot(...scoreAnswers(a).map((v, k) => v - target[k]));
  for (let improved = true; improved; ) {
    improved = false;
    for (let qi = 0; qi < ans.length; qi++) {
      for (let i = 0; i < 4; i++) {
        const next = ans.map((v, j) => (j === qi ? i : v));
        if (dist(next) < dist(ans)) [ans, improved] = [next, true];
      }
    }
  }
  return ans;
}

// Small seeded PRNG (mulberry32) so the balance test is repeatable.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('runner quiz scoring', () => {
  it('has 12 questions of 4 answers and 12 types', () => {
    expect(QUIZ.questions).toHaveLength(12);
    QUIZ.questions.forEach((q) => expect(q.answers).toHaveLength(4));
    expect(QUIZ.types).toHaveLength(12);
  });

  it.each(QUIZ.types.map((t) => [t.id, t] as const))('%s persona answers give that type', (_id, t) => {
    const r = result(persona(t.target));
    expect(r.type.id).toBe(t.id);
    expect(r.second.id).not.toBe(t.id);
  });

  it('random answers spread across every type', () => {
    const rand = rng(1);
    const counts = new Map<string, number>();
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const id = result(QUIZ.questions.map(() => Math.floor(rand() * 4))).type.id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const t of QUIZ.types) {
      const share = (counts.get(t.id) ?? 0) / n;
      expect(share, t.id).toBeGreaterThanOrEqual(0.01);
      expect(share, t.id).toBeLessThanOrEqual(0.25);
    }
  });

  it('scores are integers from 0 to 100', () => {
    const s = scoreAnswers(Array(12).fill(0));
    expect(s).toHaveLength(4);
    s.forEach((v) => {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });

  it('rejects the wrong number of answers or out-of-range answers', () => {
    expect(() => scoreAnswers([])).toThrow();
    expect(() => scoreAnswers(Array(11).fill(0))).toThrow();
    expect(() => scoreAnswers(Array(13).fill(0))).toThrow();
    expect(() => scoreAnswers([...Array(11).fill(0), 4])).toThrow();
    expect(() => scoreAnswers([...Array(11).fill(0), -1])).toThrow();
    expect(() => scoreAnswers([...Array(11).fill(0), 1.5])).toThrow();
  });

  it('rankTypes returns every type, nearest first', () => {
    const ranked = rankTypes([90, 80, 95, 90]);
    expect(ranked).toHaveLength(12);
    expect(ranked[0].id).toBe('track');
  });
});

describe('parseScores', () => {
  it('parses four 0-100 integers', () => {
    expect(parseScores('18-29-45-64')).toEqual([18, 29, 45, 64]);
    expect(parseScores('0-100-0-100')).toEqual([0, 100, 0, 100]);
  });
  it.each(['', '1-2-3', '1-2-3-4-5', '1-2-3-101', 'a-b-c-d', '1-2-3--4', '1.5-2-3-4', ' 1-2-3-4', '1-2-3-4\n'])(
    'rejects %j',
    (s) => expect(parseScores(s)).toBeNull()
  );
  it('rejects null and undefined', () => {
    expect(parseScores(null)).toBeNull();
    expect(parseScores(undefined)).toBeNull();
  });
});

describe('typeById', () => {
  it('finds a type and misses junk', () => {
    expect(typeById('fell')?.name).toBe('Fell Runner');
    expect(typeById('nope')).toBeUndefined();
  });
});
