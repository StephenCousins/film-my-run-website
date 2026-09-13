// Shoe Finder maintenance CLI. One entry point over the library in src/lib/shoes/.
//
// Run:   node --env-file=.env node_modules/.bin/tsx scripts/shoes.ts <command> [flags]
// or:    npm run shoes -- <command> [flags]
//
// Commands:
//   enrich --slug S                 Fetch review scores for one shoe, upsert them, recompute its score.
//   image --slug S [--force]        Find, verify and store an image for one shoe. --force clears the current one first.
//   backfill-images [--limit N] [--from-slug S] [--force]
//                                   Image pass over the catalogue: current shoes first, then superseded.
//                                   Skips shoes already on R2 unless --force. Resume with --from-slug.
//   run-weekly [--dry-run]          Run the weekly job in-process and print its report as JSON.
//   candidates [--status held|pending|rejected|published]
//                                   List discovered candidates with their hold reasons.
//   audit-images                    HEAD every stored image and clear the ones that are gone.
//
// Needs DATABASE_URL, and for anything that searches or verifies: BRAVE_SEARCH_API_KEY,
// OPENROUTER_API_KEY and the R2_* credentials. Exit code is 1 on any error.

import { parseArgs } from 'node:util';
import type { CandidateStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { loadBrands, type Brand } from '@/lib/shoes/brands';
import { fetchReviewsForShoe, type ReviewResult } from '@/lib/shoes/reviews';
import { recomputeShoeScore } from '@/lib/shoes/scores';
import { findBrandProductPage } from '@/lib/shoes/publish/brandPage';
import { findAndStoreImage, auditImages } from '@/lib/shoes/images';
import { runWeekly } from '@/lib/shoes/job/weekly';
import { sleep } from '@/lib/shoes/search';

const USAGE = `Usage: npm run shoes -- <command> [flags]

  enrich --slug S
  image --slug S [--force]
  backfill-images [--limit N] [--from-slug S] [--force]
  run-weekly [--dry-run]
  candidates [--status held|pending|rejected|published]
  audit-images
`;

const CANDIDATE_STATUSES: CandidateStatus[] = ['pending', 'held', 'rejected', 'published'];
const BACKFILL_PAUSE_MS = 1500;

class UsageError extends Error {}

interface ShoeRow { id: number; slug: string; model: string; brand_id: number; image_url: string | null; superseded_by_id: number | null }
interface ShoeRef { id: number; slug: string; model: string; brand: Brand; image_url: string | null }

const SHOE_SELECT = { id: true, slug: true, model: true, brand_id: true, image_url: true, superseded_by_id: true } as const;

/** Stored by this pipeline, as opposed to a hotlink left over from the old catalogue. Same test the weekly job uses. */
function isOnR2(imageUrl: string | null): boolean {
  return imageUrl !== null && imageUrl.includes('/shoes/');
}

async function withBrands(rows: ShoeRow[]): Promise<ShoeRef[]> {
  const brands = new Map((await loadBrands()).map(b => [b.id, b]));
  return rows.map(r => {
    const brand = brands.get(r.brand_id);
    if (!brand) throw new Error(`${r.slug}: brand_id ${r.brand_id} has no shoe_brands row`);
    return { id: r.id, slug: r.slug, model: r.model, brand, image_url: r.image_url };
  });
}

async function loadShoe(slug: string): Promise<ShoeRef> {
  const row = await prisma.shoes.findUnique({ where: { slug }, select: SHOE_SELECT });
  if (!row) throw new Error(`No shoe with slug "${slug}"`);
  return (await withBrands([row]))[0];
}

function requireSlug(values: { slug?: string }): string {
  if (!values.slug) throw new UsageError('--slug is required');
  return values.slug;
}

// --- enrich -----------------------------------------------------------------

async function upsertReviews(shoeId: number, reviews: ReviewResult[]): Promise<void> {
  for (const review of reviews) {
    await prisma.shoe_reviews.upsert({
      where: { shoe_id_source: { shoe_id: shoeId, source: review.source } },
      update: { source_url: review.source_url, expert_score: review.expert_score, summary: review.summary, fetched_at: new Date() },
      create: { shoe_id: shoeId, source: review.source, source_url: review.source_url, expert_score: review.expert_score, summary: review.summary },
    });
  }
}

async function enrich(slug: string): Promise<void> {
  const shoe = await loadShoe(slug);
  console.log(`${shoe.slug}: ${shoe.brand.name} ${shoe.model}`);
  const reviews = await fetchReviewsForShoe(shoe.brand.name, shoe.model, msg => console.log(`  ${msg}`));
  for (const r of reviews) console.log(`  ${r.source.padEnd(18)} ${r.expert_score.toFixed(1)}/10  ${r.source_url}`);
  if (reviews.length === 0) console.log('  no reviews found');
  await upsertReviews(shoe.id, reviews);
  await prisma.shoes.update({ where: { id: shoe.id }, data: { last_reviewed: new Date() } });
  const score = await recomputeShoeScore(shoe.id);
  console.log(`${shoe.slug}: ${reviews.length} reviews upserted, avg_score ${score.avgScore ?? 'null'} over ${score.reviewCount}`);
}

// --- image ------------------------------------------------------------------

async function clearImage(slug: string): Promise<void> {
  await prisma.shoes.update({
    where: { slug },
    data: { image_url: null, image_source_url: null, image_method: null, image_verified_at: null },
  });
}

/** Brand page then find+store; returns the one-line outcome for the log. */
async function imageForShoe(shoe: ShoeRef): Promise<{ stored: boolean; line: string }> {
  const brandPage = await findBrandProductPage(shoe.brand, shoe.model);
  const outcome = await findAndStoreImage({ slug: shoe.slug, brand: shoe.brand, model: shoe.model }, brandPage);
  if (outcome) return { stored: true, line: `${shoe.slug} → ${outcome.method}` };
  const reason = brandPage ? 'brand page found, no candidate passed verification' : 'no brand page, no retailer candidate passed verification';
  return { stored: false, line: `${shoe.slug} → NONE (${reason})` };
}

async function image(slug: string, force: boolean): Promise<void> {
  const shoe = await loadShoe(slug);
  if (isOnR2(shoe.image_url) && !force) {
    console.log(`${shoe.slug}: already on R2 (${shoe.image_url}); pass --force to replace`);
    return;
  }
  if (force && shoe.image_url) {
    await clearImage(shoe.slug);
    console.log(`${shoe.slug}: cleared ${shoe.image_url}`);
  }
  const { stored, line } = await imageForShoe(shoe);
  console.log(line);
  if (!stored) process.exitCode = 1;
}

// --- backfill-images --------------------------------------------------------

async function backfillImages(opts: { limit?: number; fromSlug?: string; force: boolean }): Promise<void> {
  // Current shoes first so the catalogue people see fills in before the archive does.
  const rows = await prisma.shoes.findMany({ orderBy: { slug: 'asc' }, select: SHOE_SELECT });
  let ordered = [...rows.filter(r => r.superseded_by_id === null), ...rows.filter(r => r.superseded_by_id !== null)];
  if (opts.fromSlug) {
    const start = ordered.findIndex(r => r.slug === opts.fromSlug);
    if (start === -1) throw new UsageError(`--from-slug: no shoe with slug "${opts.fromSlug}"`);
    ordered = ordered.slice(start);
  }
  const shoes = await withBrands(ordered);

  let attempted = 0, stored = 0, skipped = 0, failed = 0;
  for (const shoe of shoes) {
    if (opts.limit !== undefined && attempted >= opts.limit) break;
    if (isOnR2(shoe.image_url) && !opts.force) { skipped++; continue; }
    if (attempted > 0) await sleep(BACKFILL_PAUSE_MS);
    attempted++;
    try {
      const r = await imageForShoe(shoe);
      console.log(r.line);
      if (r.stored) stored++;
    } catch (err) {
      failed++;
      console.log(`${shoe.slug} → ERROR ${errorMessage(err)}`);
    }
  }
  console.log(`backfill-images: ${shoes.length} shoes, ${attempted} attempted, ${stored} stored, ${skipped} skipped (already on R2), ${failed} errored`);
  if (failed > 0) process.exitCode = 1;
}

// --- run-weekly, candidates, audit-images ------------------------------------

async function candidates(status: string | undefined): Promise<void> {
  if (status !== undefined && !CANDIDATE_STATUSES.includes(status as CandidateStatus)) {
    throw new UsageError(`--status must be one of ${CANDIDATE_STATUSES.join(', ')}`);
  }
  const rows = await prisma.shoe_candidates.findMany({
    where: status ? { status: status as CandidateStatus } : {},
    orderBy: [{ status: 'asc' }, { first_seen_at: 'asc' }],
    select: { id: true, slug: true, status: true, brand_text: true, model_text: true, hold_reasons: true, first_seen_at: true, shoe_id: true },
  });
  for (const c of rows) {
    const seen = c.first_seen_at.toISOString().slice(0, 10);
    const tail = c.hold_reasons.length > 0 ? `  [${c.hold_reasons.join(', ')}]` : c.shoe_id !== null ? `  shoe #${c.shoe_id}` : '';
    console.log(`#${String(c.id).padStart(4)}  ${c.status.padEnd(9)} ${seen}  ${c.slug}  (${c.brand_text} ${c.model_text})${tail}`);
  }
  console.log(`${rows.length} candidate${rows.length === 1 ? '' : 's'}${status ? ` with status ${status}` : ''}`);
}

function errorMessage(err: unknown): string {
  return String((err as { message?: unknown } | null)?.message ?? err);
}

// --- main -------------------------------------------------------------------

function parseLimit(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new UsageError(`--limit must be a positive integer, got "${raw}"`);
  return n;
}

async function main(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      slug: { type: 'string' },
      force: { type: 'boolean', default: false },
      limit: { type: 'string' },
      'from-slug': { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      status: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  const [command, ...rest] = positionals;
  if (values.help || command === 'help') { process.stdout.write(USAGE); return; }
  if (!command) throw new UsageError('no command given');
  if (rest.length > 0) throw new UsageError(`unexpected argument "${rest[0]}"`);

  switch (command) {
    case 'enrich': return enrich(requireSlug(values));
    case 'image': return image(requireSlug(values), values.force);
    case 'backfill-images': return backfillImages({ limit: parseLimit(values.limit), fromSlug: values['from-slug'], force: values.force });
    case 'run-weekly': {
      const report = await runWeekly({ dryRun: values['dry-run'] });
      console.log(JSON.stringify(report, null, 2));
      if (report.errored.length > 0) process.exitCode = 1;
      return;
    }
    case 'candidates': return candidates(values.status);
    case 'audit-images': {
      const result = await auditImages();
      console.log(`audit-images: ${result.checked} checked, ${result.cleared.length} cleared, ${result.unverified} unverified`);
      for (const slug of result.cleared) console.log(`  cleared ${slug}`);
      return;
    }
    default: throw new UsageError(`unknown command "${command}"`);
  }
}

main(process.argv.slice(2))
  .catch(err => {
    if (err instanceof UsageError || (err as { code?: string })?.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      console.error(`shoes: ${errorMessage(err)}\n\n${USAGE}`);
    } else {
      console.error(err);
    }
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
