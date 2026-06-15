#!/usr/bin/env node
// Remove shoe reviews where the summary doesn't mention the exact model name
// Also resets avg_score/review_count for affected shoes
// Run: node --env-file=.env scripts/cleanup-mismatched-reviews.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const shoes = await prisma.shoes.findMany({
    include: { shoe_reviews: true },
  });

  let removedReviews = 0;
  let resetShoes = 0;

  for (const shoe of shoes) {
    const badReviews = shoe.shoe_reviews.filter(r => {
      if (!r.summary) return false; // no summary to check
      return !r.summary.toLowerCase().includes(shoe.model.toLowerCase());
    });

    if (badReviews.length === 0) continue;

    console.log(`${shoe.brand} ${shoe.model}: removing ${badReviews.length} mismatched review(s)`);
    for (const r of badReviews) {
      console.log(`  - ${r.source}: "${r.summary?.slice(0, 80)}"`);
    }

    await prisma.shoe_reviews.deleteMany({
      where: { id: { in: badReviews.map(r => r.id) } },
    });
    removedReviews += badReviews.length;

    // Recalculate avg_score from remaining reviews
    const remaining = shoe.shoe_reviews.filter(r => !badReviews.find(b => b.id === r.id));
    const scores = remaining.filter(r => r.expert_score != null).map(r => parseFloat(r.expert_score));
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

    await prisma.shoes.update({
      where: { id: shoe.id },
      data: {
        avg_score: avgScore,
        review_count: remaining.length,
        last_reviewed: remaining.length > 0 ? shoe.last_reviewed : null,
      },
    });
    resetShoes++;
  }

  console.log(`\nDone. Removed ${removedReviews} mismatched reviews across ${resetShoes} shoes.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
