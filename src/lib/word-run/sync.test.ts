import { describe, expect, it } from 'vitest';
import { londonDate, puzzleFor } from './game';
import { record, EMPTY_STATS } from './stats';
import { checkResult, puzzleNumbered, resultsFrom, statsFrom } from './sync';

describe('Fartlex sync', () => {
  it('numbers puzzles from launch day', () => {
    expect(puzzleNumbered(1).date).toBe('2026-10-02');
    expect(puzzleNumbered(2)).toEqual(puzzleFor('2026-10-03'));
  });

  it('a web win yesterday and an app win today make a streak of 2', () => {
    const s = statsFrom([{ puzzle: 2, won: true, guesses: ['A', 'B', 'C'] }, { puzzle: 1, won: true, guesses: ['A', 'B'] }]);
    expect(s).toMatchObject({ played: 2, won: 2, streak: 2, best: 2, lastWon: 2, guesses: { 2: 1, 3: 1 } });
  });

  it('carries a device record over as results, and back to the same record', () => {
    let local = record(EMPTY_STATS, 1, true, 3);
    local = record(local, 2, true, 4);
    expect(resultsFrom(local).map((r) => r.puzzle)).toEqual([1, 2]);
    expect(statsFrom(resultsFrom(local))).toMatchObject({ played: 2, won: 2, streak: 2, guesses: {} });
    const lost = record(local, 3, false, 6);
    expect(resultsFrom(lost)).toContainEqual({ puzzle: 3, won: false, guesses: [] });
  });

  it('works out the win from the answer and refuses unfinished or future games', () => {
    const p = puzzleNumbered(1);
    const word = p.answer.word.toUpperCase();
    const wrong = 'Z'.repeat(p.length);
    expect(checkResult(1, [wrong, word.toLowerCase()], 5)).toEqual({ puzzle: 1, won: true, guesses: [wrong, word] });
    expect(checkResult(1, [wrong], 5)).toBeNull();                                   // still playing
    expect(checkResult(1, Array(p.maxGuesses).fill(wrong), 5)?.won).toBe(false);     // out of guesses
    expect(checkResult(6, [word], 5)).toBeNull();                                    // not out yet
    expect(checkResult(1, ['AB'], 5)).toBeNull();                                    // wrong length
  });

  it('today has a number', () => {
    expect(puzzleFor(londonDate()).number).toBeGreaterThanOrEqual(1);
  });
});
