import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Old WordPress permalinks were /<slug>/ at the root; the posts now live at /blog/<slug>.
// Every real top-level route is a static segment, which Next matches before this one.
// A route handler, not a page: a page under the root loading.tsx would start a 200 before it could redirect.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.posts.findFirst({ where: { slug, status: 'published' }, select: { slug: true } }).catch(() => null);
  // A relative Location: behind Railway's proxy req.url is http://localhost:8080.
  if (post) return new NextResponse(null, { status: 308, headers: { location: `/blog/${post.slug}` } });
  // The site's own 404 page, with a 404 status. Two segments never reach this route, so no loop.
  // (Route handlers can't rewrite; this costs one extra request, only for addresses that don't exist.)
  const page = await fetch(new URL(`/_not-found/${encodeURIComponent(slug)}`, req.url)).catch(() => null);
  const html = page ? await page.text() : '<!doctype html><title>Page not found</title><p>Page not found. <a href="/">Film My Run home</a></p>';
  return new NextResponse(html, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
}
