import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { QUIZ, typeById, type QuizType, type Scores } from './index';
import { frontArt, backArt, inkFor, teeMock, textWidth, formatDate, FRONT_MAX_WIDTH, PRINT_W, PRINT_H, DARK_INK, LIGHT_INK, SHIRT_COLOURS, mix, type ShirtColour } from './shirt-art';
import { renderPng, logoDataUri } from './render';

const DATE = new Date('2026-09-29T12:00:00Z');

async function pixels(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

// Any painted pixel within `m` px of the edge means something ran off the print area.
function edgeAlpha({ data, width, height }: Awaited<ReturnType<typeof pixels>>, m = 4) {
  let max = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (x < m || y < m || x >= width - m || y >= height - m) max = Math.max(max, data[(y * width + x) * 4 + 3]);
  return max;
}

const longest = (key: (t: QuizType) => number) => [...QUIZ.types].sort((a, b) => key(b) - key(a))[0];

describe('shirt art', () => {
  it('inkFor: dark ink on White, light otherwise', () => {
    expect(inkFor('White')).toBe(DARK_INK);
    expect(inkFor('Forest')).toBe(LIGHT_INK);
    expect(inkFor('Black')).toBe(LIGHT_INK);
  });

  it('mix pre-blends ink into the shirt colour', () => {
    expect(mix('#ffffff', '#000000', 1)).toBe('#ffffff');
    expect(mix('#ffffff', '#000000', 0)).toBe('#000000');
    expect(mix('#ffffff', '#000000', 0.5)).toBe('#808080');
  });

  it.each(Object.keys(SHIRT_COLOURS) as ShirtColour[])('%s art has no partial opacity', (colour) => {
    const t = typeById('fell')!;
    for (const svg of [frontArt(t, colour), backArt(t, t, [1, 2, 3, 4], DATE, colour, 'logo.png')]) {
      expect(svg).not.toMatch(/opacity|rgba|fill-opacity|stroke-opacity/);
      for (const [, c] of svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('formats the date as DD.MM.YYYY in UK time', () => {
    expect(formatDate(DATE)).toBe('29.09.2026');
    expect(formatDate(new Date('2026-06-30T23:30:00Z'))).toBe('01.07.2026');
  });

  it.each(QUIZ.types.map((t) => [t.id, t] as const))('%s front fits the width limit', (_id, t) => {
    const svg = frontArt(t, 'Forest');
    expect(svg).toContain(`viewBox="0 0 ${PRINT_W} ${PRINT_H}"`);
    const lines = [...svg.matchAll(/font-family="Space Grotesk"[^>]*font-size="([\d.]+)" letter-spacing="([\d.]+)"/g)];
    expect(lines).toHaveLength(t.shirtLines.length);
    t.shirtLines.forEach((l, i) => {
      const [size, spacing] = [Number(lines[i][1]), Number(lines[i][2])];
      expect(textWidth(l, 'SpaceGrotesk-Bold', size, spacing)).toBeLessThanOrEqual(FRONT_MAX_WIDTH + 1);
    });
  });

  it('escapes text', () => {
    const t = { ...typeById('lab')!, name: 'A <b> & "c"', shirtLines: ["<script>'x'</script>"] };
    const front = frontArt(t, 'Forest');
    const back = backArt(t, t, [1, 2, 3, 4], DATE, 'Forest', 'x" onload="y');
    for (const svg of [front, back]) {
      expect(svg).not.toContain('<script>');
      expect(svg).not.toContain('<b>');
    }
    expect(front).toContain('&lt;script&gt;&#39;x&#39;');
    expect(back).toContain('A &lt;B&gt; &amp; &quot;C&quot;');
    expect(back).not.toContain('x" onload');
  });

  it.each([[[1, 2, 3, 101]], [[1, 2, 3, -1]], [[1, 2, 3, 4.5]], [[1, 2, 3]], [[1, 2, 3, NaN]]])('backArt refuses scores %j', (s) => {
    const t = typeById('fell')!;
    expect(() => backArt(t, t, s as unknown as Scores, DATE, 'Forest', 'logo.png')).toThrow();
  });

  it('teeMock places the art on the garment', () => {
    const mock = teeMock('#2e4636', frontArt(typeById('fell')!, 'Forest'));
    expect(mock).toContain('fill="#2e4636"');
    expect(mock).toMatch(/<svg x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+" xmlns/);
  });
});

describe('renderPng', () => {
  it('renders a print-size PNG with ink on it and nothing at the edges', async () => {
    const png = await renderPng(frontArt(typeById('track')!, 'White'));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    const px = await pixels(png);
    expect([px.width, px.height]).toEqual([PRINT_W, PRINT_H]);
    let painted = 0;
    for (let i = 3; i < px.data.length; i += 4) if (px.data[i] > 0) painted++;
    expect(painted).toBeGreaterThan(10000);
    expect(edgeAlpha(px)).toBe(0);
  }, 30000);

  // Longest type name with the longest second type, at both ends of every scale.
  const name = longest((t) => textWidth(t.name.toUpperCase(), 'SpaceGrotesk-Bold', 22));
  const second = longest((t) => textWidth(t.name, 'Inter-Regular', 10.5));
  it.each([
    [0, 0, 0, 0],
    [100, 100, 100, 100],
  ] as Scores[])('back for scores %j stays inside the print area', async (...s) => {
    const px = await pixels(await renderPng(backArt(name, second, s, DATE, 'Black', logoDataUri('Black'))));
    expect([px.width, px.height]).toEqual([PRINT_W, PRINT_H]);
    expect(edgeAlpha(px)).toBe(0);
  }, 30000);
});
