import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractPage, pickImageUrl } from './gather';
import { SOURCE_PLACEHOLDERS } from '@/lib/rss-fetcher';

const html = readFileSync(new URL('./fixtures/irunfar-article.html', import.meta.url), 'utf8');

describe('extractPage', () => {
  it('pulls the article text, the main photo and its credit', () => {
    const p = extractPage(html, 'https://www.irunfar.com/some-article', 'iRunFar');
    expect(p.text && p.text.length).toBeGreaterThan(500);
    expect(p.text).not.toMatch(/Subscribe|Cookie/i);
    expect(p.imageUrl).toMatch(/^https:\/\//);
    expect(p.photoCredit === null || p.photoCredit.length < 80).toBe(true);
  });

  it('a page with no article body gives null text, not the menu', () => {
    const p = extractPage('<html><body><nav>Home Races</nav></body></html>', 'https://x.test/a', 'X');
    expect(p.text).toBeNull();
  });

  it('reads the full handle from a WordPress caption, not a dot-truncated prefix', () => {
    const p = extractPage(html, 'https://www.irunfar.com/some-article', 'iRunFar');
    expect(p.photoCredit).toBe('@rising.story');
    expect(p.text).not.toContain('Photo: @rising.story');
  });

  it('stops a credit at a sentence-ending period, not just any dot', () => {
    const p = extractPage(
      '<html><body><article><figcaption>Photo: Jane Doe. Runners at the start</figcaption><p>' +
        'x'.repeat(41) + '</p><p>' + 'y'.repeat(41) + '</p><p>' + 'z'.repeat(41) + '</p></article></body></html>',
      'https://x.test/a',
      'X',
    );
    expect(p.photoCredit).toBe('Jane Doe');
  });
});

describe('pickImageUrl', () => {
  it('prefers the page image when the page has one', () => {
    expect(pickImageUrl('https://example.test/real.jpg', 'https://example.test/feed.jpg')).toBe('https://example.test/real.jpg');
  });

  it('falls back to the feed image when the page has none', () => {
    expect(pickImageUrl(null, 'https://example.test/feed.jpg')).toBe('https://example.test/feed.jpg');
  });

  it('never falls back to a stock Unsplash placeholder', () => {
    expect(pickImageUrl(null, 'https://images.unsplash.com/photo-123?w=800&q=80')).toBeNull();
  });

  it('never falls back to a known SOURCE_PLACEHOLDERS value', () => {
    const placeholder = SOURCE_PLACEHOLDERS['Athletics Weekly'];
    expect(pickImageUrl(null, placeholder)).toBeNull();
  });

  it('returns null when neither image exists', () => {
    expect(pickImageUrl(null, null)).toBeNull();
  });
  it('reads a page with no <article> or <main>, as Athletics Weekly builds them', () => {
    const para = (t: string) => `<p dir="ltr">${t}</p>`;
    const html = `<html><body><nav><p>${'Menu item that is long enough to count as a paragraph here'}</p></nav>
      <div class="hustle-inline-content">${para('Niels Laros has revealed he underwent Achilles tendon surgery four weeks ago in the Netherlands.')}
      ${para('The 21-year-old Dutchman has not raced since finishing second in the Paris Diamond League on June 28.')}
      ${para('It was only the second race of a season badly disrupted by the same problem as last year.')}</div>
      <footer><p>Footer text that is long enough to count as a paragraph on its own</p></footer></body></html>`;
    const p = extractPage(html, 'https://athleticsweekly.com/news/laros', 'Athletics Weekly');
    expect(p.text).toContain('Achilles tendon surgery');
    expect(p.text).not.toContain('Menu item');
    expect(p.text).not.toContain('Footer text');
  });
  it('skips related-post <article> cards for the story in <main>, as Run Ultra builds them', () => {
    const card = (t: string) => `<article class="elementor-post"><p>${t} is a related post teaser long enough to count</p></article>`;
    const para = (t: string) => `<p>${t} and enough words to count as a real paragraph.</p>`;
    const html = `<html><body><main>${para('Karen Nash won the women\'s race at the 13 Valleys Ultra')}
      ${para('The flagship course runs 185.7km through the Lake District')}${para('She finished in 35:58:26')}
      ${card('Whistler')}${card('Dragon\'s Back')}</main></body></html>`;
    const p = extractPage(html, 'https://run-ultra.com/news/x', 'Run Ultra');
    expect(p.text).toContain('Karen Nash');
    expect(p.text).toContain('35:58:26');
  });
});
