/**
 * Fartlex record sync for signed-in players. The server keeps one row per finished puzzle and the
 * record is those rows replayed through `record()`, so the website and the app agree by construction.
 */
import { LAUNCH, puzzleFor, type Puzzle } from './game';
import { EMPTY_STATS, record, type Stats } from './stats';

export interface Result { puzzle: number; won: boolean; guesses: string[] }

const DAY = 86_400_000;

/** The puzzle for a number: number 1 is launch day. */
export function puzzleNumbered(n: number): Puzzle {
  return puzzleFor(new Date(Date.parse(`${LAUNCH}T00:00:00Z`) + (n - 1) * DAY).toISOString().slice(0, 10));
}

/** The record from a player's results, oldest first. Results carried over without guesses add no guess count. */
export function statsFrom(results: Result[]): Stats {
  let s = EMPTY_STATS;
  for (const r of [...results].sort((a, b) => a.puzzle - b.puzzle)) s = record(s, r.puzzle, r.won, r.guesses.length);
  const { 0: _none, ...guesses } = s.guesses;
  return { ...s, guesses };
}

/**
 * A device's old record as results, for the first sync after signing in. A record keeps only totals, so this
 * recovers what it can: the current streak's wins and the last loss. Enough while the game is days old.
 */
export function resultsFrom(stats: Stats): Result[] {
  const out: Result[] = [];
  if (stats.lastWon !== null) {
    for (let n = stats.lastWon - stats.streak + 1; n <= stats.lastWon; n++) if (n >= 1) out.push({ puzzle: n, won: true, guesses: [] });
  }
  if (stats.lastPlayed !== null && stats.lastPlayed !== stats.lastWon) out.push({ puzzle: stats.lastPlayed, won: false, guesses: [] });
  return out;
}

/**
 * Checks a finished game sent by a client and works out whether it was won, from the answer itself.
 * Returns null for anything that isn't a finished game of a puzzle that has already started.
 */
export function checkResult(puzzle: unknown, guesses: unknown, today: number): Result | null {
  if (!Number.isInteger(puzzle) || (puzzle as number) < 1 || (puzzle as number) > today) return null;
  if (!Array.isArray(guesses) || guesses.length === 0) return null;
  const p = puzzleNumbered(puzzle as number);
  const words = guesses.map((g) => (typeof g === 'string' ? g.toUpperCase() : ''));
  if (words.length > p.maxGuesses || words.some((w) => !new RegExp(`^[A-Z]{${p.length}}$`).test(w))) return null;
  const won = words[words.length - 1] === p.answer.word.toUpperCase();
  if (!won && words.length < p.maxGuesses) return null;   // not finished yet
  return { puzzle: p.number, won, guesses: words };
}
