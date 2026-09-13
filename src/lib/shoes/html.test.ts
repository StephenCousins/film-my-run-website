import { describe, it, expect, vi } from 'vitest';
import { extractJsonLdProducts, extractMetaImages, fetchPage } from './html';

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

describe('fetchPage', () => {
  const response = (status: number, body = '') => ({ ok: status >= 200 && status < 300, status, text: async () => body }) as unknown as Response;
  const fetchWith = (res: Response | (() => never)) => ({ fetch: (async () => (typeof res === 'function' ? res() : res)) as unknown as typeof fetch });

  it('returns html and the decoded, collapsed title on a 2xx', async () => {
    const r = await fetchPage('https://x/p', fetchWith(response(200, '<title>  Hoka &amp; Co\n Clifton </title><p>x</p>')));
    expect(r).toEqual({ html: '<title>  Hoka &amp; Co\n Clifton </title><p>x</p>', title: 'Hoka & Co Clifton' });
  });
  it('returns null when the page is gone (404/410)', async () => {
    expect(await fetchPage('https://x/p', fetchWith(response(404)))).toBeNull();
    expect(await fetchPage('https://x/p', fetchWith(response(410)))).toBeNull();
  });
  it('throws unreachable:<status> on 403, 406, 429 and 5xx', async () => {
    for (const status of [403, 406, 429, 500, 503]) {
      await expect(fetchPage('https://x/p', fetchWith(response(status)))).rejects.toThrow(`unreachable:${status}`);
    }
  });
  it('throws unreachable:network when the fetch itself fails', async () => {
    await expect(fetchPage('https://x/p', fetchWith(() => { throw new TypeError('fetch failed'); }))).rejects.toThrow('unreachable:network');
  });
  it('throws unreachable:timeout when the fetch is aborted', async () => {
    const deps = { fetch: (async (_url: unknown, init?: { signal?: AbortSignal }) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })) as unknown as typeof fetch };
    vi.useFakeTimers();
    try {
      const p = fetchPage('https://x/p', deps);
      const assertion = expect(p).rejects.toThrow('unreachable:timeout');
      await vi.advanceTimersByTimeAsync(10000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
