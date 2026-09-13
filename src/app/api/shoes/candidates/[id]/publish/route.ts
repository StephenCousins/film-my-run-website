import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPublishToken } from '@/lib/shoes/job/digest';
import { evaluate, type CandidateInput } from '@/lib/shoes/publish/gate';
import { publishCandidate } from '@/lib/shoes/publish/publish';
import { findAndStoreImage } from '@/lib/shoes/images';
import { loadBrands } from '@/lib/shoes/brands';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

function text(body: string, status: number): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

/**
 * The "publish anyway" link in the weekly digest. Signed with CRON_SECRET, so
 * only a link from the email works. Overrides the two judgement holds (age,
 * review count); a shoe with no brand page or unparseable specs stays held.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    const token = req.nextUrl.searchParams.get('token') ?? '';
    if (!Number.isFinite(id) || !verifyPublishToken(id, token)) return text('Bad link', 403);

    const c = await prisma.shoe_candidates.findUnique({ where: { id } });
    if (!c) return text('No such candidate', 404);
    if (c.status === 'published') return text(`Already published: ${c.slug}`, 200);

    const brand = (await loadBrands()).find(b => b.id === c.brand_id);
    if (!brand) return text('Still held: brand_unresolved', 409);
    const input: CandidateInput = { id: c.id, slug: c.slug, brand, model: c.model_text, evidence: c.evidence as unknown as CandidateInput['evidence'] };
    const r = await evaluate(input, undefined, { override: ['too_old', 'reviews_lt_2'] });
    if (!r.publish) return text(`Still held: ${r.reasons.join(', ')}`, 409);

    const p = await publishCandidate(input, r);
    const img = await findAndStoreImage({ slug: p.slug, brand, model: c.model_text }, r.brandPage);
    return text(`Published ${p.slug}${img ? ' with image' : ' (no image)'}${p.supersededSlug ? `, supersedes ${p.supersededSlug}` : ''}`, 200);
  } catch (err) {
    console.error('Shoe candidate publish failed', err);
    return text(err instanceof Error ? err.message : 'Publish failed', 500);
  }
}
