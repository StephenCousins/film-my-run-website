import { describe, expect, it } from 'vitest';
import { ANSWERS } from './answers';
import { LAUNCH, londonDate, puzzleFor, score, shareText } from './game';

describe('Fartlex schedule', () => {
  it('puzzle 1 is launch day, and the length follows the week: 4 Mon-Tue, 5 Wed-Thu, 6 Fri-Sat, 7 Sun', () => {
    expect(puzzleFor(LAUNCH).number).toBe(1);
    const lengths = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'].map((d) => puzzleFor(d).length);
    expect(lengths).toEqual([4, 4, 5, 5, 6, 6, 7]);
  });
  it('a 4-letter day gets 7 guesses, the others 6', () => {
    expect(puzzleFor('2026-10-05').maxGuesses).toBe(7);
    expect(puzzleFor('2026-10-07').maxGuesses).toBe(6);
  });
  it('takes each length\'s words in order, one per day of that length', () => {
    // Launch is Friday 2 Oct (6 letters), then Saturday 3 Oct (6).
    expect(puzzleFor('2026-10-02').answer.word).toBe(ANSWERS[6][0].word);
    expect(puzzleFor('2026-10-03').answer.word).toBe(ANSWERS[6][1].word);
    expect(puzzleFor('2026-10-04').answer.word).toBe(ANSWERS[7][0].word);
    expect(puzzleFor('2026-10-05').answer.word).toBe(ANSWERS[4][0].word);
    expect(puzzleFor('2026-10-06').answer.word).toBe(ANSWERS[4][1].word);
    expect(puzzleFor('2026-10-09').answer.word).toBe(ANSWERS[6][2].word);
  });
  it('never repeats a word before every word of that length has been used', () => {
    const seen = new Set<string>();
    const d = new Date(`${LAUNCH}T12:00:00Z`);
    for (let i = 0; i < 7 * 27; i++) {
      const w = puzzleFor(new Date(d.getTime() + i * 86_400_000).toISOString().slice(0, 10)).answer.word;
      expect(seen.has(w)).toBe(false);
      seen.add(w);
    }
  });
  it('after a full year each list comes round again in a new, fixed order', () => {
    const d = new Date(`${LAUNCH}T12:00:00Z`);
    const words = (fromWeek: number) => {
      const out: string[] = [];
      for (let i = fromWeek * 7; i < (fromWeek + 52) * 7; i++) {
        const p = puzzleFor(new Date(d.getTime() + i * 86_400_000).toISOString().slice(0, 10));
        if (p.length === 7) out.push(p.answer.word);
      }
      return out;
    };
    const first = words(0);
    const second = words(52);
    expect(first).toEqual(ANSWERS[7].map((a) => a.word));
    expect([...second].sort()).toEqual([...first].sort()); // every word once more
    expect(second).not.toEqual(first); // but not in the same order
    expect(words(52)).toEqual(second); // and the same order every time it's asked
  });
  it('a day rolls over at midnight in London, not UTC', () => {
    expect(londonDate(new Date('2026-10-02T23:30:00Z'))).toBe('2026-10-03'); // BST: 00:30 on the 3rd
    expect(londonDate(new Date('2026-12-02T23:30:00Z'))).toBe('2026-12-02'); // GMT
  });
});

describe('Fartlex scoring', () => {
  const s = (g: string, a: string) => score(g, a).map((x) => x[0]).join('');
  it('marks right place, wrong place and absent', () => {
    expect(s('TRAIL', 'TRAIL')).toBe('ccccc');
    expect(s('LIART', 'TRAIL')).toBe('ppcpp');
    expect(s('MOUSE', 'TRAIL')).toBe('aaaaa');
  });
  it('a repeated letter is only marked as often as the answer has it', () => {
    expect(s('SPEED', 'STEEP')).toBe('cpcca'); // two Es in both
    expect(s('EERIE', 'TEMPO')).toBe('acaaa'); // one E in the answer: the right-place E wins
    expect(s('LLAMA', 'PEDAL')).toBe('papaa'); // one L, one A: the first of each takes it
  });
});

describe('Fartlex share text', () => {
  it('is a grid of orange, blue and black squares with the score and no answer', () => {
    const text = shareText({ number: 12, maxGuesses: 6, won: true, rows: [score('SPEED', 'STEEP'), score('STEEP', 'STEEP')] });
    expect(text).toBe('Fartlex #12 2/6\n🟧🟦🟧🟧⬛\n🟧🟧🟧🟧🟧\nfilmmyrun.com/games/fartlex');
    expect(shareText({ number: 3, maxGuesses: 7, won: false, rows: [] })).toMatch(/^Fartlex #3 X\/7/);
  });
});

describe('Fartlex word lists', () => {
  it('every answer is a valid guess (run scripts/word-run-words.ts after adding answers)', async () => {
    const { readFileSync } = await import('node:fs');
    for (const n of [4, 5, 6, 7] as const) {
      const valid = new Set(readFileSync(`public/games/fartlex/words-${n}.txt`, 'utf8').split('\n'));
      for (const a of ANSWERS[n]) expect(valid.has(a.word.toLowerCase()), `${a.word} missing from words-${n}.txt`).toBe(true);
    }
  });
});
