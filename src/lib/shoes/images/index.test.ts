import { describe, it, expect } from 'vitest';
import { findAndStoreImage, auditImages } from './index';
const hoka = { id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: null };

describe('findAndStoreImage', () => {
  it('stores the first candidate that passes every check and records provenance', async () => {
    const writes: unknown[] = [];
    const r = await findAndStoreImage({ slug: 'hoka-clifton-10', brand: hoka, model: 'Clifton 10' }, null, {
      imageCandidates: async () => [{ url: 'https://c/logo.png', method: 'brand-og', pageUrl: 'p' }, { url: 'https://c/shoe.jpg', method: 'brand-jsonld', pageUrl: 'p' }],
      isLikelyProductImage: u => !u.includes('logo'),
      checkImageSize: async () => ({ ok: true }),
      visionConfirmShoeImage: async () => true,
      storeImage: async slug => `https://r2/shoes/${slug}.jpg`,
      writeImage: async (slug, data) => { writes.push([slug, data]); },
    });
    expect(r).toEqual({ url: 'https://r2/shoes/hoka-clifton-10.jpg', sourceUrl: 'https://c/shoe.jpg', method: 'brand-jsonld' });
    expect(writes[0]).toEqual(['hoka-clifton-10', expect.objectContaining({ image_url: 'https://r2/shoes/hoka-clifton-10.jpg', image_source_url: 'https://c/shoe.jpg', image_method: 'brand-jsonld' })]);
  });
  it('returns null and writes nothing when vision says NO or errors', async () => {
    const writes: unknown[] = [];
    const r = await findAndStoreImage({ slug: 's', brand: hoka, model: 'Clifton 10' }, null, {
      imageCandidates: async () => [{ url: 'a', method: 'brand-jsonld', pageUrl: 'p' }, { url: 'b', method: 'brand-og', pageUrl: 'p' }],
      isLikelyProductImage: () => true, checkImageSize: async () => ({ ok: true }),
      visionConfirmShoeImage: async u => (u === 'a' ? false : null),
      storeImage: async () => 'never', writeImage: async (...a) => { writes.push(a); },
    });
    expect(r).toBeNull(); expect(writes).toEqual([]);
  });
});

describe('auditImages', () => {
  it('clears images whose URL no longer resolves', async () => {
    const cleared: string[] = [];
    const r = await auditImages({
      listImages: async () => [{ slug: 'a', image_url: 'https://r2/a.jpg' }, { slug: 'b', image_url: 'https://dead/b.jpg' }],
      head: async url => (url.includes('dead') ? 404 : 200),
      clearImage: async slug => { cleared.push(slug); },
    });
    expect(r).toEqual({ checked: 2, cleared: ['b'] });
  });
});

describe('findAndStoreImage: ordering and failure', () => {
  const base = {
    isLikelyProductImage: () => true,
    checkImageSize: async () => ({ ok: true }),
    visionConfirmShoeImage: async () => true,
    storeImage: async (slug: string) => `https://r2/shoes/${slug}.jpg`,
    writeImage: async () => {},
  };
  it('never calls vision on a candidate that failed the size check, and never stores one vision rejected', async () => {
    const seen: string[] = []; const stored: string[] = [];
    const r = await findAndStoreImage({ slug: 's', brand: hoka, model: 'Clifton 10' }, null, {
      ...base,
      imageCandidates: async () => [{ url: 'small', method: 'brand-jsonld', pageUrl: 'p' }, { url: 'no', method: 'brand-og', pageUrl: 'p' }, { url: 'yes', method: 'retailer-og', pageUrl: 'p' }],
      checkImageSize: async u => ({ ok: u !== 'small' }),
      visionConfirmShoeImage: async (_b, _m, u) => { seen.push(u); return u === 'yes'; },
      storeImage: async (slug, src) => { stored.push(src); return `https://r2/shoes/${slug}.jpg`; },
    });
    expect(seen).toEqual(['no', 'yes']);
    expect(stored).toEqual(['yes']);
    expect(r?.method).toBe('retailer-og');
  });
  it('writes nothing when the store fails, and moves on to the next candidate', async () => {
    const writes: unknown[] = [];
    const r = await findAndStoreImage({ slug: 's', brand: hoka, model: 'Clifton 10' }, null, {
      ...base,
      imageCandidates: async () => [{ url: 'a', method: 'brand-jsonld', pageUrl: 'p' }, { url: 'b', method: 'brand-og', pageUrl: 'p' }],
      storeImage: async (slug, src) => { if (src === 'a') throw new Error('R2 down'); return `https://r2/shoes/${slug}.jpg`; },
      writeImage: async (...a) => { writes.push(a); },
    });
    expect(r).toEqual({ url: 'https://r2/shoes/s.jpg', sourceUrl: 'b', method: 'brand-og' });
    expect(writes).toHaveLength(1);
    expect((writes[0] as [string, { image_verified_at: Date }])[1].image_verified_at).toBeInstanceOf(Date);
  });
  it('passes the brand name and model to vision', async () => {
    let asked: string[] = [];
    await findAndStoreImage({ slug: 's', brand: hoka, model: 'Clifton 10' }, null, {
      ...base,
      imageCandidates: async () => [{ url: 'a', method: 'brand-jsonld', pageUrl: 'p' }],
      visionConfirmShoeImage: async (b, m) => { asked = [b, m]; return true; },
    });
    expect(asked).toEqual(['Hoka', 'Clifton 10']);
  });
});

describe('auditImages: no response', () => {
  it('leaves an image alone when the HEAD got no response, and passes the limit through', async () => {
    const cleared: string[] = []; let limitSeen: number | undefined;
    const r = await auditImages({
      listImages: async limit => { limitSeen = limit; return [{ slug: 'a', image_url: 'https://r2/a.jpg' }, { slug: 'b', image_url: 'https://r2/b.jpg' }, { slug: 'c', image_url: 'https://r2/c.jpg' }]; },
      head: async url => (url.includes('a') ? null : url.includes("b") ? 410 : 200),
      clearImage: async slug => { cleared.push(slug); },
    }, { limit: 3 });
    expect(limitSeen).toBe(3);
    expect(r).toEqual({ checked: 3, cleared: ['b'] });
  });
});
