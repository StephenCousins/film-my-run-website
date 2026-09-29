import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { SHIRT_COLOURS } from '@/lib/runner-quiz/shirt-art';

describe('GET /api/app/v1/runner-tee', () => {
  it('returns the product the app sells', async () => {
    const res = await GET(new NextRequest('http://localhost/api/app/v1/runner-tee'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe('runner-type-tee');
    expect(body.priceFrom).toBe(29.99);
    expect(body.colours).toEqual(expect.arrayContaining([{ name: 'White', hex: SHIRT_COLOURS.White }]));
    expect(body.colours).toHaveLength(5);
    expect(body.variants).toContainEqual({ id: 18101, colour: 'Black', size: 'M', price: 29.99 });
    expect(body.variants.every((v: { colour: string }) => v.colour in SHIRT_COLOURS)).toBe(true);
    expect(body.previewUrl).toContain('{type}');
  });
});
