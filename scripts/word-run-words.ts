// Word Run's valid guesses: public/games/word-run/words-{4..7}.txt, one lower-case word a line.
// The base is the public-domain ENABLE list; every answer is added (BERLIN, FARTLEK aren't in it).
// Run after adding answers: npx tsx --tsconfig tsconfig.json scripts/word-run-words.ts [enable1.txt]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ANSWERS } from '../src/lib/word-run/answers';

const base = process.argv[2];
for (const n of [4, 5, 6, 7] as const) {
  const file = `public/games/word-run/words-${n}.txt`;
  const words = new Set<string>();
  const source = base ?? (existsSync(file) ? file : null);
  if (!source) throw new Error(`No ${file} yet: pass the ENABLE list the first time`);
  for (const w of readFileSync(source, 'utf8').split('\n')) if (new RegExp(`^[a-z]{${n}}$`).test(w.trim())) words.add(w.trim());
  for (const a of ANSWERS[n]) words.add(a.word.toLowerCase());
  writeFileSync(file, [...words].sort().join('\n') + '\n');
  console.log(file, words.size);
}
