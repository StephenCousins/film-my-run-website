#!/usr/bin/env node
// Fetch review scores for shoes with strict version-accuracy verification.
//
// Accuracy layers (all must pass before a review is accepted):
//   1. Text match   — search result title/description must contain the exact model name
//   2. Version gate — reject if an adjacent version is mentioned without our exact model
//   3. URL check    — bonus confidence if URL slug matches the shoe
//   4. Claude verify — Haiku confirms the result is specifically about THIS shoe
//
// Run: node --env-file=.env scripts/fetch-shoe-reviews.mjs
// Options:
//   --limit 10             only process first N shoes
//   --slug hoka-clifton-9  only process one shoe by slug
//   --stale-only           only refresh shoes not updated in last 30 days
//   --thorough             additionally search each source domain separately
//   --skip-verify          skip Claude verification (faster, less accurate)
//   --dry-run              show what would be saved without writing to DB

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import {
  findVersionConflict,
  isComparisonArticle,
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
const staleOnly = args.includes('--stale-only');
const thorough = args.includes('--thorough');
const skipVerify = args.includes('--skip-verify');
const dryRun = args.includes('--dry-run');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : null;
const SLUG = slugIdx !== -1 ? args[slugIdx + 1] : null;

const SOURCES = [
  { key: 'runrepeat', domain: 'runrepeat.com' },
  { key: 'runners_world', domain: 'runnersworld.com' },
  { key: 'irunfar', domain: 'irunfar.com' },
  { key: 'believe_in_run', domain: 'believeintherun.com' },
  { key: 'the_run_testers', domain: 'theruntesters.com' },
];

// ── Search ──────────────────────────────────────────────────────────

function identifySource(url) {
  for (const s of SOURCES) {
    if (url.includes(s.domain)) return s.key;
  }
  return 'other';
}

async function braveSearch(query) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&search_lang=en`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_KEY,
    },
  });
  if (!res.ok) {
    console.warn(`  ⚠ Brave search failed (${res.status})`);
    return [];
  }
  const data = await res.json();
  return (data.web?.results ?? []).map(r => ({
    title: r.title ?? '',
    url: r.url ?? '',
    description: r.description ?? '',
  }));
}

// ── Score extraction ────────────────────────────────────────────────

function extractExplicitScore(text) {
  if (!text) return null;

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

async function inferScoreFromText(brand, model, reviewText) {
  if (!reviewText || reviewText.length < 60) return null;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Score this running shoe review snippet. Assign 0.0–10.0 based on sentiment toward the ${brand} ${model}.

Guide: 9.5–10 exceptional | 8.5–9.4 excellent | 7.5–8.4 good | 6.5–7.4 decent | 5–6.4 average | <5 poor

"${reviewText.slice(0, 400)}"

Reply with ONLY a number like: 8.5`,
      }],
    });
    const score = parseFloat(msg.content[0].text.trim());
    if (!isNaN(score) && score >= 0 && score <= 10) return score;
  } catch { /* skip */ }
  return null;
}

// ── Accuracy verification ───────────────────────────────────────────

function textMentionsExactModel(model, text) {
  return text.toLowerCase().includes(model.toLowerCase());
}

async function claudeVerifyResult(brand, model, result) {
  const adjacents = getAdjacentVersionStrings(model);
  const adjacentList = adjacents.length > 0
    ? `\nWATCH OUT for these different versions (must NOT be about any of these): ${adjacents.join(', ')}`
    : '';

  try {
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
    const answer = msg.content[0].text.trim();
    const isYes = answer.toUpperCase().startsWith('YES');
    return { verified: isYes, reason: answer };
  } catch (err) {
    console.warn(`  ⚠ Verify error: ${err.message}`);
    return { verified: false, reason: 'API error' };
  }
}

// ── Core pipeline ───────────────────────────────────────────────────

async function findReviewsForShoe(shoe) {
  const { brand, model } = shoe;
  const allResults = [];

  // Primary search
  const primaryQuery = `"${brand} ${model}" running shoe review`;
  const primaryResults = await braveSearch(primaryQuery);
  allResults.push(...primaryResults);
  await sleep(1100);

  // Thorough mode: per-source searches
  if (thorough) {
    for (const source of SOURCES) {
      const sourceQuery = `site:${source.domain} "${brand} ${model}"`;
      const sourceResults = await braveSearch(sourceQuery);
      // Add results we haven't seen yet
      for (const r of sourceResults) {
        if (!allResults.some(e => e.url === r.url)) {
          allResults.push(r);
        }
      }
      await sleep(1100);
    }
  }

  if (allResults.length === 0) {
    console.log('  No search results');
    return [];
  }

  console.log(`  ${allResults.length} search results found`);

  // Filter and verify each result
  const verifiedReviews = [];
  const seenSources = new Set();

  for (const result of allResults) {
    const source = identifySource(result.url);
    if (seenSources.has(source)) continue;

    const combined = `${result.title} ${result.description}`;

    // Layer 1: text must mention exact model
    if (!textMentionsExactModel(model, combined)) {
      continue;
    }

    // Layer 2: reject if adjacent version mentioned WITHOUT our model in that context
    const conflict = findVersionConflict(model, result.title);
    if (conflict) {
      console.log(`  ✗ ${source}: title mentions "${conflict}" instead — skipped`);
      continue;
    }

    // Layer 3: URL slug match (bonus confidence, not required)
    const urlMatch = urlMatchesShoe(result.url, brand, model);
    const isComparison = isComparisonArticle(model, combined);

    // Layer 4: Claude verification
    if (!skipVerify) {
      // Always verify comparisons; verify non-URL-matching results; skip obvious matches
      const needsVerify = isComparison || !urlMatch;
      if (needsVerify) {
        const { verified, reason } = await claudeVerifyResult(brand, model, result);
        if (!verified) {
          console.log(`  ✗ ${source}: Claude rejected — ${reason}`);
          continue;
        }
      }
    }

    // Extract score
    let score = extractExplicitScore(combined);
    let method = score !== null ? 'explicit' : null;

    if (score === null && result.description.length > 60) {
      score = await inferScoreFromText(brand, model, result.description);
      method = score !== null ? 'inferred' : null;
    }

    if (score !== null) {
      seenSources.add(source);
      verifiedReviews.push({
        source,
        source_url: result.url,
        expert_score: score,
        user_score: null,
        user_count: null,
        summary: result.description.slice(0, 200) || null,
        method,
        url_verified: urlMatch,
      });
      console.log(`  ✓ ${source}: ${score}/10 (${method}${urlMatch ? ', URL match' : ''})`);
    }
  }

  return verifiedReviews;
}

function calculateAvgScore(reviews) {
  const scores = reviews.filter(r => r.expert_score != null).map(r => r.expert_score);
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

async function processShoe(shoe) {
  console.log(`\n── ${shoe.brand} ${shoe.model} ──`);

  const reviews = await findReviewsForShoe(shoe);

  if (reviews.length === 0) {
    console.log('  No verified scores found');
    return { shoe: `${shoe.brand} ${shoe.model}`, reviews: 0, avgScore: null };
  }

  const avgScore = calculateAvgScore(reviews);

  if (dryRun) {
    console.log(`  [DRY RUN] Would save ${reviews.length} review(s), avg: ${avgScore}/10`);
    return { shoe: `${shoe.brand} ${shoe.model}`, reviews: reviews.length, avgScore };
  }

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

  await prisma.shoes.update({
    where: { id: shoe.id },
    data: {
      avg_score: avgScore,
      review_count: reviews.length,
      last_reviewed: new Date(),
    },
  });

  console.log(`  Saved ${reviews.length} review(s), avg: ${avgScore}/10`);
  return { shoe: `${shoe.brand} ${shoe.model}`, reviews: reviews.length, avgScore };
}

// ── Main ────────────────────────────────────────────────────────────

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
  if (thorough) console.log('Thorough mode: searching each source domain separately');
  if (skipVerify) console.log('Skipping Claude verification');
  if (dryRun) console.log('Dry run: no database writes');

  const results = [];
  for (const shoe of shoes) {
    const result = await processShoe(shoe);
    results.push(result);
  }

  // Summary
  const withScores = results.filter(r => r.reviews > 0);
  const totalReviews = results.reduce((sum, r) => sum + r.reviews, 0);
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Done. ${withScores.length}/${results.length} shoes got scores (${totalReviews} total reviews)`);
  if (results.some(r => r.reviews === 0)) {
    console.log(`No scores: ${results.filter(r => r.reviews === 0).map(r => r.shoe).join(', ')}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
