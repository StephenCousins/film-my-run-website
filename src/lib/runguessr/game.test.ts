import { describe, expect, it } from 'vitest';
import { EMPTY_STATS, liveStreak, pickRounds, puzzleNumber, record, roundScore, seedFor, shareText, type Race, type RaceData } from './game';

const race = (id: string, extra: Partial<Race> = {}): Race => ({
  id, name: id.toUpperCase(), country: 'UK', type: 'trail ultra', month: 'Jun', km: 100, gain: 3000, route: null, hook: null,
  outline: [[0, 0], [1, 1]], profile: [1, 2, 3], photos: [{ src: `${id}.jpg`, quiz: true, page: '', license: 'CC BY', credit: 'x' }], ...extra,
});
const data: RaceData = {
  courses: Array.from({ length: 12 }, (_, i) => race(`r${i}`, i % 3 === 0 ? { type: 'road marathon', profile: null } : {})),
  all: Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, name: `R${i}` })),
};

describe('pickRounds', () => {
  it('gives the same five for the same date, and a different five another day', () => {
    const a = pickRounds(data, seedFor('2026-11-11')).map((r) => r.race.id);
    expect(pickRounds(data, seedFor('2026-11-11')).map((r) => r.race.id)).toEqual(a);
    expect(pickRounds(data, seedFor('2026-11-12')).map((r) => r.race.id)).not.toEqual(a);
  });

  it('never repeats a race, includes the answer once in four options, and only shows profiles that exist', () => {
    const rounds = pickRounds(data, seedFor('2026-12-25'));
    expect(rounds).toHaveLength(5);
    expect(new Set(rounds.map((r) => r.race.id)).size).toBe(5);
    for (const r of rounds) {
      expect(r.options).toHaveLength(4);
      expect(r.options.filter((o) => o.id === r.race.id)).toHaveLength(1);
      if (r.mode === 'profile') expect(r.race.profile).not.toBeNull();
      if (r.mode === 'photo') expect(r.photo?.quiz).toBe(true);
    }
  });
});

describe('scoring and record', () => {
  it('takes 200 a clue and nothing for a miss', () => {
    expect(roundScore(true, 0)).toBe(1000);
    expect(roundScore(true, 2)).toBe(600);
    expect(roundScore(false, 0)).toBe(0);
  });

  it('counts a day once and keeps a streak across consecutive days', () => {
    let s = record(EMPTY_STATS, 1, 3000);
    s = record(s, 2, 4000);
    expect(record(s, 2, 5000)).toBe(s);
    expect(s).toMatchObject({ played: 2, streak: 2, bestScore: 4000, totalScore: 7000 });
    expect(record(s, 4, 1000).streak).toBe(1);
    expect(liveStreak(s, 3)).toBe(2);
    expect(liveStreak(s, 4)).toBe(0);
  });

  it('numbers puzzles from launch day', () => {
    expect(puzzleNumber('2026-11-11')).toBe(1);
    expect(puzzleNumber('2026-11-12')).toBe(2);
  });

  it('shares a grid and the score', () => {
    expect(shareText({ number: 3, results: ['clean', 'clued', 'missed', 'clean', 'clean'], total: 3800 }))
      .toBe('RunGuessr #3\n🟩🟨🟥🟩🟩 3,800/5,000\nfilmmyrun.com/games/runguessr');
  });
});
