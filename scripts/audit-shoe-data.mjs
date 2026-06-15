#!/usr/bin/env node
// Audit existing shoe reviews and images for accuracy.
//
// For each shoe:
//   Reviews — fetches each review source URL, checks the page title matches the shoe,
//             detects version conflicts in stored summaries
//   Images  — checks image URL is accessible, optionally re-verifies with Vision
//
// Run: node --env-file=.env scripts/audit-shoe-data.mjs
// Options:
//   --fix                  auto-remove bad reviews/images (otherwise report-only)
//   --reviews-only         only audit reviews
//   --images-only          only audit images
//   --vision               re-verify images with Claude Vision (costs ~$0.01/shoe)
//   --limit 10             only process first N shoes
//   --slug hoka-clifton-9  only process one shoe

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import {
  findVersionConflict,
  isComparisonArticle,
  getAdjacentVersionStrings,
  parseModelVersion,
  sleep,
} from './shoe-utils.mjs';

const prisma = new PrismaClient();
let anthropic = null;

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const slugIdx = args.indexOf('--slug');
const fix = args.includes('--fix');
const reviewsOnly = args.includes('--reviews-only');
const imagesOnly = args.includes('--images-only');
const useVision = args.includes('--vision');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : null;
const SLUG = slugIdx !== -1 ? args[slugIdx + 1] : null;

if (useVision) {
  if (!process.env.ANTHROPIC_API_KEY) { console.error('Missing ANTHROPIC_API_KEY (needed for --vision)'); process.exit(1); }
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ── Utilities ───────────────────────────────────────────────────────

function decodeHtmlEntities(text) {
  return text
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function fetchPageTitle(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FilmMyRun-Audit/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) return { status: res.status, title: null };

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
    const title = titleMatch
      ? decodeHtmlEntities(titleMatch[1]).replace(/\s+/g, ' ').trim()
      : null;
    return { status: res.status, title };
  } catch (err) {
    return { status: 'error', title: null, error: err.message };
  }
}

async function checkImageAccessible(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    return { accessible: res.ok, status: res.status };
  } catch {
    return { accessible: false, status: 'error' };
  }
}

async function visionVerifyImage(brand, model, imageUrl) {
  if (!anthropic) return { verified: true, reason: 'skipped (no --vision flag)' };

  const adjacents = getAdjacentVersionStrings(model);
  const adjacentWarning = adjacents.length > 0
    ? `\nREJECT if the shoe is actually: ${adjacents.join(', ')}`
    : '';

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Does this image show exactly the ${brand} ${model} running shoe? Version numbers must match.${adjacentWarning}

Reply: YES or NO, then a 5-word reason.`,
          },
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
        ],
      }],
    });
    const answer = msg.content[0].text.trim();
    return { verified: answer.toUpperCase().startsWith('YES'), reason: answer };
  } catch (err) {
    return { verified: null, reason: `Vision error: ${err.message}` };
  }
}

// ── Review audit ────────────────────────────────────────────────────

async function auditReview(shoe, review) {
  const issues = [];

  // Check 1: summary mentions the exact model
  if (review.summary) {
    if (!review.summary.toLowerCase().includes(shoe.model.toLowerCase())) {
      issues.push({
        type: 'summary_mismatch',
        detail: `Summary doesn't mention "${shoe.model}": "${review.summary.slice(0, 80)}..."`,
      });
    }

    const conflict = findVersionConflict(shoe.model, review.summary);
    if (conflict) {
      issues.push({
        type: 'version_conflict_summary',
        detail: `Summary mentions different version "${conflict}"`,
      });
    }
  }

  // Check 2: source URL page title mentions the shoe
  if (review.source_url) {
    const { status, title } = await fetchPageTitle(review.source_url);

    if (status === 'error' || (typeof status === 'number' && status >= 400)) {
      issues.push({
        type: 'url_broken',
        detail: `Source URL returned ${status}`,
      });
    } else if (title) {
      if (!title.toLowerCase().includes(shoe.model.toLowerCase())) {
        // Title doesn't mention our model — check if it mentions a different version
        const titleConflict = findVersionConflict(shoe.model, title);
        if (titleConflict) {
          issues.push({
            type: 'version_conflict_url',
            detail: `Page title is about "${titleConflict}": "${title.slice(0, 80)}"`,
            severity: 'high',
          });
        } else {
          issues.push({
            type: 'title_mismatch',
            detail: `Page title doesn't mention "${shoe.model}": "${title.slice(0, 80)}"`,
            severity: 'medium',
          });
        }
      }
    }

    await sleep(500);
  }

  return issues;
}

// ── Image audit ─────────────────────────────────────────────────────

async function auditImage(shoe) {
  const issues = [];

  if (!shoe.image_url) return issues;

  // Check 1: image URL is accessible
  const { accessible, status } = await checkImageAccessible(shoe.image_url);
  if (!accessible) {
    issues.push({
      type: 'image_broken',
      detail: `Image URL returned ${status}`,
      severity: 'high',
    });
    return issues;
  }

  // Check 2: Vision verification
  if (useVision) {
    const { verified, reason } = await visionVerifyImage(shoe.brand, shoe.model, shoe.image_url);
    if (verified === false) {
      issues.push({
        type: 'image_wrong_shoe',
        detail: `Vision says wrong shoe: ${reason}`,
        severity: 'high',
      });
    } else if (verified === null) {
      issues.push({
        type: 'image_verify_failed',
        detail: reason,
        severity: 'low',
      });
    }
  }

  return issues;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const where = {};
  if (SLUG) where.slug = SLUG;

  const shoes = await prisma.shoes.findMany({
    where,
    include: { shoe_reviews: true },
    orderBy: { brand: 'asc' },
    take: LIMIT ?? undefined,
  });

  console.log(`Auditing ${shoes.length} shoes...`);
  if (fix) console.log('Fix mode: will auto-remove bad data\n');
  else console.log('Report mode: no changes will be made (use --fix to auto-remove)\n');

  const report = {
    clean: 0,
    reviewIssues: [],
    imageIssues: [],
    fixedReviews: 0,
    fixedImages: 0,
  };

  for (const shoe of shoes) {
    const shoeLabel = `${shoe.brand} ${shoe.model}`;
    let shoeClean = true;

    // Review audit
    if (!imagesOnly && shoe.shoe_reviews.length > 0) {
      for (const review of shoe.shoe_reviews) {
        const issues = await auditReview(shoe, review);

        if (issues.length > 0) {
          shoeClean = false;
          const highSeverity = issues.some(i => i.severity === 'high' || i.type === 'version_conflict_summary' || i.type === 'version_conflict_url');

          for (const issue of issues) {
            console.log(`  ⚠ ${shoeLabel} [${review.source}]: ${issue.detail}`);
            report.reviewIssues.push({ shoe: shoeLabel, source: review.source, ...issue });
          }

          if (fix && highSeverity) {
            await prisma.shoe_reviews.delete({ where: { id: review.id } });
            console.log(`    → Removed ${review.source} review`);
            report.fixedReviews++;
          }
        }
      }
    }

    // Image audit
    if (!reviewsOnly && shoe.image_url) {
      const issues = await auditImage(shoe);

      if (issues.length > 0) {
        shoeClean = false;
        const highSeverity = issues.some(i => i.severity === 'high');

        for (const issue of issues) {
          console.log(`  ⚠ ${shoeLabel} [image]: ${issue.detail}`);
          report.imageIssues.push({ shoe: shoeLabel, ...issue });
        }

        if (fix && highSeverity) {
          await prisma.shoes.update({ where: { id: shoe.id }, data: { image_url: null } });
          console.log(`    → Cleared image URL`);
          report.fixedImages++;
        }
      }
    }

    if (shoeClean) {
      report.clean++;
    }
  }

  // Recalculate avg_score for shoes that had reviews removed
  if (fix && report.fixedReviews > 0) {
    console.log('\nRecalculating scores for affected shoes...');
    const affected = await prisma.shoes.findMany({
      include: { shoe_reviews: true },
    });
    for (const shoe of affected) {
      const scores = shoe.shoe_reviews
        .filter(r => r.expert_score != null)
        .map(r => parseFloat(r.expert_score));
      const avgScore = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null;
      await prisma.shoes.update({
        where: { id: shoe.id },
        data: {
          avg_score: avgScore,
          review_count: shoe.shoe_reviews.length,
          last_reviewed: shoe.shoe_reviews.length > 0 ? shoe.last_reviewed : null,
        },
      });
    }
  }

  // Summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log('AUDIT SUMMARY');
  console.log(`${'═'.repeat(60)}`);
  console.log(`Total shoes audited:  ${shoes.length}`);
  console.log(`Clean (no issues):    ${report.clean}`);
  console.log(`Review issues found:  ${report.reviewIssues.length}`);
  console.log(`Image issues found:   ${report.imageIssues.length}`);
  if (fix) {
    console.log(`Reviews removed:      ${report.fixedReviews}`);
    console.log(`Images cleared:       ${report.fixedImages}`);
  }

  // Detailed breakdown
  if (report.reviewIssues.length > 0) {
    console.log(`\n── Review Issues ──`);
    const byType = {};
    for (const issue of report.reviewIssues) {
      byType[issue.type] = (byType[issue.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(byType)) {
      console.log(`  ${type}: ${count}`);
    }

    const versionConflicts = report.reviewIssues.filter(
      i => i.type === 'version_conflict_summary' || i.type === 'version_conflict_url'
    );
    if (versionConflicts.length > 0) {
      console.log(`\n  VERSION CONFLICTS (wrong shoe version):`);
      for (const vc of versionConflicts) {
        console.log(`    ${vc.shoe} [${vc.source}]: ${vc.detail}`);
      }
    }
  }

  if (report.imageIssues.length > 0) {
    console.log(`\n── Image Issues ──`);
    for (const issue of report.imageIssues) {
      console.log(`  ${issue.shoe}: ${issue.detail}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
