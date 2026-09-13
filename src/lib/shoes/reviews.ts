import { completeText } from '@/lib/llm';
import type { ReviewSource } from '@prisma/client';
import { identifySource } from './taxonomy';
import { extractExplicitScore } from './scores';
import { findVersionConflict, getAdjacentVersionStrings, isComparisonArticle } from './versions';
import { urlMatchesShoe } from './slug';
import { webSearch, sleep, type SearchResult } from './search';

export interface ReviewDeps {
  webSearch: typeof webSearch;
  completeText: typeof completeText;
  /** Rate-limit pause after each search; injected deps without one do not pause. */
  sleep?: typeof sleep;
}

const liveDeps: ReviewDeps = { webSearch, completeText, sleep };

async function inferScoreFromText(brand: string, model: string, text: string, deps: ReviewDeps): Promise<number | null> {
  if (!text || text.length < 60) return null;
  try {
    const answer = await deps.completeText({
      maxTokens: 100,
      prompt: `Score this running shoe review snippet. Assign 0.0–10.0 based on sentiment toward the ${brand} ${model}.

Guide: 9.5–10 exceptional | 8.5–9.4 excellent | 7.5–8.4 good | 6.5–7.4 decent | 5–6.4 average | <5 poor

"${text.slice(0, 400)}"

Reply with ONLY a number like: 8.5`,
    });
    const score = parseFloat(answer);
    if (!isNaN(score) && score >= 0 && score <= 10) return score;
  } catch { /* skip */ }
  return null;
}

async function claudeVerifyResult(brand: string, model: string, result: SearchResult, deps: ReviewDeps): Promise<{ verified: boolean; reason: string }> {
  const adjacents = getAdjacentVersionStrings(model);
  const adjacentList = adjacents.length > 0
    ? `\nWATCH OUT for these different versions (must NOT be about any of these): ${adjacents.join(', ')}`
    : '';

  try {
    const answer = await deps.completeText({
      maxTokens: 60,
      prompt: `Is this search result a review of EXACTLY the ${brand} ${model} running shoe?
${adjacentList}

Title: "${result.title}"
URL: ${result.url}
Snippet: "${result.description.slice(0, 300)}"

Rules:
- Version numbers MUST match exactly. "${model}" is specific.
- A comparison "X vs Y" only counts if it reviews and scores the ${model} individually.
- A "best of" roundup counts if it scores the ${model} individually.

Reply: YES or NO, then a 5-word reason.`,
    });
    return { verified: answer.toUpperCase().startsWith('YES'), reason: answer || 'no answer' };
  } catch {
    return { verified: false, reason: 'API error' };
  }
}

export interface ReviewResult {
  source: ReviewSource;
  source_url: string;
  expert_score: number;
  summary: string | null;
}

export async function fetchReviewsForShoe(
  brand: string,
  model: string,
  onProgress?: (msg: string) => void,
  deps: ReviewDeps = liveDeps
): Promise<ReviewResult[]> {
  const pause = deps.sleep ?? (async () => {});
  onProgress?.(`Searching for reviews...`);
  let allResults = await deps.webSearch(`"${brand} ${model}" running shoe review`);
  await pause(1100);

  if (allResults.length === 0) {
    onProgress?.(`Broadening search...`);
    allResults = await deps.webSearch(`${brand} ${model} review`);
    await pause(1100);
  }

  if (allResults.length === 0) {
    onProgress?.(`Trying model name only...`);
    allResults = await deps.webSearch(`${model} running shoe review`);
    await pause(1100);
  }

  const verifiedReviews: ReviewResult[] = [];
  const seenSources = new Set<ReviewSource>();

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
      onProgress?.(`Verifying ${source === 'other' ? new URL(result.url).hostname : source}...`);
      const { verified } = await claudeVerifyResult(brand, model, result, deps);
      if (!verified) continue;
    }

    let score = extractExplicitScore(combined);
    if (score === null && result.description.length > 60) {
      onProgress?.(`Extracting score from ${source === 'other' ? new URL(result.url).hostname : source}...`);
      score = await inferScoreFromText(brand, model, result.description, deps);
    }

    if (score !== null) {
      seenSources.add(source);
      onProgress?.(`Found review: ${source === 'other' ? new URL(result.url).hostname : source} (${score}/10)`);
      verifiedReviews.push({
        source,
        source_url: result.url,
        expert_score: score,
        summary: result.description.replace(/<[^>]*>/g, '').slice(0, 200) || null,
      });
    }
  }

  return verifiedReviews;
}
