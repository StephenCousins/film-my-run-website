import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { bioHtml, storePhoto } from './save';

describe('the bio HTML', () => {
  it('escapes and wraps each paragraph', () => {
    expect(bioHtml(['A & B <c>', 'Two.'])).toBe('<p>A &amp; B &lt;c&gt;</p>\n<p>Two.</p>');
  });
});

describe('storing a photo', () => {
  it('downloads, resizes to webp and uploads under runners/<slug>-<kind>.webp', async () => {
    const jpg = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#888' } }).jpeg().toBuffer();
    const upload = vi.fn(async (key: string) => `https://r2/${key}`);
    const fetchFn = vi.fn(async () => new Response(new Uint8Array(jpg), { headers: { 'content-type': 'image/jpeg' } }));
    const out = await storePhoto({ kind: 'action', url: 'https://x/y.jpg', credit: 'Photo: A', licence: null, source_url: 'https://x' }, 'ruth-croft', { fetch: fetchFn as unknown as typeof fetch, upload });
    expect(out.url).toBe('https://r2/runners/ruth-croft-action.webp');
    const [, body, type] = upload.mock.calls[0] as unknown as [string, Buffer, string];
    expect(type).toBe('image/webp');
    expect((await sharp(body).metadata()).width).toBe(1600);
  });
  it('a photo already on R2 is left as it is', async () => {
    const upload = vi.fn();
    const p = { kind: 'portrait' as const, url: `${process.env.R2_PUBLIC_URL ?? 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev'}/runners/x-portrait.webp`, credit: 'Photo: A', licence: null, source_url: 'https://x' };
    expect(await storePhoto(p, 'x', { upload })).toEqual(p);
    expect(upload).not.toHaveBeenCalled();
  });
  it('a download that is not an image throws, naming the URL', async () => {
    const fetchFn = async () => new Response('<html>', { headers: { 'content-type': 'text/html' } });
    await expect(storePhoto({ kind: 'action', url: 'https://x/page', credit: 'Photo: A', licence: null, source_url: 'https://x' }, 's', { fetch: fetchFn as unknown as typeof fetch, upload: vi.fn() })).rejects.toThrow('https://x/page');
  });
});
