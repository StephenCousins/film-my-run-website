import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { storeImage } from './store';

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
