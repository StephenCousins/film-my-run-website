import { describe, expect, it } from 'vitest';
import { buildNewsSitemap } from './news-sitemap';

const NOW = new Date('2026-09-28T12:00:00.000Z');

describe('buildNewsSitemap', () => {
  it('escapes title characters and includes the story', () => {
    const xml = buildNewsSitemap(
      [{ slug: 'evans-wins', title: 'Evans "wins" <UTMB> & sets a record', publishedAt: new Date('2026-09-28T10:00:00.000Z') }],
      NOW
    );
    expect(xml).toContain('<news:title>Evans &quot;wins&quot; &lt;UTMB&gt; &amp; sets a record</news:title>');
    expect(xml).toContain('<loc>https://filmmyrun.com/news/evans-wins</loc>');
    expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
  });

  it('drops stories published more than 48 hours before now, keeps ones inside the window, newest first', () => {
    const xml = buildNewsSitemap(
      [
        { slug: 'old', title: 'Old story', publishedAt: new Date('2026-09-26T11:59:00.000Z') }, // just over 48h
        { slug: 'newer', title: 'Newer story', publishedAt: new Date('2026-09-28T09:00:00.000Z') },
        { slug: 'newest', title: 'Newest story', publishedAt: new Date('2026-09-28T11:00:00.000Z') },
      ],
      NOW
    );
    expect(xml).not.toContain('old');
    const newerIndex = xml.indexOf('newer');
    const newestIndex = xml.indexOf('newest');
    expect(newestIndex).toBeLessThan(newerIndex);
  });

  it('returns a valid empty urlset when there are no stories in the window', () => {
    const xml = buildNewsSitemap([], NOW);
    expect(xml).toBe(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"></urlset>'
    );
  });
});
