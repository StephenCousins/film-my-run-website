#!/usr/bin/env node
// Fix a specific shoe by clearing its data and re-fetching
// Run: node --env-file=.env scripts/fix-shoe.mjs --slug hoka-tecton-x2

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY;

const slugArg = process.argv.indexOf('--slug');
if (slugArg === -1) { console.error('Usage: node fix-shoe.mjs --slug <slug>'); process.exit(1); }
const SLUG = process.argv[slugArg + 1];

async function braveImageSearch(query) {
  const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=8&search_lang=en&safesearch=strict`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': BRAVE_KEY },
  });
  if (!res.ok) { console.warn(`Image search failed (${res.status})`); return []; }
  const data = await res.json();
  return (data.results ?? []).map(r => ({
    fullUrl: r.properties?.url ?? null,
    thumbnailUrl: r.thumbnail?.src ?? null,
    pageUrl: r.url ?? '',
  })).filter(r => r.thumbnailUrl);
}

async function pickBestImage(brand, model, candidates) {
  if (candidates.length === 0) return null;
  const content = [
    {
      type: 'text',
      text: `I need the product image for the ${brand} ${model} running shoe.

STRICT RULES — reject and reply 0 if:
- The shoe is a different version (e.g. need "${model}" but image shows a different version number)
- The shoe is a different brand
- The image shows a person wearing the shoe rather than a product shot
- You are not confident it is exactly the ${brand} ${model}

Reply with ONLY the number (1–${candidates.length}) of the correct image, or 0 if none match.`,
    },
  ];
  for (let i = 0; i < candidates.length; i++) {
    content.push({ type: 'text', text: `Image ${i + 1}:` });
    content.push({ type: 'image', source: { type: 'url', url: candidates[i].thumbnailUrl } });
  }
  try {
    const msg = await anthropic.messages.create({ model: 'claude-opus-4-8', max_tokens: 5, messages: [{ role: 'user', content }] });
    const choice = parseInt(msg.content[0].text.trim());
    if (!isNaN(choice) && choice > 0 && choice <= candidates.length) {
      return candidates[choice - 1].fullUrl ?? candidates[choice - 1].thumbnailUrl;
    }
  } catch (err) { console.warn(`Vision error: ${err.message}`); }
  return null;
}

async function main() {
  const shoe = await prisma.shoes.findUnique({ where: { slug: SLUG }, include: { shoe_reviews: true } });
  if (!shoe) { console.error(`Shoe not found: ${SLUG}`); process.exit(1); }

  console.log(`Fixing: ${shoe.brand} ${shoe.model}\n`);

  // Clear all existing data
  await prisma.shoe_reviews.deleteMany({ where: { shoe_id: shoe.id } });
  await prisma.shoes.update({ where: { id: shoe.id }, data: { image_url: null, avg_score: null, review_count: 0, last_reviewed: null } });
  console.log('Cleared existing image and reviews.');

  // Try multiple specific search queries for the image
  const queries = [
    `"${shoe.brand}" "${shoe.model}" official product`,
    `${shoe.brand} ${shoe.model} shoe`,
    `${shoe.brand} ${shoe.model}`,
  ];

  let imageUrl = null;
  for (const query of queries) {
    console.log(`\nSearching: ${query}`);
    const candidates = await braveImageSearch(query);
    console.log(`Found ${candidates.length} candidates`);
    if (candidates.length > 0) {
      imageUrl = await pickBestImage(shoe.brand, shoe.model, candidates);
      if (imageUrl) break;
      console.log('Opus rejected all — trying next query...');
    }
    await new Promise(r => setTimeout(r, 1200));
  }

  if (imageUrl) {
    await prisma.shoes.update({ where: { id: shoe.id }, data: { image_url: imageUrl } });
    console.log(`\n✓ Image set: ${imageUrl.slice(0, 100)}`);
  } else {
    console.log('\n✗ No correct image found — showing placeholder');
  }

  console.log('\nDone. Re-run fetch-shoe-reviews.mjs --slug ' + SLUG + ' to restore review scores.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
