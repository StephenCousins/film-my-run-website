import { describe, expect, it } from 'vitest';
import { wikipediaArticle } from './wikipedia';

const summary = (type: string, extra: object = {}) => JSON.stringify({ type, title: 'Ann Trason', content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Ann_Trason' } }, ...extra });
const extract = JSON.stringify({ query: { pages: { '1': { extract: 'Ann Trason is an American ultramarathon runner. She won Western States 14 times.' } } } });
const licence = JSON.stringify({ query: { pages: { '-1': { imageinfo: [{ extmetadata: { Artist: { value: '<a href="//x">Jane Smith</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } } }] } } } });

function getter(map: Record<string, string>) {
  return async (url: string) => Object.entries(map).find(([k]) => url.includes(k))?.[1] ?? null;
}

describe('a Wikipedia article', () => {
  it('gives the plain text, page link and the lead photo with its licence', async () => {
    const get = getter({
      '/page/summary/': summary('standard', { originalimage: { source: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Ann_Trason_1994.jpg', width: 1200, height: 900 } }),
      'prop=extracts': extract,
      'prop=imageinfo': licence,
    });
    const a = (await wikipediaArticle('Ann Trason', get))!;
    expect(a.url).toBe('https://en.wikipedia.org/wiki/Ann_Trason');
    expect(a.text).toContain('Western States 14 times');
    expect(a.image).toMatchObject({ kind: 'portrait', credit: 'Photo: Jane Smith / Wikimedia Commons', licence: 'CC BY-SA 4.0', source_url: 'https://commons.wikimedia.org/wiki/File:Ann_Trason_1994.jpg' });
  });
  it('a disambiguation page or a missing article is no article', async () => {
    expect(await wikipediaArticle('David Roche', getter({ '/page/summary/': summary('disambiguation') }))).toBeNull();
    expect(await wikipediaArticle('Nobody Atall', getter({}))).toBeNull();
  });
  it('an article with no photo, or an unreadable licence, has no photo', async () => {
    const a = await wikipediaArticle('Ann Trason', getter({ '/page/summary/': summary('standard'), 'prop=extracts': extract }));
    expect(a!.image).toBeNull();
  });
  it('originalimage sources with query strings are stripped when building the file title and photo url', async () => {
    const get = getter({
      '/page/summary/': summary('standard', { originalimage: { source: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Paula_Radcliffe_NYC_Marathon_2008_cropped.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled', width: 1200, height: 900 } }),
      'prop=extracts': extract,
      'prop=imageinfo': licence,
    });
    const a = (await wikipediaArticle('Ann Trason', get))!;
    expect(a.image).toMatchObject({ kind: 'portrait', credit: 'Photo: Jane Smith / Wikimedia Commons', licence: 'CC BY-SA 4.0', source_url: 'https://commons.wikimedia.org/wiki/File:Paula_Radcliffe_NYC_Marathon_2008_cropped.jpg' });
    expect(a.image!.url).toBe('https://upload.wikimedia.org/wikipedia/commons/6/62/Paula_Radcliffe_NYC_Marathon_2008_cropped.jpg');
  });
  it('a blocked (non-JSON) summary reply is no article', async () => {
    expect(await wikipediaArticle('Ann Trason', getter({ '/page/summary/': '<html>blocked</html>' }))).toBeNull();
  });
});
