import { describe, expect, it } from 'vitest';
import { buildArticleJsonLd } from './article-jsonld';

describe('buildArticleJsonLd', () => {
  it('includes the excerpt as description and the canonical URL as mainEntityOfPage', () => {
    const jsonLd = buildArticleJsonLd(
      { title: 'Evans wins UTMB', excerpt: 'A short summary of the race.', publishedAt: '2026-09-20T00:00:00.000Z', imageUrl: 'https://example.test/x.jpg' },
      'https://filmmyrun.com/news/evans-wins-utmb',
    );
    expect(jsonLd.description).toBe('A short summary of the race.');
    expect(jsonLd.mainEntityOfPage).toEqual({ '@type': 'WebPage', '@id': 'https://filmmyrun.com/news/evans-wins-utmb' });
    expect(jsonLd.headline).toBe('Evans wins UTMB');
    expect(jsonLd.image).toEqual(['https://example.test/x.jpg']);
  });

  it('gives an empty image array when there is no image', () => {
    const jsonLd = buildArticleJsonLd(
      { title: 'T', excerpt: 'E', publishedAt: '2026-09-20T00:00:00.000Z', imageUrl: null },
      'https://filmmyrun.com/news/t',
    );
    expect(jsonLd.image).toEqual([]);
  });
});
