/** A player's record, kept on their own device (localStorage on the web, UserDefaults on iOS). */
export interface Stats {
  played: number;
  won: number;
  /** Consecutive puzzles won, as of `lastWon`. */
  streak: number;
  best: number;
  /** The number of the last puzzle won, or null. */
  lastWon: number | null;
  /** The last puzzle finished, won or lost: a puzzle is counted once. */
  lastPlayed: number | null;
  /** Wins by number of guesses. */
  guesses: Record<number, number>;
}

export const EMPTY_STATS: Stats = { played: 0, won: 0, streak: 0, best: 0, lastWon: null, lastPlayed: null, guesses: {} };

/** Records a finished puzzle. Finishing the same puzzle twice changes nothing. */
export function record(s: Stats, number: number, won: boolean, guessCount: number): Stats {
  if (s.lastPlayed !== null && number <= s.lastPlayed) return s;
  if (!won) return { ...s, played: s.played + 1, streak: 0, lastPlayed: number };
  const streak = s.lastWon === number - 1 ? s.streak + 1 : 1;
  return {
    ...s, played: s.played + 1, won: s.won + 1, streak, best: Math.max(s.best, streak), lastWon: number, lastPlayed: number,
    guesses: { ...s.guesses, [guessCount]: (s.guesses[guessCount] ?? 0) + 1 },
  };
}

/** The streak to show today: still alive if the last win was today or yesterday. */
export function liveStreak(s: Stats, today: number): number {
  return s.lastWon !== null && s.lastWon >= today - 1 ? s.streak : 0;
}
