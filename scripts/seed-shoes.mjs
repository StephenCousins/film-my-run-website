#!/usr/bin/env node
// Seed the shoes table from data/shoes-seed.json
// Run: node scripts/seed-shoes.mjs

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

function makeSlug(brand, model) {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const seedPath = join(__dirname, '../data/shoes-seed.json');
  const shoes = JSON.parse(readFileSync(seedPath, 'utf-8'));

  console.log(`Seeding ${shoes.length} shoes...`);

  let created = 0;
  let skipped = 0;

  for (const shoe of shoes) {
    const slug = makeSlug(shoe.brand, shoe.model);
    const existing = await prisma.shoes.findUnique({ where: { slug } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.shoes.create({
      data: {
        brand: shoe.brand,
        model: shoe.model,
        slug,
        terrain: shoe.terrain,
        category: shoe.category,
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
  .catch(console.error)
  .finally(() => prisma.$disconnect());
