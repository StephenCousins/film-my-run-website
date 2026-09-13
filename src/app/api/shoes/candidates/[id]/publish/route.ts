import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPublishToken } from '@/lib/shoes/job/digest';
import { evaluate, type CandidateInput } from '@/lib/shoes/publish/gate';
import { publishCandidate } from '@/lib/shoes/publish/publish';
import { findAndStoreImage } from '@/lib/shoes/images';
import { loadBrands } from '@/lib/shoes/brands';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

function text(body: string, status: number): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Token from the query (GET) or the form body (POST); an invalid one is a 403 either way. */
async function authorise(req: NextRequest, ctx: Ctx, token: string): Promise<{ id: number } | Response> {
  const { id: rawId } = await ctx.params;
  const id = parseInt(rawId);
  if (!Number.isFinite(id) || !verifyPublishToken(id, token)) return text('Bad link', 403);
  return { id };
}

/**
 * The "publish anyway" link in the weekly digest. Signed with CRON_SECRET, so
 * only a link from the email works. GET only shows the candidate and a button:
 * mail-client link scanners follow GETs, so nothing may publish until the
 * form is POSTed. Overrides the two judgement holds (age, review count); a
 * shoe with no brand page or unparseable specs stays held.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const auth = await authorise(req, ctx, token);
  if (auth instanceof Response) return auth;

  const c = await prisma.shoe_candidates.findUnique({ where: { id: auth.id } });
  if (!c) return text('No such candidate', 404);

  const name = escapeHtml(`${c.brand_text} ${c.model_text}`);
  const status = c.status === 'published'
    ? `Already published as ${escapeHtml(c.slug)}.`
    : c.status === 'rejected'
      ? `Rejected${c.decided_at ? ` on ${c.decided_at.toISOString().slice(0, 10)}` : ''}; cannot be published from here.`
      : `Held: ${escapeHtml(c.hold_reasons.join(', ') || 'none recorded')}.`;
  const canPublish = c.status !== 'published' && c.status !== 'rejected';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Publish ${name}</title>
<meta name="robots" content="noindex"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 48px auto; padding: 0 16px; color: #18181b;">
<h1 style="font-size: 20px; margin: 0 0 8px;">${name}</h1>
<p style="color: #52525b; margin: 0 0 24px;">${status}</p>
${canPublish
    ? `<form method="POST"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit" style="background: #f88c00; color: #fff; border: 0; border-radius: 6px; padding: 10px 18px; font-size: 16px; cursor: pointer;">Publish anyway</button></form>
<p style="color: #a1a1aa; font-size: 13px; margin-top: 16px;">This overrides the age and review-count holds. It can take a minute.</p>`
    : ''}
</body></html>`;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const form = await req.formData().catch(() => null);
    const token = form?.get('token');
    const auth = await authorise(req, ctx, typeof token === 'string' ? token : '');
    if (auth instanceof Response) return auth;

    const c = await prisma.shoe_candidates.findUnique({ where: { id: auth.id } });
    if (!c) return text('No such candidate', 404);
    if (c.status === 'published') return text(`Already published: ${c.slug}`, 200);
    if (c.status === 'rejected') return text(`Candidate was rejected on ${c.decided_at?.toISOString().slice(0, 10) ?? 'an unknown date'}; nothing published`, 409);

    const brand = (await loadBrands()).find(b => b.id === c.brand_id);
    if (!brand) return text('Still held: brand_unresolved', 409);
    // Evidence is a JSON column; a malformed blob must not 500 the click (weekly.ts reads it the same way).
    const sources = (c.evidence as { sources?: CandidateInput['evidence']['sources'] } | null)?.sources ?? [];
    const input: CandidateInput = { id: c.id, slug: c.slug, brand, model: c.model_text, evidence: { sources: Array.isArray(sources) ? sources : [] } };
    const r = await evaluate(input, undefined, { override: ['too_old', 'reviews_lt_2'] });
    if (!r.publish) return text(`Still held: ${r.reasons.join(', ')}`, 409);

    const p = await publishCandidate(input, r);
    // The shoe is published from here on; an image failure is logged, never reported as a failed publish.
    let img: Awaited<ReturnType<typeof findAndStoreImage>> = null;
    try {
      img = await findAndStoreImage({ slug: p.slug, brand, model: c.model_text }, r.brandPage);
    } catch (err) {
      console.error(`Shoe image failed after publishing ${p.slug}`, err);
    }
    return text(`Published ${p.slug}${img ? ' with image' : ' (no image)'}${p.supersededSlug ? `, supersedes ${p.supersededSlug}` : ''}`, 200);
  } catch (err) {
    console.error('Shoe candidate publish failed', err);
    return text(err instanceof Error ? err.message : 'Publish failed', 500);
  }
}
