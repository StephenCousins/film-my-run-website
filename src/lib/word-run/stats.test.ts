import { describe, expect, it } from 'vitest';
import { EMPTY_STATS, liveStreak, record } from './stats';

describe('Fartlex streaks', () => {
  it('counts consecutive wins, and the best', () => {
    let s = record(EMPTY_STATS, 1, true, 3);
    s = record(s, 2, true, 4);
    expect(s).toMatchObject({ played: 2, won: 2, streak: 2, best: 2, guesses: { 3: 1, 4: 1 } });
    s = record(s, 3, false, 6);
    expect(s).toMatchObject({ played: 3, won: 2, streak: 0, best: 2 });
    s = record(s, 4, true, 2);
    expect(s.streak).toBe(1);
  });
  it('a missed day breaks the streak', () => {
    const s = record(record(EMPTY_STATS, 1, true, 3), 3, true, 3);
    expect(s.streak).toBe(1);
  });
  it('finishing the same puzzle twice counts once', () => {
    const s = record(EMPTY_STATS, 5, true, 3);
    expect(record(s, 5, true, 3)).toBe(s);
  });
  it('shows the streak while it is alive, 0 once a day has been missed', () => {
    const s = record(record(EMPTY_STATS, 1, true, 3), 2, true, 3);
    expect(liveStreak(s, 2)).toBe(2);
    expect(liveStreak(s, 3)).toBe(2);
    expect(liveStreak(s, 4)).toBe(0);
  });
});
