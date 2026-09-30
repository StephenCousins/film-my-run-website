import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const get = (qs: string) => GET(new NextRequest(`http://localhost/api/shop/runner-tee/preview?${qs}`));

describe('GET /api/shop/runner-tee/preview', () => {
  it('renders the front and back as PNGs at the asked width', async () => {
    for (const side of ['front', 'back']) {
      const res = await get(`type=fell&s=18-29-45-64&colour=Dark%20Grey&side=${side}&w=300`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('image/png');
      expect(res.headers.get('cache-control')).toContain('max-age=86400');
      const png = Buffer.from(await res.arrayBuffer());
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(300); // IHDR width
    }
  }, 30000);

  it('renders any design, with or without a quiz result', async () => {
    for (const qs of ['design=lab&type=fell&s=18-29-45-64', 'design=track', 'design=track&type=&s=']) {
      const res = await get(`${qs}&colour=White&side=back&w=200`);
      expect(res.status, qs).toBe(200);
      expect(res.headers.get('content-type')).toBe('image/png');
    }
  }, 30000);

  it('clamps the width and defaults it', async () => {
    const width = async (w: string) => Buffer.from(await (await get(`type=fell&s=18-29-45-64&colour=Black&side=front${w}`)).arrayBuffer()).readUInt32BE(16);
    expect(await width('&w=5000')).toBe(1000);
    expect(await width('&w=10')).toBe(200);
    expect(await width('')).toBe(800);
    expect(await width('&w=abc')).toBe(800);
  }, 30000);

  it.each([
    'type=track&s=18-29-45-64&colour=Black&side=front', // scores point at another type
    'design=nope&colour=Black&side=front',
    'design=lab&type=fell&s=1-2-3&colour=Black&side=front', // a result that's sent must be valid
    'type=nope&s=18-29-45-64&colour=Black&side=front',
    'type=fell&s=18-29-45&colour=Black&side=front',
    'type=fell&s=18-29-45-64&colour=Soft%20Pink&side=front',
    'type=fell&s=18-29-45-64&colour=Black&side=sleeve',
    'type=fell&s=18-29-45-64&side=front',
  ])('rejects %s', async (qs) => {
    expect((await get(qs)).status).toBe(400);
  });
});
