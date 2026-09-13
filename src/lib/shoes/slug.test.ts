import { describe, it, expect } from 'vitest';
import { shoeToSlug, urlMatchesShoe } from './slug';

describe('shoeToSlug', () => {
  it('lower-cases and hyphenates', () => {
    expect(shoeToSlug('New Balance', 'Fresh Foam X 1080 V14')).toBe('new-balance-fresh-foam-x-1080-v14');
  });
  it('strips apostrophes and leading/trailing hyphens', () => {
    expect(shoeToSlug("Arc'teryx", ' Norvan LD 3 ')).toBe('arc-teryx-norvan-ld-3');
  });
});

describe('urlMatchesShoe', () => {
  it('matches when the slug is in the URL', () => {
    expect(urlMatchesShoe('https://www.hoka.com/en/gb/mens-road/clifton-10/1155141.html', 'Hoka', 'Clifton 10')).toBe(false);
    expect(urlMatchesShoe('https://sportsshoes.com/product/hoka-clifton-10-mens', 'Hoka', 'Clifton 10')).toBe(true);
  });
});
