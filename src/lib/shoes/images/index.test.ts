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
    expect(r).toEqual({ checked: 2, cleared: ['b'], unverified: 0 });
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
    expect(r).toEqual({ checked: 3, cleared: ['b'], unverified: 1 });
  });
});

describe('findAndStoreImage: two phases', () => {
  const base = {
    isLikelyProductImage: () => true,
    checkImageSize: async () => ({ ok: true }),
    storeImage: async (slug: string) => `https://r2/shoes/${slug}.jpg`,
    writeImage: async () => {},
  };
  const brandThenRetailer = (brand: string[], retailer: string[]) => {
    const phases: string[] = [];
    const deps = {
      imageCandidates: async (_i: unknown, phase: string) => { phases.push(phase); return (phase === 'brand' ? brand : retailer).map(url => ({ url, method: phase === 'brand' ? 'brand-jsonld' as const : 'retailer-og' as const, pageUrl: 'p' })); },
    };
    return { phases, deps };
  };
  it('never runs the retailer phase when a brand-page candidate stores', async () => {
    const { phases, deps } = brandThenRetailer(['https://c/brand.jpg'], ['https://c/retail.jpg']);
    const r = await findAndStoreImage({ slug: 's', brand: hoka, model: 'Clifton 10' }, null, { ...base, ...deps, visionConfirmShoeImage: async () => true });
    expect(phases).toEqual(['brand']);
    expect(r?.sourceUrl).toBe('https://c/brand.jpg');
  });
  it('runs the retailer phase only after nothing from the brand page stored', async () => {
    const { phases, deps } = brandThenRetailer(['https://c/brand.jpg'], ['https://c/retail.jpg']);
    const r = await findAndStoreImage({ slug: 's', brand: hoka, model: 'Clifton 10' }, null, { ...base, ...deps, visionConfirmShoeImage: async (_b, _m, u) => u.includes('retail') });
    expect(phases).toEqual(['brand', 'retailer']);
    expect(r).toMatchObject({ sourceUrl: 'https://c/retail.jpg', method: 'retailer-og' });
  });
});

describe('auditImages: statuses', () => {
  const run = async (status: number | null) => {
    const cleared: string[] = [];
    const r = await auditImages({
      listImages: async () => [{ slug: 'x', image_url: 'https://r2/x.jpg' }],
      head: async () => status,
      clearImage: async slug => { cleared.push(slug); },
    });
    return { r, cleared };
  };
  it('clears on 404', async () => {
    const { r, cleared } = await run(404);
    expect(cleared).toEqual(['x']); expect(r).toEqual({ checked: 1, cleared: ['x'], unverified: 0 });
  });
  it('clears on 410', async () => {
    const { cleared } = await run(410);
    expect(cleared).toEqual(['x']);
  });
  it('does not clear on 429, counts it unverified', async () => {
    const { r, cleared } = await run(429);
    expect(cleared).toEqual([]); expect(r.unverified).toBe(1);
  });
  it('does not clear on 503, counts it unverified', async () => {
    const { r, cleared } = await run(503);
    expect(cleared).toEqual([]); expect(r.unverified).toBe(1);
  });
  it('does not clear on no response, counts it unverified', async () => {
    const { r, cleared } = await run(null);
    expect(cleared).toEqual([]); expect(r.unverified).toBe(1);
  });
  it('does not clear on 403, and a 200 is neither cleared nor unverified', async () => {
    expect((await run(403)).r.unverified).toBe(1);
    expect((await run(200)).r).toEqual({ checked: 1, cleared: [], unverified: 0 });
  });
  it('pauses 250 ms between HEADs when a sleep is injected', async () => {
    const pauses: number[] = [];
    await auditImages({
      listImages: async () => [{ slug: 'a', image_url: 'u' }, { slug: 'b', image_url: 'u' }, { slug: 'c', image_url: 'u' }],
      head: async () => 200, clearImage: async () => {}, sleep: async ms => { pauses.push(ms); },
    });
    expect(pauses).toEqual([250, 250]);
  });
});
