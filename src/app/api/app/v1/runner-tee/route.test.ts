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
    expect(body.previewUrl).toContain('v=3');
    expect(body.pricing).toEqual({ ownTypeDiscount: 3, floorOffset: 5, memberDiscount: 0.1, clubDiscount: 0.15 });
    expect(body.designPreviewUrl).toContain('design={design}');
    expect(body.defaultColours).toMatchObject({ track: 'Black', bigcity: 'White', wanderer: 'Dark Grey' });
    expect(Object.keys(body.defaultColours)).toHaveLength(12);
    expect(Object.keys(body.modelPhotos)).toHaveLength(12);
    const v4 = 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/quiz-shirts/models/v4';
    expect(body.modelPhotos.fell['Dark Grey']).toEqual([1, 2, 3, 'back'].map((n) => `${v4}/fell-dark-grey-${n}.webp`));
    expect(Object.keys(body.modelPhotos.fell).sort()).toEqual(['Black', 'Dark Grey', 'Forest', 'Navy', 'White']);
    expect(body.modelPhotosDefault.bigcity).toEqual([1, 2, 3, 'back'].map((n) => `${v4}/bigcity-white-${n}.webp`));
    expect(Object.keys(body.modelPhotosDefault)).toHaveLength(12);
  });
});
