import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

describe('GET /api/app/v1/quiz', () => {
  it('returns the quiz content and the shirt URL template', async () => {
    const res = await GET(new NextRequest('http://localhost/api/app/v1/quiz'));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('max-age=3600');
    const body = await res.json();
    expect(body.questions).toHaveLength(12);
    expect(body.types).toHaveLength(12);
    expect(Object.keys(body.calibration)).toEqual(['mean', 'sd', 'spread']);
    expect(body.axes.map((a: { id: string }) => a.id)).toEqual(['S', 'M', 'D', 'R']);
    expect(body.types[0]).toMatchObject({ id: 'track', shirtLines: expect.any(Array), film: { id: expect.any(String) } });
    expect(body.shirtUrl).toBe('https://filmmyrun.com/shop/runner-type-tee?type={type}&s={scores}');
  });
});
