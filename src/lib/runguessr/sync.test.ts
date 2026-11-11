import { describe, expect, it } from 'vitest';
import { dateFor, pickRounds, puzzleNumber, seedFor, type Race, type RaceData } from './game';
import { checkResult, packClues, statsFrom, unpackClues } from './sync';

const race = (id: string): Race => ({
  id, name: id, country: 'UK', type: 'trail ultra', month: 'Jun', km: 100, gain: 3000, route: null, hook: null,
  outline: [[0, 0], [1, 1]], profile: [1, 2, 3], photos: [{ src: 'x.jpg', quiz: true, page: '', license: 'CC BY', credit: 'x' }],
});
const data: RaceData = { courses: Array.from({ length: 10 }, (_, i) => race(`r${i}`)), all: Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, name: `r${i}` })) };
const rounds = pickRounds(data, seedFor(dateFor(3)));
const right = rounds.map((r) => r.race.id);
const wrong = rounds.map((r) => r.options.find((o) => o.id !== r.race.id)!.id);
const none = ['', '', '', '', ''];

describe('checkResult', () => {
  it('scores on the server from the answers and clues', () => {
    expect(checkResult(3, right, none, 5, rounds)?.score).toBe(5000);
    expect(checkResult(3, right, ['km,gain', '', '', '', 'country'], 5, rounds)?.score).toBe(4400);
    expect(checkResult(3, [wrong[0], ...right.slice(1)], none, 5, rounds)?.score).toBe(4000);
  });

  it('accepts clues as arrays too, and ignores a repeated clue', () => {
    expect(checkResult(3, right, [['km', 'km'], [], [], [], []], 5, rounds)?.clues[0]).toEqual(['km']);
  });

  it('refuses future puzzles, unfinished games, made-up answers and unknown clues', () => {
    expect(checkResult(6, right, none, 5, rounds)).toBeNull();
    expect(checkResult(3, right.slice(0, 4), none, 5, rounds)).toBeNull();
    expect(checkResult(3, ['nope', ...right.slice(1)], none, 5, rounds)).toBeNull();
    expect(checkResult(3, right, ['speed', '', '', '', ''], 5, rounds)).toBeNull();
  });
});

describe('sync helpers', () => {
  it('replays rows in puzzle order into one record', () => {
    expect(statsFrom([{ puzzle: 2, score: 3000 }, { puzzle: 1, score: 1000 }, { puzzle: 4, score: 5000 }]))
      .toEqual({ played: 3, streak: 1, bestStreak: 2, lastPlayed: 4, bestScore: 5000, totalScore: 9000 });
  });

  it('packs and unpacks clues', () => {
    const c = [['km', 'gain'], [], ['country'], [], []] as const;
    expect(unpackClues(packClues(c.map((x) => [...x])))).toEqual(c.map((x) => [...x]));
  });

  it('turns a puzzle number back into its date', () => {
    expect(puzzleNumber(dateFor(41))).toBe(41);
  });
});
