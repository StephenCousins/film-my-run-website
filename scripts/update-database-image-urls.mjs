#!/usr/bin/env node

/**
 * Database Image URL Migration Script
 *
 * Updates all image references in the database from local paths (/images/...)
 * to Cloudflare R2 URLs (https://images.filmmyrun.co.uk/...).
 *
 * Usage:
 *   node scripts/update-database-image-urls.mjs
 *
 * Environment variables required:
 *   DATABASE_URL - PostgreSQL connection string
 *   R2_PUBLIC_URL (optional, defaults to 'https://images.filmmyrun.co.uk')
 *
 * What it updates:
 *   - Post.featuredImage fields
 *   - Post.content (inline <img src="..."> tags)
 *   - Film.thumbnailUrl fields
 *   - Product.images arrays
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://images.filmmyrun.co.uk';

// Stats tracking
let stats = {
  postsUpdated: 0,
  featuredImagesUpdated: 0,
  contentImagesUpdated: 0,
  filmsUpdated: 0,
  productsUpdated: 0,
  errors: [],
};

/**
 * Convert a local path to R2 URL
 * /images/blog/2018/photo.jpg -> https://images.filmmyrun.co.uk/blog/2018/photo.jpg
 */
function convertPath(localPath) {
  if (!localPath || !localPath.startsWith('/images/')) {
    return localPath;
  }
  // Remove /images/ prefix
  const key = localPath.replace('/images/', '');
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Convert all image paths in HTML content
 */
function convertContentImages(content) {
  if (!content) return content;

  // Match src="/images/..." patterns
  const imgPattern = /src=["']\/images\/([^"']+)["']/g;

  return content.replace(imgPattern, (match, path) => {
    return `src="${R2_PUBLIC_URL}/${path}"`;
  });
}

async function updatePosts() {
  console.log('\n📝 Updating Post records...');

  try {
    // Find posts with local image paths
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { featuredImage: { startsWith: '/images/' } },
          { content: { contains: '/images/' } },
        ],
      },
    });

    console.log(`   Found ${posts.length} posts to update`);

    for (const post of posts) {
      const updates = {};

      // Update featuredImage
      if (post.featuredImage?.startsWith('/images/')) {
        updates.featuredImage = convertPath(post.featuredImage);
        stats.featuredImagesUpdated++;
      }

      // Update content
      if (post.content?.includes('/images/')) {
        const originalContent = post.content;
        updates.content = convertContentImages(post.content);

        // Count how many images were replaced
        const matches = originalContent.match(/src=["']\/images\//g);
        if (matches) {
          stats.contentImagesUpdated += matches.length;
        }
      }

      if (Object.keys(updates).length > 0) {
        await prisma.post.update({
          where: { id: post.id },
          data: updates,
        });
        stats.postsUpdated++;
        console.log(`   ✓ Updated post: ${post.slug}`);
      }
    }
  } catch (error) {
    console.error('   ✗ Error updating posts:', error.message);
    stats.errors.push({ table: 'Post', error: error.message });
  }
}

async function updateFilms() {
  console.log('\n🎬 Updating Film records...');

  try {
    // Check if Film table exists
    const films = await prisma.film.findMany({
      where: {
        thumbnailUrl: { startsWith: '/images/' },
      },
    });

    console.log(`   Found ${films.length} films to update`);

    for (const film of films) {
      if (film.thumbnailUrl?.startsWith('/images/')) {
        await prisma.film.update({
          where: { id: film.id },
          data: {
            thumbnailUrl: convertPath(film.thumbnailUrl),
          },
        });
        stats.filmsUpdated++;
        console.log(`   ✓ Updated film: ${film.slug}`);
      }
    }
  } catch (error) {
    if (error.code === 'P2021' || error.message.includes('does not exist')) {
      console.log('   ℹ Film table does not exist, skipping');
    } else {
      console.error('   ✗ Error updating films:', error.message);
      stats.errors.push({ table: 'Film', error: error.message });
    }
  }
}

async function updateProducts() {
  console.log('\n🛒 Updating Product records...');

  try {
    // Check if Product table exists
    const products = await prisma.product.findMany();

    let productsToUpdate = 0;

    for (const product of products) {
      // Check if any images start with /images/
      const hasLocalImages = product.images?.some(img => img.startsWith('/images/'));

      if (hasLocalImages) {
        productsToUpdate++;
        const newImages = product.images.map(img =>
          img.startsWith('/images/') ? convertPath(img) : img
        );

        await prisma.product.update({
          where: { id: product.id },
          data: {
            images: newImages,
          },
        });
        stats.productsUpdated++;
        console.log(`   ✓ Updated product: ${product.slug}`);
      }
    }

    console.log(`   Found ${productsToUpdate} products to update`);
  } catch (error) {
    if (error.code === 'P2021' || error.message.includes('does not exist')) {
      console.log('   ℹ Product table does not exist, skipping');
    } else {
      console.error('   ✗ Error updating products:', error.message);
      stats.errors.push({ table: 'Product', error: error.message });
    }
  }
}

async function main() {
  console.log('========================================');
  console.log('  Database Image URL Migration');
  console.log('========================================');
  console.log(`\nR2 Public URL: ${R2_PUBLIC_URL}`);

  try {
    // Test database connection
    await prisma.$connect();
    console.log('\n✓ Connected to database');

    // Update each table
    await updatePosts();
    await updateFilms();
    await updateProducts();

    // Summary
    console.log('\n========================================');
    console.log('  Migration Complete');
    console.log('========================================');
    console.log(`  Posts updated:           ${stats.postsUpdated}`);
    console.log(`  Featured images updated: ${stats.featuredImagesUpdated}`);
    console.log(`  Content images updated:  ${stats.contentImagesUpdated}`);
    console.log(`  Films updated:           ${stats.filmsUpdated}`);
    console.log(`  Products updated:        ${stats.productsUpdated}`);
    console.log(`  Errors:                  ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\nErrors:');
      stats.errors.forEach(e => console.log(`  - ${e.table}: ${e.error}`));
    }

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
