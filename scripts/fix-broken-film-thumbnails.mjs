/**
 * Fix broken YouTube thumbnail URLs on films.
 *
 * seed-films.mjs assumed every video has a maxresdefault.jpg, but YouTube only
 * generates that for uploads above 720p. Older films 404, which breaks the card
 * on /films, the hero on /films/[slug], and the OG image for that page.
 *
 * Probes maxres -> sd -> hq and keeps the best one that actually exists.
 *
 * Usage:
 *   node --env-file=.env scripts/fix-broken-film-thumbnails.mjs           (dry run)
 *   node --env-file=.env scripts/fix-broken-film-thumbnails.mjs --apply   (writes)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const QUALITIES = ['maxresdefault', 'sddefault', 'hqdefault'];

/** YouTube 404s on a missing thumbnail, but also serves a ~1KB grey placeholder. */
async function exists(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    return buf.byteLength > 5000;
  } catch {
    return false;
  }
}

async function bestThumbnail(youtubeId) {
  for (const q of QUALITIES) {
    const url = `https://img.youtube.com/vi/${youtubeId}/${q}.jpg`;
    if (await exists(url)) return url;
  }
  return null;
}

const films = await prisma.films.findMany({ orderBy: { id: 'asc' } });
console.log(`Checking ${films.length} films${APPLY ? '' : ' (dry run)'}\n`);

const changes = [];

for (const film of films) {
  if (!film.youtube_id) {
    console.log(`⏭  ${film.slug} - no youtube_id`);
    continue;
  }

  // Leave anything we host ourselves alone.
  if (film.thumbnail_url && !film.thumbnail_url.includes('img.youtube.com')) {
    console.log(`⏭  ${film.slug} - self-hosted thumbnail`);
    continue;
  }

  const ok = film.thumbnail_url ? await exists(film.thumbnail_url) : false;
  if (ok) {
    console.log(`✅ ${film.slug} - current thumbnail fine`);
    continue;
  }

  const replacement = await bestThumbnail(film.youtube_id);
  if (!replacement) {
    console.log(`❌ ${film.slug} - no working thumbnail found`);
    continue;
  }

  changes.push({ id: film.id, slug: film.slug, from: film.thumbnail_url, to: replacement });
  console.log(`🔧 ${film.slug}\n     from ${film.thumbnail_url}\n     to   ${replacement}`);
}

console.log(`\n${changes.length} film(s) need fixing.`);

if (!APPLY) {
  console.log('Dry run - nothing written. Re-run with --apply to update.');
} else {
  for (const c of changes) {
    await prisma.films.update({ where: { id: c.id }, data: { thumbnail_url: c.to } });
  }
  console.log(`Updated ${changes.length} row(s).`);
}

// Rollback record, so a bad run can be undone.
if (changes.length) {
  const path = `/tmp/film-thumbnail-changes-${Date.now()}.json`;
  const { writeFileSync } = await import('node:fs');
  writeFileSync(path, JSON.stringify(changes, null, 2));
  console.log(`Previous values saved to ${path}`);
}

await prisma.$disconnect();
