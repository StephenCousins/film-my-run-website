import Anthropic from '@anthropic-ai/sdk';

function getBraveKey(): string {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) throw new Error('BRAVE_SEARCH_API_KEY is not set');
  return key;
}

function getAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  return key;
}

// ── Version-aware utilities (ported from scripts/shoe-utils.mjs) ────

interface VersionInfo {
  base: string;
  version: string | null;
  versionNum: number | null;
  pattern: 'x-series' | 'v-prefix' | 'roman' | 'number' | 'none';
}

function parseModelVersion(model: string): VersionInfo {
  const xMatch = model.match(/^(.+?X)(\d+)$/);
  if (xMatch) {
    return { base: xMatch[1], version: xMatch[2], versionNum: parseInt(xMatch[2]), pattern: 'x-series' };
  }

  const vMatch = model.match(/^(.+?)\s+[vV](\d+)$/);
  if (vMatch) {
    return { base: vMatch[1], version: `v${vMatch[2]}`, versionNum: parseInt(vMatch[2]), pattern: 'v-prefix' };
  }

  const ROMAN_MAP: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
  const romanMatch = model.match(/^(.+?)\s+(I{1,3}|IV|VI{0,3}|V|VIII|IX|X)$/);
  if (romanMatch && ROMAN_MAP[romanMatch[2]] !== undefined) {
    return { base: romanMatch[1], version: romanMatch[2], versionNum: ROMAN_MAP[romanMatch[2]], pattern: 'roman' };
  }

  const numMatch = model.match(/^(.+?)\s+(\d+)$/);
  if (numMatch) {
    return { base: numMatch[1], version: numMatch[2], versionNum: parseInt(numMatch[2]), pattern: 'number' };
  }

  return { base: model, version: null, versionNum: null, pattern: 'none' };
}

function getAdjacentVersionStrings(model: string): string[] {
  const { base, versionNum, pattern } = parseModelVersion(model);
  if (versionNum === null) return [];

  const ROMANS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const result: string[] = [];

  for (let delta = -2; delta <= 3; delta++) {
    if (delta === 0) continue;
    const v = versionNum + delta;
    if (v < 1) continue;

    switch (pattern) {
      case 'x-series': result.push(`${base}${v}`); break;
      case 'v-prefix': result.push(`${base} v${v}`); result.push(`${base} V${v}`); break;
      case 'roman': if (v <= 10) result.push(`${base} ${ROMANS[v]}`); break;
      case 'number': result.push(`${base} ${v}`); break;
    }
  }
  return result;
}

function findVersionConflict(model: string, text: string): string | null {
  const textLower = text.toLowerCase();
  const modelLower = model.toLowerCase();
  const adjacents = getAdjacentVersionStrings(model);

  for (const adj of adjacents) {
    if (textLower.includes(adj.toLowerCase()) && !textLower.includes(modelLower)) {
      return adj;
    }
  }
  return null;
}

function isComparisonArticle(model: string, text: string): boolean {
  const textLower = text.toLowerCase();
  const modelLower = model.toLowerCase();
  if (!textLower.includes(modelLower)) return false;
  const adjacents = getAdjacentVersionStrings(model);
  return adjacents.some(adj => textLower.includes(adj.toLowerCase()));
}

function urlMatchesShoe(url: string, brand: string, model: string): boolean {
  const slug = `${brand}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
  return url.toLowerCase().includes(slug);
}

export function shoeToSlug(brand: string, model: string): string {
  return `${brand}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// ── Brave Search ────────────────────────────────────────────────────

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

async function braveWebSearch(query: string, count = 8): Promise<SearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&search_lang=en`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': getBraveKey() },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.web?.results ?? []).map((r: Record<string, string>) => ({
    title: r.title ?? '', url: r.url ?? '', description: r.description ?? '',
  }));
}

interface ImageSearchResult {
  fullUrl: string | null;
  thumbnailUrl: string | null;
  pageUrl: string;
  title: string;
}

async function braveImageSearch(query: string, count = 8): Promise<ImageSearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=${count}&search_lang=en&safesearch=strict`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': getBraveKey() },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.results ?? []) as Record<string, unknown>[])
    .map((r) => {
      const props = r.properties as Record<string, string> | undefined;
      const thumb = r.thumbnail as Record<string, string> | undefined;
      return {
        fullUrl: props?.url ?? null,
        thumbnailUrl: thumb?.src ?? null,
        pageUrl: (r.url as string) ?? '',
        title: (r.title as string) ?? '',
      };
    })
    .filter((r: ImageSearchResult) => r.thumbnailUrl);
}

// ── Claude helpers ──────────────────────────────────────────────────

function getAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: getAnthropicKey() });
}

// ── Parse shoe query ────────────────────────────────────────────────

interface ParsedShoe {
  brand: string;
  model: string;
  terrain: string;
  category: string;
  description: string;
  drop_mm: number | null;
  weight_g: number | null;
  stack_height_mm: number | null;
  price_gbp: number | null;
  release_year: number | null;
}

export async function parseShoeQuery(query: string): Promise<ParsedShoe> {
  const results = await braveWebSearch(`"${query}" running shoe specs`, 5);
  const snippets = results.slice(0, 3).map(r => `${r.title}\n${r.description}`).join('\n\n');

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Extract running shoe details from this search query and context.

Query: "${query}"

Search context:
${snippets}

Reply with ONLY valid JSON (no markdown):
{
  "brand": "Brand Name",
  "model": "Model Name (including version)",
  "terrain": "road" | "trail" | "both",
  "category": "daily_trainer" | "race" | "long_run" | "speed" | "ultra" | "stability" | "max_cushion" | "minimal",
  "description": "One sentence description of the shoe",
  "drop_mm": number or null,
  "weight_g": number or null (men's weight),
  "stack_height_mm": number or null,
  "price_gbp": number or null (price in pence, e.g. 16000 for £160),
  "release_year": number or null
}

Rules:
- Brand and model must be properly capitalized
- Model includes version number if applicable (e.g., "Clifton 9" not just "Clifton")
- Only include specs you're confident about, use null otherwise`,
    }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse shoe details from AI response');

  return JSON.parse(jsonMatch[0]);
}

// ── Fetch reviews ───────────────────────────────────────────────────

const REVIEW_SOURCES = [
  { key: 'runrepeat', domain: 'runrepeat.com' },
  { key: 'runners_world', domain: 'runnersworld.com' },
  { key: 'irunfar', domain: 'irunfar.com' },
  { key: 'believe_in_run', domain: 'believeintherun.com' },
  { key: 'the_run_testers', domain: 'theruntesters.com' },
];

function identifySource(url: string): string {
  for (const s of REVIEW_SOURCES) {
    if (url.includes(s.domain)) return s.key;
  }
  return 'other';
}

function extractExplicitScore(text: string): number | null {
  const outOf10 = text.match(/\b(\d(?:\.\d)?)\s*(?:\/\s*10|out of 10)/i);
  if (outOf10) { const s = parseFloat(outOf10[1]); if (s >= 0 && s <= 10) return s; }

  const runrepeatScore = text.match(/(?:runrepeat\s+)?score[:\s]+(\d(?:\.\d)?)\b/i);
  if (runrepeatScore) { const s = parseFloat(runrepeatScore[1]); if (s >= 0 && s <= 10) return s; }

  const outOf5 = text.match(/\b(\d(?:\.\d)?)\s*(?:\/\s*5|out of 5)/i);
  if (outOf5) { const s = parseFloat(outOf5[1]) * 2; if (s >= 0 && s <= 10) return s; }

  const outOf100 = text.match(/\b(\d{2,3})\s*(?:\/\s*100|out of 100|%)/i);
  if (outOf100) { const s = parseFloat(outOf100[1]) / 10; if (s >= 0 && s <= 10) return s; }

  const stars = text.match(/(\d(?:\.\d)?)\s*stars?\b/i);
  if (stars) { const s = parseFloat(stars[1]) * 2; if (s >= 0 && s <= 10) return s; }

  return null;
}

async function inferScoreFromText(brand: string, model: string, text: string): Promise<number | null> {
  if (!text || text.length < 60) return null;
  try {
    const anthropic = getAnthropicClient();
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Score this running shoe review snippet. Assign 0.0–10.0 based on sentiment toward the ${brand} ${model}.

Guide: 9.5–10 exceptional | 8.5–9.4 excellent | 7.5–8.4 good | 6.5–7.4 decent | 5–6.4 average | <5 poor

"${text.slice(0, 400)}"

Reply with ONLY a number like: 8.5`,
      }],
    });
    const score = parseFloat(msg.content[0].type === 'text' ? msg.content[0].text.trim() : '');
    if (!isNaN(score) && score >= 0 && score <= 10) return score;
  } catch { /* skip */ }
  return null;
}

async function claudeVerifyResult(brand: string, model: string, result: SearchResult): Promise<{ verified: boolean; reason: string }> {
  const adjacents = getAdjacentVersionStrings(model);
  const adjacentList = adjacents.length > 0
    ? `\nWATCH OUT for these different versions (must NOT be about any of these): ${adjacents.join(', ')}`
    : '';

  try {
    const anthropic = getAnthropicClient();
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      messages: [{
        role: 'user',
        content: `Is this search result a review of EXACTLY the ${brand} ${model} running shoe?
${adjacentList}

Title: "${result.title}"
URL: ${result.url}
Snippet: "${result.description.slice(0, 300)}"

Rules:
- Version numbers MUST match exactly. "${model}" is specific.
- A comparison "X vs Y" only counts if it reviews and scores the ${model} individually.
- A "best of" roundup counts if it scores the ${model} individually.

Reply: YES or NO, then a 5-word reason.`,
      }],
    });
    const answer = msg.content[0].type === 'text' ? msg.content[0].text.trim() : 'NO';
    return { verified: answer.toUpperCase().startsWith('YES'), reason: answer };
  } catch {
    return { verified: false, reason: 'API error' };
  }
}

export interface ReviewResult {
  source: string;
  source_url: string;
  expert_score: number;
  summary: string | null;
}

export async function fetchReviewsForShoe(brand: string, model: string): Promise<ReviewResult[]> {
  const primaryQuery = `"${brand} ${model}" running shoe review`;
  const allResults = await braveWebSearch(primaryQuery);
  await sleep(1100);

  const verifiedReviews: ReviewResult[] = [];
  const seenSources = new Set<string>();

  for (const result of allResults) {
    const source = identifySource(result.url);
    if (seenSources.has(source)) continue;

    const combined = `${result.title} ${result.description}`;

    if (!combined.toLowerCase().includes(model.toLowerCase())) continue;

    const conflict = findVersionConflict(model, result.title);
    if (conflict) continue;

    const urlMatch = urlMatchesShoe(result.url, brand, model);
    const isComparison = isComparisonArticle(model, combined);

    const needsVerify = isComparison || !urlMatch;
    if (needsVerify) {
      const { verified } = await claudeVerifyResult(brand, model, result);
      if (!verified) continue;
    }

    let score = extractExplicitScore(combined);
    if (score === null && result.description.length > 60) {
      score = await inferScoreFromText(brand, model, result.description);
    }

    if (score !== null) {
      seenSources.add(source);
      verifiedReviews.push({
        source,
        source_url: result.url,
        expert_score: score,
        summary: result.description.slice(0, 200) || null,
      });
    }
  }

  return verifiedReviews;
}

// ── Find image ──────────────────────────────────────────────────────

const BRAND_DOMAINS: Record<string, string> = {
  Hoka: 'hoka.com', Brooks: 'brooksrunning.com', Saucony: 'saucony.com',
  ASICS: 'asics.com', 'New Balance': 'newbalance.co.uk', Nike: 'nike.com',
  Adidas: 'adidas.co.uk', On: 'on.com', Salomon: 'salomon.com',
  Altra: 'altrarunning.com', 'La Sportiva': 'lasportiva.com', 'Inov-8': 'inov-8.com',
  Scott: 'scott-sports.com', Dynafit: 'dynafit.com', Merrell: 'merrell.com',
  'The North Face': 'thenorthface.com', Puma: 'puma.com', Mizuno: 'mizuno.com',
  "Arc'teryx": 'arcteryx.com', 'Topo Athletic': 'topoathletic.com',
  Craft: 'craftsportswear.com', Mammut: 'mammut.com', Reebok: 'reebok.com',
};

const RETAILER_DOMAINS = [
  'sportsshoes.com', 'runnersneed.com', 'wiggle.com', 'startfitness.co.uk',
  'sportpursuit.com', 'runrepeat.com', 'running-shoe-guru.com', 'roadrunnersports.com',
];

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

interface PageData {
  title: string;
  images: { url: string; source: string }[];
}

async function fetchPageData(pageUrl: string): Promise<PageData | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^]*?)<\/title>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).replace(/\s+/g, ' ').trim() : '';

    const images: { url: string; source: string }[] = [];

    const ogMatches = [...html.matchAll(/<meta\s+(?:property|name)="og:image(?::url)?"\s+content="([^"]+)"/gi)];
    for (const m of ogMatches) images.push({ url: m[1], source: 'og:image' });
    const ogMatches2 = [...html.matchAll(/<meta\s+content="([^"]+)"\s+(?:property|name)="og:image(?::url)?"/gi)];
    for (const m of ogMatches2) images.push({ url: m[1], source: 'og:image' });

    const twMatches = [...html.matchAll(/<meta\s+(?:property|name)="twitter:image"\s+content="([^"]+)"/gi)];
    for (const m of twMatches) images.push({ url: m[1], source: 'twitter:image' });
    const twMatches2 = [...html.matchAll(/<meta\s+content="([^"]+)"\s+(?:property|name)="twitter:image"/gi)];
    for (const m of twMatches2) images.push({ url: m[1], source: 'twitter:image' });

    const jsonLdBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([^]*?)<\/script>/gi)];
    for (const block of jsonLdBlocks) {
      try {
        const data = JSON.parse(block[1]);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item.image) {
            const imgs = Array.isArray(item.image) ? item.image : [item.image];
            for (const img of imgs) {
              const imgUrl = typeof img === 'string' ? img : img?.url;
              if (imgUrl) images.push({ url: imgUrl, source: 'json-ld' });
            }
          }
        }
      } catch { /* malformed JSON-LD */ }
    }

    const seen = new Set<string>();
    const uniqueImages: { url: string; source: string }[] = [];
    for (const img of images) {
      let imgUrl = img.url;
      if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
      else if (imgUrl.startsWith('/')) {
        const base = new URL(pageUrl);
        imgUrl = `${base.protocol}//${base.host}${imgUrl}`;
      }
      if (!seen.has(imgUrl) && imgUrl.match(/^https?:\/\//)) {
        seen.add(imgUrl);
        uniqueImages.push({ url: imgUrl, source: img.source });
      }
    }

    return { title, images: uniqueImages };
  } catch {
    return null;
  }
}

function isLikelyProductImage(imageUrl: string): boolean {
  const urlLower = imageUrl.toLowerCase();
  const rejectPatterns = [
    /logo/i, /icon/i, /favicon/i, /brand/i, /swoosh/i,
    /placeholder/i, /default/i, /avatar/i, /badge/i,
    /social[-_]?share/i, /og[-_]?image/i, /banner/i,
    /sprite/i, /pixel/i, /spacer/i, /blank/i,
  ];
  for (const pat of rejectPatterns) {
    if (pat.test(urlLower)) return false;
  }
  const filename = urlLower.split('/').pop()?.split('?')[0] ?? '';
  if (/^image\.(png|jpg|jpeg|webp)$/.test(filename)) return false;
  if (!urlLower.match(/\.(jpg|jpeg|png|webp|avif)/i) && !urlLower.includes('/image')) return false;
  return true;
}

async function checkImageSize(imageUrl: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(imageUrl, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const contentLength = parseInt(res.headers.get('content-length') ?? '0');
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) return { ok: false, reason: `not an image (${contentType})` };
    if (contentLength > 0 && contentLength < 5000) return { ok: false, reason: `too small (likely a logo)` };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

function isProductPageUrl(url: string): { isProduct: boolean; isArticle: boolean } {
  const urlLower = url.toLowerCase();
  const productPatterns = [/\/product[s]?\//i, /\/shop\//i, /\/p\//i, /\/pd\//i, /\/buy\//i, /\/item\//i];
  const articlePatterns = [/\/a\//i, /\/news\//i, /\/article[s]?\//i, /\/blog\//i, /\/release-info/i, /\/stories\//i];
  return {
    isProduct: productPatterns.some(p => p.test(urlLower)),
    isArticle: articlePatterns.some(p => p.test(urlLower)),
  };
}

function verifyPageMatchesShoe(brand: string, model: string, pageUrl: string, pageTitle: string): { match: boolean; confidence?: string; reason: string } {
  const conflict = findVersionConflict(model, pageTitle);
  if (conflict) return { match: false, reason: `title mentions "${conflict}" instead` };
  const urlMatch = urlMatchesShoe(pageUrl, brand, model);
  const titleMatch = pageTitle.toLowerCase().includes(model.toLowerCase());
  if (urlMatch && titleMatch) return { match: true, confidence: 'high', reason: 'URL + title match' };
  if (urlMatch) return { match: true, confidence: 'high', reason: 'URL slug match' };
  if (titleMatch) return { match: true, confidence: 'medium', reason: 'title match' };
  return { match: false, reason: 'neither URL nor title mention the model' };
}

async function visionConfirmProductShot(imageUrl: string): Promise<boolean | null> {
  try {
    const anthropic = getAnthropicClient();
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Is this a clean product photo of a single running shoe or pair of running shoes? (Not a lifestyle photo, not a person wearing them, not a logo, not broken/tiny)\n\nReply ONLY: YES or NO' },
          { type: 'image', source: { type: 'url', url: imageUrl } },
        ],
      }],
    });
    return (msg.content[0] as { type: 'text'; text: string }).text.trim().toUpperCase().startsWith('YES');
  } catch {
    return null;
  }
}

export interface ImageResult {
  url: string;
  method: string;
  confidence: string;
}

export async function findImageForShoe(brand: string, model: string): Promise<ImageResult | null> {
  // Strategy 1: Product page scrape
  const brandDomain = BRAND_DOMAINS[brand];
  const allDomains = brandDomain ? [brandDomain, ...RETAILER_DOMAINS] : RETAILER_DOMAINS;

  for (const domain of allDomains) {
    const query = `site:${domain} "${brand} ${model}"`;
    const results = await braveWebSearch(query, 5);
    await sleep(1100);

    results.sort((a, b) => {
      const aType = isProductPageUrl(a.url);
      const bType = isProductPageUrl(b.url);
      if (aType.isProduct && !bType.isProduct) return -1;
      if (!aType.isProduct && bType.isProduct) return 1;
      if (aType.isArticle && !bType.isArticle) return 1;
      if (!aType.isArticle && bType.isArticle) return -1;
      return 0;
    });

    for (const result of results) {
      const verification = verifyPageMatchesShoe(brand, model, result.url, result.title);
      if (!verification.match) continue;

      const pageData = await fetchPageData(result.url);
      if (!pageData || pageData.images.length === 0) continue;

      for (const img of pageData.images) {
        if (!isLikelyProductImage(img.url)) continue;
        const sizeCheck = await checkImageSize(img.url);
        if (!sizeCheck.ok) continue;
        const visionResult = await visionConfirmProductShot(img.url);
        if (visionResult === false) continue;
        return {
          url: img.url,
          method: `product-page (${domain})`,
          confidence: visionResult === true ? (verification.confidence ?? 'medium') : 'medium',
        };
      }
      await sleep(500);
    }
  }

  // Strategy 2: Image search with source verification
  const imageResults = await braveImageSearch(`"${brand} ${model}" running shoe`);
  await sleep(1100);

  const verified = imageResults.filter((c: ImageSearchResult) => {
    if (findVersionConflict(model, c.title)) return false;
    return c.title.toLowerCase().includes(model.toLowerCase());
  });

  for (const c of verified) {
    const imgUrl = c.fullUrl ?? c.thumbnailUrl;
    if (!imgUrl || !isLikelyProductImage(imgUrl)) continue;
    const sizeCheck = await checkImageSize(imgUrl);
    if (!sizeCheck.ok) continue;
    const visionResult = await visionConfirmProductShot(imgUrl);
    if (visionResult === false) continue;
    return {
      url: imgUrl,
      method: 'image-search (source-verified)',
      confidence: visionResult === true ? 'medium' : 'low',
    };
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
