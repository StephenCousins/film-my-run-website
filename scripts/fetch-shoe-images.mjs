#!/usr/bin/env node
// Fetch correct product images for shoes using Brave Image Search + Claude Vision
// Brave finds candidates, Opus 4.8 visually verifies which image is the correct shoe
// Run: node --env-file=.env scripts/fetch-shoe-images.mjs
// Options:
//   --limit 10             only process first N shoes
//   --slug hoka-clifton-9  only process one shoe by slug
//   --force                re-fetch even if image_url already set

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY;

if (!BRAVE_KEY) { console.error('Missing BRAVE_SEARCH_API_KEY'); process.exit(1); }
if (!process.env.ANTHROPIC_API_KEY) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1); }

const args = process.argv.slice(2);
const limitArg = args.indexOf('--limit');
const slugArg = args.indexOf('--slug');
const force = args.includes('--force');
const LIMIT = limitArg !== -1 ? parseInt(args[limitArg + 1]) : null;
const SLUG = slugArg !== -1 ? args[slugArg + 1] : null;

async function braveImageSearch(query) {
  const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=5&search_lang=en&safesearch=strict`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_KEY,
    },
  });
  if (!res.ok) {
    console.warn(`  Image search failed (${res.status})`);
    return [];
  }
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

async function pickBestImageWithVision(brand, model, candidates) {
  if (candidates.length === 0) return null;

  const content = [
    {
      type: 'text',
      text: `I need the correct product image for the ${brand} ${model} running shoe.

CRITICAL RULES:
- Version numbers matter. "${model}" is a specific version. If an image shows a different version (e.g. you need "Tecton X2" but the shoe says "Tecton X3"), reject it and reply 0.
- Brand matters. Only accept images showing a ${brand} shoe.
- Reject images showing a person wearing the shoe — product shots only.
- If you are not confident the image shows exactly the ${brand} ${model}, reply 0.

Look at each image carefully and reply with ONLY the number (1–${candidates.length}) of the image that correctly shows the ${brand} ${model}, or 0 if none are a confident match.`,
    },
  ];

  for (let i = 0; i < candidates.length; i++) {
    content.push({ type: 'text', text: `Image ${i + 1}:` });
    content.push({
      type: 'image',
      source: { type: 'url', url: candidates[i].thumbnailUrl },
    });
  }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 5,
      messages: [{ role: 'user', content }],
    });

    const choice = parseInt(msg.content[0].text.trim());
    if (!isNaN(choice) && choice > 0 && choice <= candidates.length) {
      const picked = candidates[choice - 1];
      // Prefer the full-resolution URL if available, else thumbnail
      return picked.fullUrl ?? picked.thumbnailUrl;
    }
  } catch (err) {
    console.warn(`  Vision error: ${err.message}`);
  }

  return null;
}

async function findImageForShoe(shoe) {
  // Quoted query forces exact model name match in search results
  const query = `"${shoe.brand} ${shoe.model}" running shoe`;
  const candidates = await braveImageSearch(query);

  if (candidates.length === 0) return null;

  console.log(`  Found ${candidates.length} candidates — asking Opus to verify...`);
  return pickBestImageWithVision(shoe.brand, shoe.model, candidates);
}

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

  let found = 0;
  let failed = 0;

  for (const shoe of shoes) {
    console.log(`${shoe.brand} ${shoe.model}`);

    const imageUrl = await findImageForShoe(shoe);

    if (imageUrl) {
      await prisma.shoes.update({
        where: { id: shoe.id },
        data: { image_url: imageUrl },
      });
      console.log(`  ✓ ${imageUrl.slice(0, 80)}`);
      found++;
    } else {
      console.log(`  ✗ No matching image found`);
      failed++;
    }

    // Rate limit between shoes
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\nDone. Found: ${found}, Failed: ${failed}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
