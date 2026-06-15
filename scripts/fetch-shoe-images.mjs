#!/usr/bin/env node
// Fetch product images for shoes with source-verified accuracy.
//
// Accuracy strategy — verify the SOURCE PAGE, not just the pixels:
//   1. Find the shoe's product page on the brand website or a trusted retailer
//   2. Verify the page URL + title match the exact shoe (version-aware)
//   3. Extract the main product image from that verified page (OG image / meta tags)
//   4. Vision confirms the image is a usable product shot (not lifestyle, not broken)
//
// Fallback: Brave image search with source-page verification + Vision identification.
//
// Run: node --env-file=.env scripts/fetch-shoe-images.mjs
// Options:
//   --limit 10             only process first N shoes
//   --slug hoka-clifton-9  only process one shoe by slug
//   --force                re-fetch even if image_url already set
//   --dry-run              show results without writing to DB

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import {
  findVersionConflict,
  getAdjacentVersionStrings,
  urlMatchesShoe,
  sleep,
} from './shoe-utils.mjs';

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY;

if (!BRAVE_KEY) { console.error('Missing BRAVE_SEARCH_API_KEY'); process.exit(1); }
if (!process.env.ANTHROPIC_API_KEY) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1); }

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const slugIdx = args.indexOf('--slug');
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : null;
const SLUG = slugIdx !== -1 ? args[slugIdx + 1] : null;

const BRAND_DOMAINS = {
  Hoka: 'hoka.com',
  Brooks: 'brooksrunning.com',
  Saucony: 'saucony.com',
  ASICS: 'asics.com',
  'New Balance': 'newbalance.co.uk',
  Nike: 'nike.com',
  Adidas: 'adidas.co.uk',
  On: 'on.com',
  Salomon: 'salomon.com',
  Altra: 'altrarunning.com',
  'La Sportiva': 'lasportiva.com',
  'Inov-8': 'inov-8.com',
  Scott: 'scott-sports.com',
  Dynafit: 'dynafit.com',
  Merrell: 'merrell.com',
  'The North Face': 'thenorthface.com',
  Puma: 'puma.com',
  Mizuno: 'mizuno.com',
  "Arc'teryx": 'arcteryx.com',
  'Topo Athletic': 'topoathletic.com',
  Craft: 'craftsportswear.com',
  Mammut: 'mammut.com',
  Reebok: 'reebok.com',
};

const RETAILER_DOMAINS = [
  'sportsshoes.com',
  'runnersneed.com',
  'wiggle.com',
  'startfitness.co.uk',
  'sportpursuit.com',
  'runrepeat.com',
  'running-shoe-guru.com',
  'roadrunnersports.com',
];

// ── Search ──────────────────────────────────────────────────────────

async function braveWebSearch(query, count = 8) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&search_lang=en`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': BRAVE_KEY },
  });
  if (!res.ok) { console.warn(`  ⚠ Web search failed (${res.status})`); return []; }
  const data = await res.json();
  return (data.web?.results ?? []).map(r => ({ title: r.title ?? '', url: r.url ?? '', description: r.description ?? '' }));
}

async function braveImageSearch(query, count = 8) {
  const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=${count}&search_lang=en&safesearch=strict`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': BRAVE_KEY },
  });
  if (!res.ok) { console.warn(`  ⚠ Image search failed (${res.status})`); return []; }
  const data = await res.json();
  return (data.results ?? [])
    .map(r => ({
      fullUrl: r.properties?.url ?? null,
      thumbnailUrl: r.thumbnail?.src ?? null,
      pageUrl: r.url ?? '',
      title: r.title ?? '',
    }))
    .filter(r => r.thumbnailUrl);
}

// ── Page scraping ───────────────────────────────────────────────────

function decodeHtmlEntities(text) {
  return text
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

async function fetchPageData(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).replace(/\s+/g, ' ').trim() : '';

    // Extract images — prioritise in order of reliability
    const images = [];

    // 1. OG image (most reliable on product pages)
    const ogMatches = [...html.matchAll(/<meta\s+(?:property|name)="og:image(?::url)?"\s+content="([^"]+)"/gi)];
    for (const m of ogMatches) images.push({ url: m[1], source: 'og:image' });
    // Also handle content-first attribute order
    const ogMatches2 = [...html.matchAll(/<meta\s+content="([^"]+)"\s+(?:property|name)="og:image(?::url)?"/gi)];
    for (const m of ogMatches2) images.push({ url: m[1], source: 'og:image' });

    // 2. Twitter image
    const twMatches = [...html.matchAll(/<meta\s+(?:property|name)="twitter:image"\s+content="([^"]+)"/gi)];
    for (const m of twMatches) images.push({ url: m[1], source: 'twitter:image' });
    const twMatches2 = [...html.matchAll(/<meta\s+content="([^"]+)"\s+(?:property|name)="twitter:image"/gi)];
    for (const m of twMatches2) images.push({ url: m[1], source: 'twitter:image' });

    // 3. JSON-LD product image
    const jsonLdBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis)];
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

    // Deduplicate and make absolute
    const seen = new Set();
    const uniqueImages = [];
    for (const img of images) {
      let imgUrl = img.url;
      if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
      else if (imgUrl.startsWith('/')) {
        const base = new URL(url);
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

// ── Image URL validation (no API calls) ─────────────────────────────

function isLikelyProductImage(imageUrl) {
  const urlLower = imageUrl.toLowerCase();

  // Reject obvious logos, icons, and branding images
  const rejectPatterns = [
    /logo/i, /icon/i, /favicon/i, /brand/i, /swoosh/i,
    /placeholder/i, /default/i, /avatar/i, /badge/i,
    /social[-_]?share/i, /og[-_]?image/i, /banner/i,
    /sprite/i, /pixel/i, /spacer/i, /blank/i,
  ];
  for (const pat of rejectPatterns) {
    if (pat.test(urlLower)) return false;
  }

  // Reject very generic filenames (e.g., "image.png" with no product context)
  const filename = urlLower.split('/').pop()?.split('?')[0] ?? '';
  if (/^image\.(png|jpg|jpeg|webp)$/.test(filename)) return false;

  // Must be an actual image format
  if (!urlLower.match(/\.(jpg|jpeg|png|webp|avif)/i) && !urlLower.includes('/image')) return false;

  return true;
}

async function checkImageSize(imageUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(imageUrl, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };

    const contentLength = parseInt(res.headers.get('content-length') ?? '0');
    const contentType = res.headers.get('content-type') ?? '';

    if (!contentType.startsWith('image/')) return { ok: false, reason: `not an image (${contentType})` };
    if (contentLength > 0 && contentLength < 5000) return { ok: false, reason: `too small (${contentLength}B — likely a logo)` };

    return { ok: true, size: contentLength };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

function isProductPageUrl(url) {
  const urlLower = url.toLowerCase();
  const productPatterns = [/\/product[s]?\//i, /\/shop\//i, /\/p\//i, /\/pd\//i, /\/buy\//i, /\/item\//i];
  const articlePatterns = [/\/a\//i, /\/news\//i, /\/article[s]?\//i, /\/blog\//i, /\/release-info/i, /\/stories\//i];

  const isProduct = productPatterns.some(p => p.test(urlLower));
  const isArticle = articlePatterns.some(p => p.test(urlLower));

  return { isProduct, isArticle };
}

// ── Source verification ─────────────────────────────────────────────

function verifyPageMatchesShoe(brand, model, pageUrl, pageTitle) {
  const modelLower = model.toLowerCase();
  const titleLower = pageTitle.toLowerCase();

  // Check for version conflicts in the title
  const conflict = findVersionConflict(model, pageTitle);
  if (conflict) return { match: false, reason: `title mentions "${conflict}" instead` };

  // Strong match: URL slug contains the shoe name
  const urlMatch = urlMatchesShoe(pageUrl, brand, model);

  // Title contains the exact model
  const titleMatch = titleLower.includes(modelLower);

  if (urlMatch && titleMatch) return { match: true, confidence: 'high', reason: 'URL + title match' };
  if (urlMatch) return { match: true, confidence: 'high', reason: 'URL slug match' };
  if (titleMatch) return { match: true, confidence: 'medium', reason: 'title match' };

  return { match: false, reason: 'neither URL nor title mention the model' };
}

// ── Vision (lightweight confirmation only) ──────────────────────────

async function visionConfirmProductShot(imageUrl) {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Is this a clean product photo of a single running shoe or pair of running shoes? (Not a lifestyle photo, not a person wearing them, not a logo, not broken/tiny)

Reply ONLY: YES or NO`,
          },
          { type: 'image', source: { type: 'url', url: imageUrl } },
        ],
      }],
    });
    return msg.content[0].text.trim().toUpperCase().startsWith('YES');
  } catch (err) {
    console.warn(`    ⚠ Vision error: ${err.message}`);
    return null; // null = inconclusive, let image validation decide
  }
}

// Heavier vision: used in fallback when we DON'T have source verification
async function visionIdentifyShoe(brand, model, candidates) {
  if (candidates.length === 0) return null;

  const adjacents = getAdjacentVersionStrings(model);
  const adjacentWarning = adjacents.length > 0
    ? `\n- REJECT if the shoe is actually: ${adjacents.join(', ')}`
    : '';

  const content = [
    {
      type: 'text',
      text: `I need the correct product image for the ${brand} ${model} running shoe.

RULES:
- Version numbers MUST match exactly. I need "${model}", not any other version.${adjacentWarning}
- Product shots only — not lifestyle, not a person wearing them.
- If unsure, reply 0.

Reply with ONLY the number (1–${candidates.length}) of the best match, or 0 if none.`,
    },
  ];

  for (let i = 0; i < candidates.length; i++) {
    content.push({ type: 'text', text: `Image ${i + 1} (page: "${candidates[i].title.slice(0, 50)}"):` });
    content.push({ type: 'image', source: { type: 'url', url: candidates[i].thumbnailUrl } });
  }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 10,
      messages: [{ role: 'user', content }],
    });
    const choice = parseInt(msg.content[0].text.trim());
    if (!isNaN(choice) && choice > 0 && choice <= candidates.length) {
      return candidates[choice - 1];
    }
  } catch (err) {
    console.warn(`    ⚠ Vision error: ${err.message}`);
  }
  return null;
}

// ── Strategy 1: Product page scrape ─────────────────────────────────

async function tryProductPageScrape(brand, model) {
  const brandDomain = BRAND_DOMAINS[brand];
  const allDomains = brandDomain ? [brandDomain, ...RETAILER_DOMAINS] : RETAILER_DOMAINS;

  for (const domain of allDomains) {
    const query = `site:${domain} "${brand} ${model}"`;
    const results = await braveWebSearch(query, 5);
    await sleep(1100);

    // Sort: product/shop pages first, articles last
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

      const { isArticle } = isProductPageUrl(result.url);
      console.log(`    Page verified (${verification.confidence}${isArticle ? ', article — images may be generic' : ''}): ${result.url.slice(0, 70)}`);

      const pageData = await fetchPageData(result.url);
      if (!pageData || pageData.images.length === 0) {
        console.log(`    No images extractable from page`);
        continue;
      }

      // Try each image from the verified page
      for (const img of pageData.images) {
        // Quick validation: reject logos, tiny files, non-images
        if (!isLikelyProductImage(img.url)) {
          console.log(`    ${img.source}: URL looks like a logo/generic — skipped`);
          continue;
        }

        const sizeCheck = await checkImageSize(img.url);
        if (!sizeCheck.ok) {
          console.log(`    ${img.source}: ${sizeCheck.reason} — skipped`);
          continue;
        }

        // Vision confirmation (if available)
        const visionResult = await visionConfirmProductShot(img.url);
        if (visionResult === false) {
          console.log(`    ${img.source} image rejected by vision — trying next`);
          continue;
        }
        // visionResult is true (confirmed) or null (API error — trust image validation)
        return {
          url: img.url,
          method: `product-page (${domain})`,
          confidence: visionResult === true ? verification.confidence : 'medium',
          pageUrl: result.url,
          imageSource: img.source,
        };
      }

      await sleep(500);
    }
  }

  return null;
}

// ── Strategy 2: Image search with source verification ───────────────

async function tryImageSearchWithSourceVerification(brand, model) {
  const queries = [
    `"${brand} ${model}" running shoe`,
    `${brand} ${model} running shoe product`,
  ];

  for (const query of queries) {
    const candidates = await braveImageSearch(query);
    await sleep(1100);

    // Filter candidates by source page verification
    const verified = [];
    for (const c of candidates) {
      // Check if the source page title mentions the exact model with no version conflict
      const conflict = findVersionConflict(model, c.title);
      if (conflict) continue;
      if (!c.title.toLowerCase().includes(model.toLowerCase())) continue;
      verified.push(c);
    }

    if (verified.length > 0) {
      console.log(`    ${verified.length} source-verified image candidates`);

      // For source-verified images, validate then confirm with vision
      for (const c of verified) {
        const imgUrl = c.fullUrl ?? c.thumbnailUrl;

        if (!isLikelyProductImage(imgUrl)) continue;
        const sizeCheck = await checkImageSize(imgUrl);
        if (!sizeCheck.ok) continue;

        const visionResult = await visionConfirmProductShot(imgUrl);
        if (visionResult === false) continue;
        return {
          url: imgUrl,
          method: 'image-search (source-verified)',
          confidence: visionResult === true ? 'medium' : 'low',
          pageUrl: c.pageUrl,
        };
      }
    }
  }

  return null;
}

// ── Strategy 3: Image search with vision identification (fallback) ──

async function tryImageSearchWithVision(brand, model) {
  const queries = [
    `"${brand} ${model}" running shoe`,
    `${brand} ${model} running shoe product image`,
  ];

  for (const query of queries) {
    let candidates = await braveImageSearch(query);
    await sleep(1100);

    // Pre-filter: remove candidates with version conflicts in title
    candidates = candidates.filter(c => !findVersionConflict(model, c.title));

    if (candidates.length === 0) continue;

    console.log(`    ${candidates.length} candidates for vision identification`);

    const picked = await visionIdentifyShoe(brand, model, candidates);
    if (picked) {
      return {
        url: picked.fullUrl ?? picked.thumbnailUrl,
        method: 'image-search (vision-identified)',
        confidence: 'low',
        pageUrl: picked.pageUrl,
      };
    }
  }

  return null;
}

// ── Orchestrator ────────────────────────────────────────────────────

async function findImageForShoe(shoe) {
  const { brand, model } = shoe;

  // Strategy 1: Product page scrape (highest confidence)
  console.log(`  Strategy 1: Product page scrape`);
  let result = await tryProductPageScrape(brand, model);
  if (result) return result;

  // Strategy 2: Image search + source verification (medium confidence)
  console.log(`  Strategy 2: Image search + source verification`);
  result = await tryImageSearchWithSourceVerification(brand, model);
  if (result) return result;

  // Strategy 3: Image search + vision identification (lowest confidence)
  console.log(`  Strategy 3: Image search + vision identification`);
  result = await tryImageSearchWithVision(brand, model);
  if (result) return result;

  return null;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const where = {};
  if (SLUG) {
    where.slug = SLUG;
  } else if (!force) {
    where.image_url = null;
  }

  const shoes = await prisma.shoes.findMany({
    where,
    orderBy: { brand: 'asc' },
    take: LIMIT ?? undefined,
  });

  console.log(`Fetching images for ${shoes.length} shoes...\n`);
  if (dryRun) console.log('Dry run: no database writes\n');

  let found = 0;
  let failed = 0;
  const results = [];

  for (const shoe of shoes) {
    console.log(`\n── ${shoe.brand} ${shoe.model} ──`);

    const result = await findImageForShoe(shoe);

    if (result) {
      if (!dryRun) {
        await prisma.shoes.update({
          where: { id: shoe.id },
          data: { image_url: result.url },
        });
      }
      console.log(`  ✓ ${result.method} [${result.confidence}]`);
      console.log(`    ${result.url.slice(0, 90)}`);
      found++;
      results.push({ shoe: `${shoe.brand} ${shoe.model}`, ...result });
    } else {
      if (force && !dryRun) {
        await prisma.shoes.update({ where: { id: shoe.id }, data: { image_url: null } });
      }
      console.log(`  ✗ No verified image found`);
      failed++;
      results.push({ shoe: `${shoe.brand} ${shoe.model}`, url: null });
    }
  }

  // Summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Done. Found: ${found}, Failed: ${failed}`);

  if (found > 0) {
    const byMethod = {};
    const byConfidence = {};
    for (const r of results) {
      if (!r.method) continue;
      byMethod[r.method] = (byMethod[r.method] || 0) + 1;
      byConfidence[r.confidence] = (byConfidence[r.confidence] || 0) + 1;
    }
    console.log(`\nBy method:`);
    for (const [method, count] of Object.entries(byMethod)) console.log(`  ${method}: ${count}`);
    console.log(`By confidence:`);
    for (const [conf, count] of Object.entries(byConfidence)) console.log(`  ${conf}: ${count}`);
  }

  if (failed > 0) {
    console.log(`\nFailed shoes:`);
    for (const r of results) {
      if (!r.url) console.log(`  ${r.shoe}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
