import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractPage } from './gather';

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
