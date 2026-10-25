import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LINKS = [
  'wilson://plan', 'wilson://map', 'wilson://find', 'wilson://wilson', 'wilson://challenges',
  'wilson://challenge/<id>', 'wilson://event/<id>', 'wilson://number/<n>', 'wilson://glossary',
  'wilson://barcode', 'wilson://settings', 'https://filmmyrun.com/wilson/',
];

describe('wilson pack', () => {
  const pack = readFileSync(join(process.cwd(), 'content/wilson-assistant/pack.md'), 'utf8');
  it('is under 80,000 characters', () => expect(pack.length).toBeLessThan(80_000));
  it('lists every allowed link', () => { for (const l of LINKS) expect(pack).toContain(l); });
  it('has the key terms and sections in order', () => {
    for (const t of ['NENDY', 'Nelson', 'floating Wilson']) expect(pack).toContain(t);
    const at = ['## Links you may use', '## The Wilson index and the app', '## Words', '## Challenges', '## parkrun'].map((h) => pack.indexOf(`\n${h}\n`));
    expect(at.every((i, n) => i >= 0 && (n === 0 || i > at[n - 1]))).toBe(true);
  });
  it('has no em or en dashes', () => expect(pack).not.toMatch(/[—–]/));
});
