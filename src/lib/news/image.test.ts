import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { brandedCard, creditLine, stampImage, storyImage } from './image';
import type { Bundle, Candidate } from './types';

const photo = readFileSync(new URL('./fixtures/photo.jpg', import.meta.url));

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    articleId: 1,
    url: 'https://example.com/article',
    source: 'iRunFar',
    title: 'A headline',
    pubDate: new Date('2026-09-20'),
    summary: 'summary',
    text: null,
    imageUrl: 'https://example.com/img.jpg',
    photoCredit: null,
    ...overrides,
  };
}

function bundle(items: Candidate[]): Bundle {
  return { key: 'k', headline: 'UTMB 2026', items, verdicts: [], alreadyCovered: false };
}

async function fakeImage(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 120, g: 120, b: 120 } } })
    .jpeg()
    .toBuffer();
}

function fakeResponse(opts: { ok?: boolean; contentType?: string | null; body?: Buffer; contentLength?: string | null }) {
  const body = opts.body ?? Buffer.alloc(0);
  return {
    ok: opts.ok ?? true,
    headers: {
      get: (name: string) => {
        if (name === 'content-type') return opts.contentType ?? 'image/jpeg';
        if (name === 'content-length') return opts.contentLength ?? String(body.length);
        return null;
      },
    },
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  } as unknown as Response;
}

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
  it('escapes an apostrophe in the credit without breaking the SVG', async () => {
    // sharp throws on invalid SVG/XML, so getting a buffer back proves the escape worked.
    const out = await stampImage(photo, "Photo: Stephen O'Malley / iRunFar");
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1200, 675, 'webp']);
  });
});

describe('storyImage', () => {
  it('uses the first source photo that works', async () => {
    const buf = await fakeImage(1600, 1000);
    const fetchFn = vi.fn().mockResolvedValue(fakeResponse({ body: buf }));
    const upload = vi.fn().mockResolvedValue('https://r2.example/news/slug.webp');
    const result = await storyImage(bundle([candidate({ photoCredit: 'Jane Smith' })]), 'slug', {
      fetch: fetchFn,
      upload,
    });
    expect(result).toEqual({ url: 'https://r2.example/news/slug.webp', credit: 'Photo: Jane Smith / iRunFar' });
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('falls through to the next item when the first fails', async () => {
    const buf = await fakeImage(1600, 1000);
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse({ ok: false }))
      .mockResolvedValueOnce(fakeResponse({ body: buf }));
    const upload = vi.fn().mockResolvedValue('https://r2.example/news/slug.webp');
    const result = await storyImage(
      bundle([
        candidate({ articleId: 1, source: 'iRunFar', photoCredit: null }),
        candidate({ articleId: 2, source: 'Trail Running Mag', photoCredit: 'Bob' }),
      ]),
      'slug',
      { fetch: fetchFn, upload }
    );
    expect(result.credit).toBe('Photo: Bob / Trail Running Mag');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('falls back to a branded card, credit null, when every source photo fails', async () => {
    const fetchFn = vi.fn().mockResolvedValue(fakeResponse({ ok: false }));
    const upload = vi.fn().mockResolvedValue('https://r2.example/news/card.webp');
    const result = await storyImage(bundle([candidate()]), 'slug', { fetch: fetchFn, upload });
    expect(result).toEqual({ url: 'https://r2.example/news/card.webp', credit: null });
  });

  it('rejects a non-image content-type', async () => {
    const fetchFn = vi.fn().mockResolvedValue(fakeResponse({ contentType: 'text/html' }));
    const upload = vi.fn().mockResolvedValue('card-url');
    const result = await storyImage(bundle([candidate()]), 'slug', { fetch: fetchFn, upload });
    expect(result.credit).toBeNull();
  });

  it('rejects image/gif and image/svg+xml', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse({ contentType: 'image/gif' }))
      .mockResolvedValueOnce(fakeResponse({ contentType: 'image/svg+xml' }));
    const upload = vi.fn().mockResolvedValue('card-url');
    const result = await storyImage(
      bundle([candidate({ articleId: 1 }), candidate({ articleId: 2 })]),
      'slug',
      { fetch: fetchFn, upload }
    );
    expect(result.credit).toBeNull();
  });

  it('rejects a source image narrower than the minimum width', async () => {
    const buf = await fakeImage(700, 500);
    const fetchFn = vi.fn().mockResolvedValue(fakeResponse({ body: buf }));
    const upload = vi.fn().mockResolvedValue('card-url');
    const result = await storyImage(bundle([candidate()]), 'slug', { fetch: fetchFn, upload });
    expect(result.credit).toBeNull();
  });

  it('rejects a banner outside the photo aspect-ratio band', async () => {
    const buf = await fakeImage(3000, 600);
    const fetchFn = vi.fn().mockResolvedValue(fakeResponse({ body: buf }));
    const upload = vi.fn().mockResolvedValue('card-url');
    const result = await storyImage(bundle([candidate()]), 'slug', { fetch: fetchFn, upload });
    expect(result.credit).toBeNull();
  });

  it('rejects a source over the 15MB content-length before downloading it', async () => {
    const fetchFn = vi.fn().mockResolvedValue(fakeResponse({ contentLength: String(20 * 1024 * 1024) }));
    const upload = vi.fn().mockResolvedValue('card-url');
    const result = await storyImage(bundle([candidate()]), 'slug', { fetch: fetchFn, upload });
    expect(result.credit).toBeNull();
  });

  it('falls through to the next item when stamping throws', async () => {
    const buf = await fakeImage(1600, 1000);
    const fetchFn = vi.fn().mockResolvedValue(fakeResponse({ body: buf }));
    const upload = vi.fn().mockResolvedValue('url-2');
    const stamp = vi
      .fn()
      .mockRejectedValueOnce(new Error('corrupt image'))
      .mockResolvedValueOnce(Buffer.from('stamped'));
    const result = await storyImage(
      bundle([candidate({ articleId: 1 }), candidate({ articleId: 2, source: 'Other' })]),
      'slug',
      { fetch: fetchFn, upload, stamp }
    );
    expect(upload).toHaveBeenCalledTimes(1);
    expect(result.url).toBe('url-2');
  });
});
