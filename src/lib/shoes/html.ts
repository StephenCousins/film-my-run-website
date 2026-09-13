export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

export interface FetchPageDeps {
  fetch: typeof fetch;
}

/**
 * Fetch a page for the matchers. Three outcomes, because the gate needs to
 * tell them apart: `{ html, title }` on a 2xx; `null` when the page is gone
 * (404/410), which says the site is reachable and the page is not there; and
 * a thrown `unreachable:<status|timeout|network>` for everything else (403,
 * 406, 429, 5xx, no response) — hoka.com answers 406 and brooksrunning.com
 * 403 to a server-side fetch, and that says nothing about whether the shoe
 * exists.
 */
export async function fetchPage(pageUrl: string, deps: FetchPageDeps = { fetch }): Promise<{ html: string; title: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let res: Response;
  let html: string;
  try {
    res = await deps.fetch(pageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      redirect: 'follow',
    });
    if (res.status === 404 || res.status === 410) return null;
    if (!res.ok) throw new Error(`unreachable:${res.status}`);
    html = await res.text();
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('unreachable:')) throw err;
    throw new Error(`unreachable:${controller.signal.aborted ? 'timeout' : 'network'}`);
  } finally {
    clearTimeout(timeout);
  }
  const titleMatch = html.match(/<title[^>]*>([^]*?)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).replace(/\s+/g, ' ').trim() : '';
  return { html, title };
}

export interface JsonLdProduct {
  name?: string;
  image: string[];
  releaseDate?: string;
  url?: string;
  description?: string;
  brand?: string;
}

// Only Product entities. Retailer pages embed related-product carousels in
// JSON-LD too, and taking image off any entity pulled those in — which is
// how a Mafate hiking boot ended up on the Mafate X, from a page that
// genuinely was about the Mafate X.
const isProduct = (item: { '@type'?: unknown }) => {
  const t = item['@type'];
  return t === 'Product' || (Array.isArray(t) && t.includes('Product'));
};

type JsonLdNode = Record<string, unknown>;

/**
 * Walk a JSON-LD document for Product nodes. Products can sit at the top
 * level, inside an `@graph` array, or inside an `ItemList.itemListElement[]`
 * either directly or wrapped in a `ListItem` whose `.item` is the Product.
 */
function collectProducts(node: unknown, out: JsonLdNode[]): void {
  if (Array.isArray(node)) {
    for (const n of node) collectProducts(n, out);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const item = node as JsonLdNode;
  if (isProduct(item)) {
    out.push(item);
    return;
  }
  if (Array.isArray(item['@graph'])) collectProducts(item['@graph'], out);
  if (Array.isArray(item.itemListElement)) collectProducts(item.itemListElement, out);
  if (item['@type'] === 'ListItem' && item.item) collectProducts(item.item, out);
}

function toProduct(item: JsonLdNode): JsonLdProduct {
  const image: string[] = [];
  if (item.image) {
    const imgs = Array.isArray(item.image) ? item.image : [item.image];
    for (const img of imgs) {
      const imgUrl = typeof img === 'string' ? img : (img as { url?: string } | null)?.url;
      if (imgUrl) image.push(imgUrl);
    }
  }
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const brand = typeof item.brand === 'string' ? item.brand : str((item.brand as { name?: unknown } | null)?.name);
  return {
    name: str(item.name),
    image,
    releaseDate: str(item.releaseDate),
    url: str(item.url),
    description: str(item.description),
    brand,
  };
}

export function extractJsonLdProducts(html: string): JsonLdProduct[] {
  const products: JsonLdProduct[] = [];
  const jsonLdBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([^]*?)<\/script>/gi)];
  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block[1]);
      const found: JsonLdNode[] = [];
      collectProducts(data, found);
      for (const item of found) products.push(toProduct(item));
    } catch { /* malformed JSON-LD */ }
  }
  return products;
}

export function extractMetaImages(html: string, baseUrl: string): string[] {
  const images: string[] = [];

  const ogMatches = [...html.matchAll(/<meta\s+(?:property|name)="og:image(?::url)?"\s+content="([^"]+)"/gi)];
  for (const m of ogMatches) images.push(m[1]);
  const ogMatches2 = [...html.matchAll(/<meta\s+content="([^"]+)"\s+(?:property|name)="og:image(?::url)?"/gi)];
  for (const m of ogMatches2) images.push(m[1]);

  const twMatches = [...html.matchAll(/<meta\s+(?:property|name)="twitter:image"\s+content="([^"]+)"/gi)];
  for (const m of twMatches) images.push(m[1]);
  const twMatches2 = [...html.matchAll(/<meta\s+content="([^"]+)"\s+(?:property|name)="twitter:image"/gi)];
  for (const m of twMatches2) images.push(m[1]);

  const seen = new Set<string>();
  const uniqueImages: string[] = [];
  for (const img of images) {
    let imgUrl = img;
    if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
    else if (imgUrl.startsWith('/')) {
      const base = new URL(baseUrl);
      imgUrl = `${base.protocol}//${base.host}${imgUrl}`;
    }
    if (!seen.has(imgUrl) && imgUrl.match(/^https?:\/\//)) {
      seen.add(imgUrl);
      uniqueImages.push(imgUrl);
    }
  }
  return uniqueImages;
}
