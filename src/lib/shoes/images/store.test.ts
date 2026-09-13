import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { storeImage, isR2ImageUrl, R2_SHOES_PREFIX } from './store';

describe('storeImage', () => {
  it('resizes to ≤1000px JPEG and uploads under shoes/{slug}.jpg', async () => {
    const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#fff' } }).png().toBuffer();
    let uploaded: { key: string; type: string; w: number; h: number } | null = null;
    const url = await storeImage('hoka-clifton-10', 'https://x/a.png', {
      download: async () => png,
      upload: async (key, body, contentType) => { const m = await sharp(body).metadata(); uploaded = { key, type: contentType, w: m.width!, h: m.height! }; return `https://r2/${key}`; },
    });
    expect(url).toBe('https://r2/shoes/hoka-clifton-10.jpg');
    expect(uploaded).toEqual({ key: 'shoes/hoka-clifton-10.jpg', type: 'image/jpeg', w: 1000, h: 500 });
  });
});

describe('storeImage: transparency', () => {
  it('flattens a fully transparent PNG onto white', async () => {
    const png = await sharp({ create: { width: 40, height: 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    let corner: number[] = [];
    await storeImage('s', 'https://x/t.png', {
      download: async () => png,
      upload: async (_k, body) => { const raw = await sharp(body).raw().toBuffer(); corner = [raw[0], raw[1], raw[2]]; return 'u'; },
    });
    expect(corner).toEqual([255, 255, 255]);
  });
});

describe('isR2ImageUrl', () => {
  it('is true only under the bucket public shoes/ prefix', () => {
    expect(R2_SHOES_PREFIX).toMatch(/^https:\/\/.+\/shoes\/$/);
    expect(isR2ImageUrl(`${R2_SHOES_PREFIX}hoka-clifton-10.jpg`)).toBe(true);
    expect(isR2ImageUrl('https://www.runningzap.com/images/shoes/x/hero.webp')).toBe(false);
    expect(isR2ImageUrl(`${R2_SHOES_PREFIX.replace('/shoes/', '/blog/')}shoes/x.jpg`)).toBe(false);
    expect(isR2ImageUrl('')).toBe(false);
  });
});
