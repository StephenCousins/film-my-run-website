#!/usr/bin/env node
// Fetch review scores for shoes using Brave Search + Claude
// Run: node scripts/fetch-shoe-reviews.mjs
// Options:
//   --limit 10          only process first N shoes
//   --slug hoka-clifton-9  only process one shoe by slug
//   --stale-only        only refresh shoes not updated in last 30 days

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY;

if (!BRAVE_KEY) {
  console.error('Missing BRAVE_SEARCH_API_KEY env var');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY env var');
  process.exit(1);
}

const args = process.argv.slice(2);
const limitArg = args.indexOf('--limit');
const slugArg = args.indexOf('--slug');
const staleOnly = args.includes('--stale-only');
const LIMIT = limitArg !== -1 ? parseInt(args[limitArg + 1]) : null;
const SLUG = slugArg !== -1 ? args[slugArg + 1] : null;

const SOURCES = [
  { key: 'runrepeat', name: 'RunRepeat', site: 'runrepeat.com' },
  { key: 'runners_world', name: "Runner's World", site: 'runnersworld.com' },
  { key: 'irunfar', name: 'iRunFar', site: 'irunfar.com' },
  { key: 'believe_in_run', name: 'Believe in the Run', site: 'believeintherun.com' },
  { key: 'the_run_testers', name: 'The Run Testers', site: 'theruntest.com' },
];

async function braveSearch(query) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&search_lang=en`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_KEY,
    },
  });
  if (!res.ok) {
    console.warn(`Brave search failed (${res.status}) for: ${query}`);
    return [];
  }
  const data = await res.json();
  return (data.web?.results ?? []).map(r => ({
    title: r.title,
    url: r.url,
    description: r.description ?? '',
  }));
}

async function extractScoresWithClaude(brand, model, searchResults) {
  const resultsText = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.description}`)
    .join('\n\n');

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: `You are extracting review scores for the ${brand} ${model} running shoe from search result snippets.

Search results:
${resultsText}

Extract any numerical review scores you can find. Scores may appear as:
- "X.X/10" or "X out of 10"
- "X/5" or "X stars" (convert to /10 by doubling)
- "X%" (convert to /10 by dividing by 10)
- RunRepeat scores (e.g. "RunRepeat Score: 9.2")

For each source found, output JSON like this (and ONLY this JSON, no other text):
{
  "reviews": [
    {
      "source": "runrepeat|runners_world|irunfar|believe_in_run|the_run_testers|other",
      "source_url": "url if available",
      "expert_score": 8.5,
      "user_score": 7.9,
      "user_count": 142,
      "summary": "one sentence summary of what reviewers said"
    }
  ]
}

If no scores are found, return: {"reviews": []}
Only include entries where you actually found a numerical score. Do not guess.`,
      },
    ],
  });

  try {
    const text = message.content[0].text.trim();
    const json = JSON.parse(text);
    return json.reviews ?? [];
  } catch {
    return [];
  }
}

function calculateAvgScore(reviews) {
  const scores = [];
  for (const r of reviews) {
    if (r.expert_score != null) scores.push({ score: parseFloat(r.expert_score), weight: 1.0 });
    if (r.user_score != null && r.user_count != null && r.user_count > 5) {
      scores.push({ score: parseFloat(r.user_score), weight: 0.5 });
    }
  }
  if (scores.length === 0) return null;
  const totalWeight = scores.reduce((a, b) => a + b.weight, 0);
  const weightedSum = scores.reduce((a, b) => a + b.score * b.weight, 0);
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

async function processShoe(shoe) {
  console.log(`\nProcessing: ${shoe.brand} ${shoe.model}`);

  const query = `${shoe.brand} ${shoe.model} running shoe review score rating 2024`;
  const results = await braveSearch(query);

  if (results.length === 0) {
    console.log('  No search results found');
    return;
  }

  const reviews = await extractScoresWithClaude(shoe.brand, shoe.model, results);

  if (reviews.length === 0) {
    console.log('  No scores extracted');
    return;
  }

  console.log(`  Found ${reviews.length} review score(s)`);

  for (const review of reviews) {
    const sourceKey = SOURCES.find(s => review.source === s.key)?.key ?? 'other';
    await prisma.shoe_reviews.upsert({
      where: { shoe_id_source: { shoe_id: shoe.id, source: sourceKey } },
      update: {
        source_url: review.source_url ?? null,
        expert_score: review.expert_score ?? null,
        user_score: review.user_score ?? null,
        user_count: review.user_count ?? null,
        summary: review.summary ?? null,
        fetched_at: new Date(),
      },
      create: {
        shoe_id: shoe.id,
        source: sourceKey,
        source_url: review.source_url ?? null,
        expert_score: review.expert_score ?? null,
        user_score: review.user_score ?? null,
        user_count: review.user_count ?? null,
        summary: review.summary ?? null,
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

  if (avgScore) console.log(`  Average score: ${avgScore}/10`);

  // Rate limit: Brave allows 1 req/sec on free tier
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
