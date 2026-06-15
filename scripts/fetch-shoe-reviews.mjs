#!/usr/bin/env node
// Fetch review scores for shoes using Brave Search + Haiku
// - Regex extracts explicit scores (fast, free)
// - Haiku reads review text to infer scores where no number is present
// Run: node --env-file=.env scripts/fetch-shoe-reviews.mjs
// Options:
//   --limit 10             only process first N shoes
//   --slug hoka-clifton-9  only process one shoe by slug
//   --stale-only           only refresh shoes not updated in last 30 days

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

function extractExplicitScore(text) {
  if (!text) return null;

  const outOf10 = text.match(/\b(\d(?:\.\d)?)\s*(?:\/\s*10|out of 10)/i);
  if (outOf10) {
    const s = parseFloat(outOf10[1]);
    if (s >= 0 && s <= 10) return s;
  }

  const runrepeatScore = text.match(/(?:runrepeat\s+)?score[:\s]+(\d(?:\.\d)?)\b/i);
  if (runrepeatScore) {
    const s = parseFloat(runrepeatScore[1]);
    if (s >= 0 && s <= 10) return s;
  }

  const outOf5 = text.match(/\b(\d(?:\.\d)?)\s*(?:\/\s*5|out of 5)/i);
  if (outOf5) {
    const s = parseFloat(outOf5[1]) * 2;
    if (s >= 0 && s <= 10) return s;
  }

  const outOf100 = text.match(/\b(\d{2,3})\s*(?:\/\s*100|out of 100)/i);
  if (outOf100) {
    const s = parseFloat(outOf100[1]) / 10;
    if (s >= 0 && s <= 10) return s;
  }

  const stars = text.match(/(\d(?:\.\d)?)\s*stars?\b/i);
  if (stars) {
    const s = parseFloat(stars[1]) * 2;
    if (s >= 0 && s <= 10) return s;
  }

  return null;
}

async function inferScoreFromText(brand, model, reviewText) {
  if (!reviewText || reviewText.length < 60) return null;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `You are scoring a running shoe review. Read the review snippet below and assign a score from 0.0 to 10.0 based on how positively the reviewer feels about the ${brand} ${model}.

Scoring guide:
9.5–10: Exceptional, best in class
8.5–9.4: Excellent, highly recommended
7.5–8.4: Good, recommended with minor caveats
6.5–7.4: Decent, some notable issues
5.0–6.4: Average or mixed feelings
Below 5: Poor or not recommended

Review snippet:
"${reviewText.slice(0, 400)}"

Reply with ONLY a single number like: 8.5`
      }]
    });

    const score = parseFloat(msg.content[0].text.trim());
    if (!isNaN(score) && score >= 0 && score <= 10) return score;
  } catch {
    // silently skip on API error
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

function resultMentionsExactModel(model, title, description) {
  const text = `${title} ${description}`.toLowerCase();
  return text.includes(model.toLowerCase());
}

async function extractReviews(brand, model, results) {
  const reviews = [];
  const seenSources = new Set();

  for (const result of results) {
    // Skip results that don't mention this exact model — prevents X3 reviews being used for X2 etc.
    if (!resultMentionsExactModel(model, result.title, result.description)) continue;

    const source = identifySource(result.url);
    if (seenSources.has(source)) continue;

    const combined = `${result.title} ${result.description}`;

    // Try regex first
    let score = extractExplicitScore(combined);
    let method = 'explicit';

    // Fall back to Haiku text inference
    if (score === null && result.description.length > 60) {
      score = await inferScoreFromText(brand, model, result.description);
      method = 'inferred';
    }

    if (score !== null) {
      seenSources.add(source);
      reviews.push({
        source,
        source_url: result.url,
        expert_score: score,
        user_score: null,
        user_count: null,
        summary: result.description.slice(0, 200) || null,
        method,
      });
    }
  }

  return reviews;
}

function calculateAvgScore(reviews) {
  const scores = reviews.filter(r => r.expert_score != null).map(r => r.expert_score);
  if (scores.length === 0) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}

async function processShoe(shoe) {
  console.log(`\nProcessing: ${shoe.brand} ${shoe.model}`);

  const query = `"${shoe.brand} ${shoe.model}" running shoe review`;
  const results = await braveSearch(query);

  if (results.length === 0) {
    console.log('  No search results');
    return;
  }

  const reviews = await extractReviews(shoe.brand, shoe.model, results);

  if (reviews.length === 0) {
    console.log('  No scores found');
    return;
  }

  const summary = reviews.map(r => `${r.source}=${r.expert_score}(${r.method})`).join(', ');
  console.log(`  Found ${reviews.length} score(s): ${summary}`);

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
