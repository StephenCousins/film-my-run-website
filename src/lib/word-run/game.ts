import { ANSWERS, type Answer } from './answers';

/** The game's name, in one place: change it here and on iOS (WordRun.name). */
export const GAME_NAME = 'Word Run';

/** Puzzle 1. One puzzle a day after that, the same for everyone, by the London date. */
export const LAUNCH = '2026-10-02';

/** Short words early in the week, building to a long run on Sunday (Stephen, 2 Oct 2026). Index 0 = Sunday. */
const LENGTH_BY_WEEKDAY = [7, 4, 4, 5, 5, 6, 6] as const;
export type WordLength = 4 | 5 | 6 | 7;

export type Mark = 'correct' | 'present' | 'absent';

export interface Puzzle {
  number: number;
  date: string;
  length: WordLength;
  /** A 4-letter word is the hardest to pin down, so it gets one more go. */
  maxGuesses: number;
  answer: Answer;
}

const DAY = 86_400_000;
const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY;

/** Today's date in London, yyyy-mm-dd: the puzzle changes at midnight UK time. */
export function londonDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function puzzleFor(date: string): Puzzle {
  const start = dayNumber(LAUNCH);
  const today = dayNumber(date);
  const length = LENGTH_BY_WEEKDAY[new Date(today * DAY).getUTCDay()];
  // How many earlier days since launch had this length: that's the index into its list.
  let index = 0;
  for (let d = start; d < today; d++) if (LENGTH_BY_WEEKDAY[new Date(d * DAY).getUTCDay()] === length) index++;
  const list = ANSWERS[length];
  // ponytail: wraps round when a list runs out (about 28 weeks); add words to the end before then.
  const answer = list[((index % list.length) + list.length) % list.length];
  return { number: today - start + 1, date, length, maxGuesses: length === 4 ? 7 : 6, answer };
}

/** Each letter of a guess: right place, in the word elsewhere, or not in it. A repeated letter is marked only as often as the answer holds it. */
export function score(guess: string, answer: string): Mark[] {
  const g = guess.toUpperCase();
  const a = answer.toUpperCase();
  const marks: Mark[] = Array(g.length).fill('absent');
  const left = new Map<string, number>();
  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) marks[i] = 'correct';
    else left.set(a[i], (left.get(a[i]) ?? 0) + 1);
  }
  for (let i = 0; i < g.length; i++) {
    if (marks[i] === 'correct') continue;
    const n = left.get(g[i]) ?? 0;
    if (n > 0) { marks[i] = 'present'; left.set(g[i], n - 1); }
  }
  return marks;
}

const SQUARE: Record<Mark, string> = { correct: '🟧', present: '🟦', absent: '⬛' };

/** What a player shares: the grid without the letters, so it never gives the word away. */
export function shareText(r: { number: number; maxGuesses: number; won: boolean; rows: Mark[][] }): string {
  const grid = r.rows.map((row) => row.map((m) => SQUARE[m]).join('')).join('\n');
  return [`${GAME_NAME} #${r.number} ${r.won ? r.rows.length : 'X'}/${r.maxGuesses}`, grid, 'filmmyrun.com/games/word-run'].filter(Boolean).join('\n');
}
