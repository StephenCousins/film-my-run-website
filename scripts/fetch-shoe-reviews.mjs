#!/usr/bin/env node
// Fetch review scores for shoes using Brave Search + regex extraction
// Run: node scripts/fetch-shoe-reviews.mjs
// Options:
//   --limit 10             only process first N shoes
//   --slug hoka-clifton-9  only process one shoe by slug
//   --stale-only           only refresh shoes not updated in last 30 days

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY;

if (!BRAVE_KEY) {
  console.error('Missing BRAVE_SEARCH_API_KEY env var');
  process.exit(1);
}

const args = process.argv.slice(2);
const limitArg = args.indexOf('--limit');
const slugArg = args.indexOf('--slug');
const staleOnly = args.includes('--stale-only');
const LIMIT = limitArg !== -1 ? parseInt(args[limitArg + 1]) : null;
const SLUG = slugArg !== -1 ? args[slugArg + 1] : null;

const SOURCES = [
  { key: 'runrepeat', domain: 'runrepeat.com' },
  { key: 'runners_world', domain: 'runnersworld.com' },
  { key: 'irunfar', domain: 'irunfar.com' },
  { key: 'believe_in_run', domain: 'believeintherun.com' },
  { key: 'the_run_testers', domain: 'theruntesters.com' },
];

function identifySource(url) {
  for (const s of SOURCES) {
    if (url.includes(s.domain)) return s.key;
  }
  return 'other';
}

function extractScore(text) {
  if (!text) return null;

  // "9.2/10" or "9.2 out of 10" or "score: 9.2"
  const outOf10 = text.match(/\b(\d(?:\.\d)?)\s*(?:\/\s*10|out of 10)/i);
  if (outOf10) {
    const score = parseFloat(outOf10[1]);
    if (score >= 0 && score <= 10) return score;
  }

  // RunRepeat style: "Score: 9.2" or "RunRepeat Score 9.2"
  const runrepeatScore = text.match(/(?:runrepeat\s+)?score[:\s]+(\d(?:\.\d)?)\b/i);
  if (runrepeatScore) {
    const score = parseFloat(runrepeatScore[1]);
    if (score >= 0 && score <= 10) return score;
  }

  // "4.5/5" or "4.5 out of 5" — convert to /10
  const outOf5 = text.match(/\b(\d(?:\.\d)?)\s*(?:\/\s*5|out of 5)/i);
  if (outOf5) {
    const score = parseFloat(outOf5[1]) * 2;
    if (score >= 0 && score <= 10) return score;
  }

  // "88/100" or "88 out of 100" — convert to /10
  const outOf100 = text.match(/\b(\d{2,3})\s*(?:\/\s*100|out of 100)/i);
  if (outOf100) {
    const score = parseFloat(outOf100[1]) / 10;
    if (score >= 0 && score <= 10) return score;
  }

  // "★★★★½" or "4.5 stars"
  const stars = text.match(/(\d(?:\.\d)?)\s*stars?\b/i);
  if (stars) {
    const score = parseFloat(stars[1]) * 2;
    if (score >= 0 && score <= 10) return score;
  }

  return null;
}

async function braveSearch(query) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8&search_lang=en`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_KEY,
    },
  });
  if (!res.ok) {
    console.warn(`  Brave search failed (${res.status})`);
    return [];
  }
  const data = await res.json();
  return (data.web?.results ?? []).map(r => ({
    title: r.title ?? '',
    url: r.url ?? '',
    description: r.description ?? '',
  }));
}

function extractReviewsFromResults(results) {
  const reviews = [];
  const seenSources = new Set();

  for (const result of results) {
    const source = identifySource(result.url);
    if (seenSources.has(source)) continue;

    const combined = `${result.title} ${result.description}`;
    const score = extractScore(combined);

    if (score !== null) {
      seenSources.add(source);
      reviews.push({
        source,
        source_url: result.url,
        expert_score: score,
        user_score: null,
        user_count: null,
        summary: result.description.slice(0, 200) || null,
      });
    }
  }

  return reviews;
}

function calculateAvgScore(reviews) {
  const scores = reviews
    .filter(r => r.expert_score != null)
    .map(r => r.expert_score);

  if (scores.length === 0) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}

async function processShoe(shoe) {
  console.log(`\nProcessing: ${shoe.brand} ${shoe.model}`);

  const query = `${shoe.brand} ${shoe.model} running shoe review score`;
  const results = await braveSearch(query);

  if (results.length === 0) {
    console.log('  No search results');
    return;
  }

  const reviews = extractReviewsFromResults(results);

  if (reviews.length === 0) {
    console.log('  No scores found in snippets');
    return;
  }

  console.log(`  Found ${reviews.length} score(s): ${reviews.map(r => `${r.source}=${r.expert_score}`).join(', ')}`);

  for (const review of reviews) {
    await prisma.shoe_reviews.upsert({
      where: { shoe_id_source: { shoe_id: shoe.id, source: review.source } },
      update: {
        source_url: review.source_url,
        expert_score: review.expert_score,
        user_score: review.user_score,
        user_count: review.user_count,
        summary: review.summary,
        fetched_at: new Date(),
      },
      create: {
        shoe_id: shoe.id,
        source: review.source,
        source_url: review.source_url,
        expert_score: review.expert_score,
        user_score: review.user_score,
        user_count: review.user_count,
        summary: review.summary,
      },
    });
  }

  const avgScore = calculateAvgScore(reviews);
  await prisma.shoes.update({
    where: { id: shoe.id },
    data: {
      avg_score: avgScore,
      review_count: reviews.length,
      last_reviewed: new Date(),
    },
  });

  if (avgScore) console.log(`  Average: ${avgScore}/10`);

  // Brave free tier: 1 req/sec
  await new Promise(r => setTimeout(r, 1200));
}

async function main() {
  const where = {};
  if (SLUG) {
    where.slug = SLUG;
  } else if (staleOnly) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    where.OR = [{ last_reviewed: null }, { last_reviewed: { lt: thirtyDaysAgo } }];
  }

  const shoes = await prisma.shoes.findMany({
    where,
    orderBy: { brand: 'asc' },
    take: LIMIT ?? undefined,
  });

  console.log(`Processing ${shoes.length} shoes...`);

  for (const shoe of shoes) {
    await processShoe(shoe);
  }

  console.log('\nDone.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
