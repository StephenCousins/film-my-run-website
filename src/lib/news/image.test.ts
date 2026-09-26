import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { brandedCard, creditLine, stampImage } from './image';

const photo = readFileSync(new URL('./fixtures/photo.jpg', import.meta.url));

describe('story images', () => {
  it('credits the photographer and site, or the site alone', () => {
    expect(creditLine('Jane Smith', 'iRunFar')).toBe('Photo: Jane Smith / iRunFar');
    expect(creditLine(null, 'iRunFar')).toBe('Photo: iRunFar');
    expect(creditLine('iRunFar/Jane Smith', 'iRunFar')).toBe('Photo: iRunFar/Jane Smith');
  });
  it('crops to 1200x675 WebP with the credit stamped in', async () => {
    const out = await stampImage(photo, 'Photo: Jane Smith / iRunFar');
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1200, 675, 'webp']);
    // The bottom-right corner is darker than the plain crop: the strip is there.
    const plain = await sharp(photo).resize(1200, 675, { fit: 'cover' }).extract({ left: 900, top: 640, width: 300, height: 35 }).stats();
    const stamped = await sharp(out).extract({ left: 900, top: 640, width: 300, height: 35 }).stats();
    expect(stamped.channels[0].mean).toBeLessThan(plain.channels[0].mean + 1);
  });
  it('a branded card is 1200x675 WebP', async () => {
    const meta = await sharp(await brandedCard('UTMB 2026')).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1200, 675, 'webp']);
  });
});
