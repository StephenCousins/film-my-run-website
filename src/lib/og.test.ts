import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_OG_IMAGE } from './og';

const root = path.resolve(__dirname, '../..');

// Width and height from the first SOF marker of a JPEG.
function jpegSize(buf: Buffer): { width: number; height: number } {
  expect(buf.readUInt16BE(0)).toBe(0xffd8);
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error(`Bad JPEG marker at ${i}`);
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  throw new Error('No SOF marker');
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('site OG image', () => {
  it('public/og-image.jpg exists and is 1200x630', () => {
    const file = path.join(root, 'public', DEFAULT_OG_IMAGE);
    const buf = readFileSync(file);
    expect(jpegSize(buf)).toEqual({ width: 1200, height: 630 });
    expect(buf.length).toBeLessThan(300 * 1024);
  });

  it('nothing under src points at the missing R2 og/ images', () => {
    const needle = 'r2.dev/' + 'og/';
    const offenders = walk(path.join(root, 'src'))
      .filter((f) => /\.(ts|tsx|js|jsx|mjs)$/.test(f))
      .filter((f) => readFileSync(f, 'utf8').includes(needle))
      .map((f) => path.relative(root, f));
    expect(offenders).toEqual([]);
  });
});
