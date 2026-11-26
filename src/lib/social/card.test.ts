import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { CARD_H, CARD_W, HEADLINE_MAX_LINES, cardJpeg, layoutHeadline, renderCard, textWidth } from './card';

const photo = readFileSync(new URL('../news/fixtures/photo.jpg', import.meta.url));

describe('the social card', () => {
  it('renders a 1080x1350 PNG', async () => {
    const png = await renderCard({ photo, headline: 'Walmsley smashes the Western States record', highlight: ['Walmsley', 'record'], tag: 'RESULTS', credit: "Photo: Stephen O'Malley / iRunFar" });
    const meta = await sharp(png).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([CARD_W, CARD_H, 'png']);
    // What Meta gets: the same card as JPEG (Instagram's API takes JPEG only).
    const jpg = await sharp(await cardJpeg(png)).metadata();
    expect([jpg.width, jpg.height, jpg.format]).toEqual([CARD_W, CARD_H, 'jpeg']);
  });
  it('measures with the bundled fonts (a wider string is wider)', () => {
    expect(textWidth('WWWW', 'Space Grotesk', 700, 80)).toBeGreaterThan(textWidth('iiii', 'Space Grotesk', 700, 80));
    expect(textWidth('Hello', 'Space Grotesk', 700, 80)).toBeGreaterThan(100);
  });
  it('a short headline is big; a long one shrinks and never runs past 4 lines or the card edge', () => {
    const short = layoutHeadline('UTMB cancelled', 440);
    const long = layoutHeadline('Kilian Jornet and Courtney Dauwalter both withdraw from the Hardrock 100 after the snowpack forces a reroute', 440);
    expect(short.size).toBeGreaterThan(long.size);
    expect(long.lines.length).toBeLessThanOrEqual(HEADLINE_MAX_LINES);
    for (const l of [...short.lines, ...long.lines]) expect(textWidth(l, 'Space Grotesk', 700, l === short.lines[0] ? short.size : long.size)).toBeLessThanOrEqual(CARD_W - 144);
  });
});
