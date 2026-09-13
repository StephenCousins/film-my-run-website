#!/usr/bin/env node
// Seed the shoes table from data/shoes-seed.json. Skips slugs that already exist.
// Run: node --env-file=.env scripts/seed-shoes.mjs
//
// Every entry must name a brand that has a shoe_brands row (by canonical name
// or alias, case-insensitive) and use terrain/category values from the Prisma
// enums. The whole file is validated before anything is written, so a bad
// entry fails the run rather than leaving a half-seeded table.

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// Mirror of the ShoeTerrain / ShoeCategory enums in prisma/schema.prisma.
const TERRAINS = new Set(['road', 'trail', 'both']);
const CATEGORIES = new Set(['daily_trainer', 'race', 'long_run', 'speed', 'ultra', 'stability', 'max_cushion', 'minimal']);

function makeSlug(brand, model) {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function norm(s) {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Canonical name or alias, case-insensitive, or null. */
function resolveBrand(text, brands) {
  const n = norm(text);
  return brands.find(b => norm(b.name) === n || b.aliases.some(a => norm(a) === n)) ?? null;
}

async function main() {
  const seedPath = join(__dirname, '../data/shoes-seed.json');
  const shoes = JSON.parse(readFileSync(seedPath, 'utf-8'));
  const brands = await prisma.shoe_brands.findMany();

  const problems = [];
  const rows = shoes.map((shoe, i) => {
    const label = `entry ${i} (${shoe.brand} ${shoe.model})`;
    const brand = resolveBrand(shoe.brand, brands);
    if (!brand) problems.push(`${label}: unknown brand "${shoe.brand}" — add a shoe_brands row first`);
    if (!TERRAINS.has(shoe.terrain)) problems.push(`${label}: terrain "${shoe.terrain}" is not one of ${[...TERRAINS].join(', ')}`);
    if (!CATEGORIES.has(shoe.category)) problems.push(`${label}: category "${shoe.category}" is not one of ${[...CATEGORIES].join(', ')}`);
    return { shoe, brand };
  });
  if (problems.length > 0) {
    console.error(`Seed file has ${problems.length} problem(s); nothing written:`);
    for (const p of problems) console.error(`  ${p}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Seeding ${shoes.length} shoes...`);

  let created = 0;
  let skipped = 0;

  for (const { shoe, brand } of rows) {
    const slug = makeSlug(brand.name, shoe.model);
    const existing = await prisma.shoes.findUnique({ where: { slug } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.shoes.create({
      data: {
        brand: brand.name,
        brand_id: brand.id,
        model: shoe.model,
        slug,
        terrain: shoe.terrain,
        category: shoe.category,
        origin: 'seed',
        drop_mm: shoe.drop_mm ?? null,
        weight_g: shoe.weight_g ?? null,
        stack_height_mm: shoe.stack_height_mm ?? null,
        price_gbp: shoe.price_gbp ?? null,
        release_year: shoe.release_year ?? null,
        description: shoe.description ?? null,
        image_url: shoe.image_url ?? null,
        buy_url: shoe.buy_url ?? null,
      },
    });
    created++;
  }

  console.log(`Done. Created: ${created}, Skipped (already exist): ${skipped}`);
}

main()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
