import { prisma } from '@/lib/db';

export function extractExplicitScore(text: string): number | null {
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

export function averageTo1dp(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export interface ScoreDeps {
  reviewScores: (shoeId: number) => Promise<number[]>;
  userScores: (shoeId: number) => Promise<number[]>;
  write: (shoeId: number, data: { avg_score: number | null; review_count: number; user_avg_score: number | null; user_rating_count: number; last_reviewed?: Date }) => Promise<void>;
}

const liveDeps: ScoreDeps = {
  reviewScores: async id => (await prisma.shoe_reviews.findMany({ where: { shoe_id: id, expert_score: { not: null } }, select: { expert_score: true } }))
    .map(r => Number(r.expert_score)),
  userScores: async id => (await prisma.shoe_user_ratings.findMany({ where: { shoe_id: id }, select: { score: true } })).map(r => Number(r.score)),
  write: async (id, data) => { await prisma.shoes.update({ where: { id }, data }); },
};

export async function recomputeShoeScore(shoeId: number, deps: ScoreDeps = liveDeps) {
  const [rs, us] = await Promise.all([deps.reviewScores(shoeId), deps.userScores(shoeId)]);
  const result = { avgScore: averageTo1dp(rs), reviewCount: rs.length, userAvgScore: averageTo1dp(us), userRatingCount: us.length };
  await deps.write(shoeId, { avg_score: result.avgScore, review_count: result.reviewCount, user_avg_score: result.userAvgScore, user_rating_count: result.userRatingCount });
  return result;
}
