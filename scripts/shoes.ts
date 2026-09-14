// Shoe Finder maintenance CLI. One entry point over the library in src/lib/shoes/.
//
// Run:   node --env-file=.env node_modules/.bin/tsx scripts/shoes.ts <command> [flags]
// or:    npm run shoes -- <command> [flags]
//
// Commands:
//   enrich --slug S                 Fetch review scores for one shoe, upsert them, recompute its score.
//   image --slug S [--force]        Find, verify and store an image for one shoe. --force clears the current one first.
//   backfill-images [--limit N] [--from-slug S] [--force] [--clear-hotlinks]
//                                   Image pass over the catalogue: current shoes first, then superseded.
//                                   Skips shoes already on R2 unless --force. Resume with --from-slug.
//                                   --clear-hotlinks nulls the image fields of every shoe still on a
//                                   non-R2 URL afterwards; without it the count and the command are printed.
//   run-weekly [--dry-run]          Run the weekly job in-process and print its report as JSON.
//   candidates [--status held|pending|rejected|published]
//                                   List discovered candidates with their hold reasons.
//   audit-images                    HEAD every stored image and clear the ones that are gone.
//   add --brand "X" --model "Y" [--lift-no-brand-page] [--terrain road|trail|both] [--category C]
//                                   Owner-curated add: run one shoe through the gate with the age and
//                                   review-count holds lifted (like a user suggestion), publish it with
//                                   origin seed, then find an image. --lift-no-brand-page also lifts
//                                   no_brand_page, for brands whose English site is thin or blocked:
//                                   specs then come from search snippets. --terrain/--category override
//                                   what the specs parser read.
//
// Needs DATABASE_URL, and for anything that searches or verifies: BRAVE_SEARCH_API_KEY,
// OPENROUTER_API_KEY and the R2_* credentials. Exit code is 1 on any error.

import { parseArgs } from 'node:util';
import type { CandidateStatus, ShoeCategory, ShoeTerrain } from '@prisma/client';
import { prisma } from '@/lib/db';
import { loadBrands, resolveBrand, type Brand } from '@/lib/shoes/brands';
import { fetchReviewsForShoe, type ReviewResult } from '@/lib/shoes/reviews';
import { recomputeShoeScore } from '@/lib/shoes/scores';
import { shoeToSlug } from '@/lib/shoes/slug';
import { isSameLine, parseModelVersion } from '@/lib/shoes/versions';
import { CATEGORY_LABELS, TERRAIN_LABELS, isShoeCategory, isShoeTerrain } from '@/lib/shoes/taxonomy';
import { findBrandProductPage } from '@/lib/shoes/publish/brandPage';
import { evaluate, type CandidateInput, type HoldReason } from '@/lib/shoes/publish/gate';
import { publishCandidate } from '@/lib/shoes/publish/publish';
import { findAndStoreImage, auditImages, isR2ImageUrl, R2_SHOES_PREFIX } from '@/lib/shoes/images';
import { runWeekly } from '@/lib/shoes/job/weekly';
import { sleep } from '@/lib/shoes/search';

const USAGE = `Usage: npm run shoes -- <command> [flags]

  enrich --slug S
  image --slug S [--force]
  backfill-images [--limit N] [--from-slug S] [--force] [--clear-hotlinks]
  run-weekly [--dry-run]
  candidates [--status held|pending|rejected|published]
  audit-images
  add --brand "X" --model "Y" [--lift-no-brand-page] [--terrain road|trail|both] [--category C]
`;

const CANDIDATE_STATUSES: CandidateStatus[] = ['pending', 'held', 'rejected', 'published'];
const BACKFILL_PAUSE_MS = 1500;

class UsageError extends Error {}

interface ShoeRow { id: number; slug: string; model: string; brand_id: number; image_url: string | null; superseded_by_id: number | null }
interface ShoeRef { id: number; slug: string; model: string; brand: Brand; image_url: string | null }

const SHOE_SELECT = { id: true, slug: true, model: true, brand_id: true, image_url: true, superseded_by_id: true } as const;

/** Stored by this pipeline, as opposed to a hotlink left over from the old catalogue. Same test the weekly job uses. */
function isOnR2(imageUrl: string | null): boolean {
  return imageUrl !== null && isR2ImageUrl(imageUrl);
}

/** image_verified_at doubles as "last attempt" on a shoe with no R2 image, so the weekly queue tries never-attempted shoes first. */
async function markImageAttempt(slug: string): Promise<void> {
  await prisma.shoes.update({ where: { slug }, data: { image_verified_at: new Date() } });
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
  const found = await findBrandProductPage(shoe.brand, shoe.model);
  const brandPage = found.kind === 'found' ? found.page : null;
  const outcome = await findAndStoreImage({ slug: shoe.slug, brand: shoe.brand, model: shoe.model }, brandPage);
  if (outcome) return { stored: true, line: `${shoe.slug} → ${outcome.method}` };
  const reason = found.kind === 'found' ? 'brand page found, no candidate passed verification'
    : found.kind === 'unreachable' ? `brand site ${found.reason}, no retailer candidate passed verification`
      : 'no brand page, no retailer candidate passed verification';
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
  if (!stored) { await markImageAttempt(shoe.slug); process.exitCode = 1; }
}

// --- backfill-images --------------------------------------------------------

/** Shoes whose image_url is still a hotlink: the old catalogue's, or one the stricter match never replaced. */
async function hotlinkedShoes(): Promise<{ slug: string; image_url: string }[]> {
  const rows = await prisma.shoes.findMany({
    where: { image_url: { not: null }, NOT: { image_url: { startsWith: R2_SHOES_PREFIX } } },
    orderBy: { slug: 'asc' },
    select: { slug: true, image_url: true },
  });
  return rows.flatMap(r => (r.image_url ? [{ slug: r.slug, image_url: r.image_url }] : []));
}

/**
 * The spec's backfill contract: a shoe whose current image failed the
 * stricter match ends with image_url = null, so a placeholder replaces a
 * look-alike from the BigCommerce store the old catalogue hotlinked. The
 * fields are only cleared when asked, after the loop, so an interrupted
 * backfill leaves the site as it was.
 */
async function clearHotlinks(clear: boolean): Promise<void> {
  const hotlinks = await hotlinkedShoes();
  if (hotlinks.length === 0) { console.log('no hotlinked images remain'); return; }
  console.log(`${hotlinks.length} shoe${hotlinks.length === 1 ? '' : 's'} still on a non-R2 image:`);
  for (const h of hotlinks) console.log(`  ${h.slug}  ${h.image_url}`);
  if (!clear) {
    console.log('Not cleared. To replace them with the placeholder: npm run shoes -- backfill-images --limit 0 --clear-hotlinks');
    return;
  }
  const { count } = await prisma.shoes.updateMany({
    where: { slug: { in: hotlinks.map(h => h.slug) } },
    data: { image_url: null, image_source_url: null, image_method: null, image_verified_at: null },
  });
  console.log(`cleared image fields on ${count} shoe${count === 1 ? '' : 's'}`);
}

async function backfillImages(opts: { limit?: number; fromSlug?: string; force: boolean; clearHotlinks: boolean }): Promise<void> {
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
      if (r.stored) stored++; else await markImageAttempt(shoe.slug);
    } catch (err) {
      failed++;
      console.log(`${shoe.slug} → ERROR ${errorMessage(err)}`);
    }
  }
  console.log(`backfill-images: ${shoes.length} shoes, ${attempted} attempted, ${stored} stored, ${skipped} skipped (already on R2), ${failed} errored`);
  await clearHotlinks(opts.clearHotlinks);
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

// --- add --------------------------------------------------------------------

interface AddOpts { brand: string; model: string; liftNoBrandPage: boolean; terrain?: string; category?: string }

function parseTerrain(raw: string | undefined): ShoeTerrain | undefined {
  if (raw !== undefined && !isShoeTerrain(raw)) throw new UsageError(`--terrain must be one of ${Object.keys(TERRAIN_LABELS).join(', ')}, got "${raw}"`);
  return raw;
}

function parseCategory(raw: string | undefined): ShoeCategory | undefined {
  if (raw !== undefined && !isShoeCategory(raw)) throw new UsageError(`--category must be one of ${Object.keys(CATEGORY_LABELS).join(', ')}, got "${raw}"`);
  return raw;
}

/**
 * Owner-curated add. The same gate as a user suggestion (too_old and
 * reviews_lt_2 lifted), plus no_brand_page when asked, for brands whose
 * English site is thin or refuses server fetches; those shoes are proved by
 * an importer's page or, failing that, published on search snippets alone.
 * Published as origin seed with no candidate row, like the seed catalogue.
 */
async function add(opts: AddOpts): Promise<void> {
  const terrain = parseTerrain(opts.terrain);
  const category = parseCategory(opts.category);
  const model = opts.model.trim();
  if (!model) throw new UsageError('--model is empty');

  const brand = resolveBrand(opts.brand, await loadBrands());
  if (!brand) throw new Error(`Unknown brand "${opts.brand}": add it (or an alias) to shoe_brands first`);
  const slug = shoeToSlug(brand.name, model);
  console.log(`${slug}: ${brand.name} ${model}`);

  // Same duplicate rule as the user route: the slug, or the same line at the same version.
  const version = parseModelVersion(model).versionNum;
  const existing = await prisma.shoes.findUnique({ where: { slug }, select: { slug: true } })
    ?? (await prisma.shoes.findMany({ where: { brand_id: brand.id }, select: { slug: true, model: true } }))
      .find(s => isSameLine(s.model, model) && parseModelVersion(s.model).versionNum === version);
  if (existing) throw new Error(`${brand.name} ${model} is already in the catalogue as ${existing.slug}`);

  const override: HoldReason[] = ['too_old', 'reviews_lt_2', ...(opts.liftNoBrandPage ? ['no_brand_page' as const] : [])];
  const input: CandidateInput = { id: 0, slug, brand, model, evidence: { sources: [] } };
  // --terrain/--category go into the gate rather than onto its result: the parser's taxonomy check runs first and would hold bad_taxonomy on the LLM's value.
  const gate = await evaluate(input, undefined, { override, specs: { ...(terrain ? { terrain } : {}), ...(category ? { category } : {}) } });
  if (!gate.publish) {
    console.log(`${slug} → held: ${gate.reasons.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  // The matched page's title is printed so a near-miss (a sibling variant, another version) is visible before anything is published.
  console.log(`  proved by: ${gate.brandPage ? `${gate.brandPage.source} page ${gate.brandPage.url} — "${gate.brandPage.title}"` : 'nothing (specs from search snippets)'}`);

  const published = await publishCandidate(input, gate, { kind: 'seed' });
  // The shoe is published from here on; an image failure is logged, not a failed add.
  let image: Awaited<ReturnType<typeof findAndStoreImage>> = null;
  try {
    image = await findAndStoreImage({ slug: published.slug, brand, model }, gate.brandPage);
  } catch (err) {
    console.log(`  image: ERROR ${errorMessage(err)}`);
  }
  if (!image) await markImageAttempt(published.slug);
  const n = gate.reviews.length;
  console.log(`${published.slug} → published (${n} review${n === 1 ? '' : 's'}, image: ${image ? image.method : 'NONE'})${published.supersededSlug ? `, supersedes ${published.supersededSlug}` : ''}`);
}

function errorMessage(err: unknown): string {
  return String((err as { message?: unknown } | null)?.message ?? err);
}

// --- main -------------------------------------------------------------------

/** 0 is allowed: `backfill-images --limit 0 --clear-hotlinks` runs only the clearing step. */
function parseLimit(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new UsageError(`--limit must be a non-negative integer, got "${raw}"`);
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
      'clear-hotlinks': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      status: { type: 'string' },
      brand: { type: 'string' },
      model: { type: 'string' },
      'lift-no-brand-page': { type: 'boolean', default: false },
      terrain: { type: 'string' },
      category: { type: 'string' },
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
    case 'backfill-images': return backfillImages({ limit: parseLimit(values.limit), fromSlug: values['from-slug'], force: values.force, clearHotlinks: values['clear-hotlinks'] });
    case 'run-weekly': {
      const report = await runWeekly({ dryRun: values['dry-run'] });
      console.log(JSON.stringify(report, null, 2));
      if (report.errored.length > 0) process.exitCode = 1;
      return;
    }
    case 'candidates': return candidates(values.status);
    case 'add': {
      if (!values.brand || !values.model) throw new UsageError('add needs --brand and --model');
      return add({ brand: values.brand, model: values.model, liftNoBrandPage: values['lift-no-brand-page'], terrain: values.terrain, category: values.category });
    }
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
