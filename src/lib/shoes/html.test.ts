import { describe, it, expect } from 'vitest';
import { extractJsonLdProducts, extractMetaImages } from './html';

const page = `<html><head><title>Hoka Clifton 10</title>
<meta property="og:image" content="/img/og.jpg">
<script type="application/ld+json">{"@type":"Product","name":"Clifton 10","image":["https://cdn/a.jpg","https://cdn/b.jpg"],"releaseDate":"2026-02-01"}</script>
<script type="application/ld+json">{"@type":"BreadcrumbList","image":"https://cdn/crumb.jpg"}</script>
<script type="application/ld+json">[{"@type":["Product","Thing"],"image":{"url":"https://cdn/c.jpg"}}]</script>
</head></html>`;

const listPage = `<html><head>
<script type="application/ld+json">{"@type":"ItemList","itemListElement":[
  {"@type":"ListItem","position":1,"item":{"@type":"Product","name":"Speedgoat 6","image":"https://cdn/sg6.jpg","brand":{"@type":"Brand","name":"Hoka"},"url":"https://www.hoka.com/speedgoat-6"}},
  {"@type":"Product","name":"Mafate Speed 4","image":["https://cdn/ms4.jpg"],"brand":"Hoka"},
  {"@type":"ListItem","position":3,"item":{"@type":"Article","name":"Not a shoe","image":"https://cdn/article.jpg"}}
]}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
  {"@type":"WebPage","name":"Page"},
  {"@type":"Product","name":"Clifton 10","image":"https://cdn/graph.jpg","description":"Daily trainer."}
]}</script>
</head></html>`;

describe('extractJsonLdProducts', () => {
  it('returns only Product entities with images flattened', () => {
    const p = extractJsonLdProducts(page);
    expect(p).toHaveLength(2);
    expect(p[0]).toMatchObject({ name: 'Clifton 10', image: ['https://cdn/a.jpg', 'https://cdn/b.jpg'], releaseDate: '2026-02-01' });
    expect(p[1].image).toEqual(['https://cdn/c.jpg']);
  });

  it('finds Products nested in ItemList.itemListElement and @graph', () => {
    const p = extractJsonLdProducts(listPage);
    expect(p.map(x => x.name)).toEqual(['Speedgoat 6', 'Mafate Speed 4', 'Clifton 10']);
    expect(p[0]).toMatchObject({ image: ['https://cdn/sg6.jpg'], brand: 'Hoka', url: 'https://www.hoka.com/speedgoat-6' });
    expect(p[1]).toMatchObject({ image: ['https://cdn/ms4.jpg'], brand: 'Hoka' });
    expect(p[2]).toMatchObject({ image: ['https://cdn/graph.jpg'], description: 'Daily trainer.' });
  });

  it('skips malformed JSON-LD blocks', () => {
    expect(extractJsonLdProducts('<script type="application/ld+json">{not json</script>')).toEqual([]);
  });
});

describe('extractMetaImages', () => {
  it('resolves relative og:image against the page URL', () => {
    expect(extractMetaImages(page, 'https://www.hoka.com/en/gb/x')).toEqual(['https://www.hoka.com/img/og.jpg']);
  });

  it('collects og and twitter images in either attribute order, de-duplicated, with // resolved', () => {
    const html = `<meta content="//cdn/tw.jpg" name="twitter:image"><meta property="og:image" content="//cdn/tw.jpg"><meta property="og:image:url" content="https://cdn/og2.jpg">`;
    expect(extractMetaImages(html, 'https://x.com/p')).toEqual(['https://cdn/tw.jpg', 'https://cdn/og2.jpg']);
  });
});
