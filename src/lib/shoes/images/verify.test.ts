import { describe, it, expect } from 'vitest';
import { isLikelyProductImage, checkImageSize, visionConfirmShoeImage } from './verify';

describe('isLikelyProductImage', () => {
  const cases: [string, boolean, string][] = [
    ['https://www.hoka.com/dw/image/v2/BDPG_PRD/on/demandware.static/-/Sites-HOKA-master/default/dwabc123/images/white/1155141-BWHT_1.png?sw=1000', true, 'SFCC path segment /default/ is not a placeholder'],
    ['https://cdn/x/default.png', false, 'default filename'],
    ['https://cdn/x/default-image.jpg', false, 'default-image filename'],
    ['https://cdn/x/default_placeholder.webp?v=2', false, 'default_placeholder filename with a query'],
    ['https://cdn/brand-logo.png', false, 'brand logo'],
    ['https://cdn/assets/brandmark.svg', false, 'brandmark'],
    ['https://cdn/brand_icons/hoka.png', false, 'brand icon folder'],
    ['https://cdn/brandon-shoes/ghost.jpg', true, 'the word brand inside a path is fine'],
    ['https://cdn/brand/ghost-16.jpg', true, 'a plain /brand/ folder is fine'],
    ['https://i.ebayimg.com/images/g/abc/s-l1600.jpg', false, 'non-catalogue host'],
    ['https://cdn/shoes/logo.png', false, 'logo'],
    ['https://cdn/shoes/image.jpg', false, 'generic image.jpg filename'],
    ['https://cdn/shoes/ghost-16', false, 'no image extension and no /image path'],
    ['https://www.brooksrunning.com/dw/image/v2/x/default/dw1/images/ghost-16.jpg', true, 'Brooks SFCC'],
  ];
  for (const [url, expected, why] of cases) {
    it(`${expected ? 'passes' : 'rejects'} ${why}`, () => {
      expect(isLikelyProductImage(url)).toBe(expected);
    });
  }
});

describe('checkImageSize', () => {
  const head = (status: number, headers: Record<string, string>) => ({
    fetch: (async (_url: unknown, init?: RequestInit) => {
      expect(init?.method).toBe('HEAD');
      return { ok: status >= 200 && status < 300, status, headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } } as unknown as Response;
    }) as unknown as typeof fetch,
  });
  it('accepts an image over 5 KB, or of unknown length', async () => {
    expect(await checkImageSize('https://c/a.jpg', head(200, { 'content-type': 'image/jpeg', 'content-length': '48213' }))).toEqual({ ok: true });
    expect(await checkImageSize('https://c/a.jpg', head(200, { 'content-type': 'image/webp' }))).toEqual({ ok: true });
  });
  it('rejects a non-2xx, a non-image content type, and a tiny file', async () => {
    expect(await checkImageSize('https://c/a.jpg', head(404, {}))).toEqual({ ok: false, reason: 'HTTP 404' });
    expect(await checkImageSize('https://c/a.jpg', head(200, { 'content-type': 'text/html' }))).toEqual({ ok: false, reason: 'not an image (text/html)' });
    expect(await checkImageSize('https://c/a.jpg', head(200, { 'content-type': 'image/png', 'content-length': '812' }))).toEqual({ ok: false, reason: 'too small (likely a logo)' });
  });
  it('reports unreachable when the HEAD itself fails', async () => {
    const fetch: typeof globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
    expect(await checkImageSize('https://c/a.jpg', { fetch })).toEqual({ ok: false, reason: 'unreachable' });
  });
});

describe('visionConfirmShoeImage', () => {
  const answering = (answer: string | null) => ({ completeTextWithImage: async () => answer as string });
  it('is true only on an explicit YES', async () => {
    expect(await visionConfirmShoeImage('Hoka', 'Clifton 10', 'https://c/a.jpg', answering('YES'))).toBe(true);
    expect(await visionConfirmShoeImage('Hoka', 'Clifton 10', 'https://c/a.jpg', answering('yes, clean product shot'))).toBe(true);
    expect(await visionConfirmShoeImage('Hoka', 'Clifton 10', 'https://c/a.jpg', answering('NO lifestyle scene on trail'))).toBe(false);
    expect(await visionConfirmShoeImage('Hoka', 'Clifton 10', 'https://c/a.jpg', answering('Probably yes'))).toBe(false);
  });
  it('is null, not a pass, when the model answers nothing or the call throws', async () => {
    expect(await visionConfirmShoeImage('Hoka', 'Clifton 10', 'https://c/a.jpg', answering(''))).toBeNull();
    expect(await visionConfirmShoeImage('Hoka', 'Clifton 10', 'https://c/a.jpg', answering(null))).toBeNull();
    expect(await visionConfirmShoeImage('Hoka', 'Clifton 10', 'https://c/a.jpg', { completeTextWithImage: async () => { throw new Error('402'); } })).toBeNull();
  });
  it('sends the image URL and names the expected shoe in the prompt', async () => {
    let seen: { imageUrl: string; prompt: string } | null = null;
    await visionConfirmShoeImage('Brooks', 'Ghost 16', 'https://c/g.jpg', { completeTextWithImage: async o => { seen = o; return 'YES'; } });
    expect(seen).toMatchObject({ imageUrl: 'https://c/g.jpg' });
    expect(seen!.prompt).toContain('Brooks Ghost 16');
  });
});
