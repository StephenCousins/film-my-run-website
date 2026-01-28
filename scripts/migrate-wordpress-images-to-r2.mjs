#!/usr/bin/env node

/**
 * WordPress Images Migration Script
 *
 * Uploads images referenced in blog posts from local WordPress uploads to R2,
 * then updates database references.
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'filmmyrun-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const WP_UPLOADS_DIR = path.resolve(__dirname, '../../html/wp-content/uploads');

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

// Domains to migrate
const MIGRATE_DOMAINS = [
  'filmmyrun.co.uk',
  'www.filmmyrun.co.uk',
  'i0.wp.com',
  'i1.wp.com',
  'i2.wp.com',
  'images.filmmyrun.co.uk',
];

function createClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

async function existsInR2(client, key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadFile(client, localPath, key) {
  const ext = path.extname(localPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const fileBuffer = fs.readFileSync(localPath);

  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000',
  }));

  return `${R2_PUBLIC_URL}/${key}`;
}

function urlToLocalPath(url) {
  try {
    const parsed = new URL(url);

    // Handle WordPress CDN URLs (i0.wp.com, etc.)
    if (parsed.hostname.match(/i\d\.wp\.com/)) {
      // URL format: https://i0.wp.com/filmmyrun.co.uk/wp-content/uploads/...
      const match = parsed.pathname.match(/filmmyrun\.co\.uk(\/wp-content\/uploads\/.+)/);
      if (match) {
        return path.join(WP_UPLOADS_DIR, match[1].replace('/wp-content/uploads/', ''));
      }
    }

    // Handle direct filmmyrun.co.uk URLs
    if (parsed.hostname.includes('filmmyrun.co.uk')) {
      const uploadsMatch = parsed.pathname.match(/\/wp-content\/uploads\/(.+)/);
      if (uploadsMatch) {
        return path.join(WP_UPLOADS_DIR, uploadsMatch[1]);
      }
    }

    return null;
  } catch {
    return null;
  }
}

function urlToR2Key(url) {
  try {
    const parsed = new URL(url);

    // Handle WordPress CDN URLs
    if (parsed.hostname.match(/i\d\.wp\.com/)) {
      const match = parsed.pathname.match(/filmmyrun\.co\.uk\/wp-content\/uploads\/(.+)/);
      if (match) return `wp-uploads/${match[1]}`;
    }

    // Handle direct filmmyrun.co.uk URLs
    if (parsed.hostname.includes('filmmyrun.co.uk')) {
      const uploadsMatch = parsed.pathname.match(/\/wp-content\/uploads\/(.+)/);
      if (uploadsMatch) return `wp-uploads/${uploadsMatch[1]}`;
    }

    return null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('========================================');
  console.log('  WordPress Images Migration to R2');
  console.log('========================================\n');

  const client = createClient();

  // Step 1: Find all image URLs in posts
  console.log('Step 1: Finding image URLs in database...\n');

  const posts = await prisma.posts.findMany({
    select: { id: true, slug: true, content: true, featured_image: true }
  });

  const urlRegex = /https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp|svg)/gi;
  const urlMap = new Map(); // url -> { localPath, r2Key, r2Url }

  for (const post of posts) {
    const urls = [];
    if (post.content) {
      const matches = post.content.match(urlRegex) || [];
      urls.push(...matches);
    }
    if (post.featured_image && post.featured_image.startsWith('http')) {
      urls.push(post.featured_image);
    }

    for (const url of urls) {
      if (urlMap.has(url)) continue;

      const hostname = new URL(url).hostname;
      if (!MIGRATE_DOMAINS.some(d => hostname.includes(d))) continue;

      const localPath = urlToLocalPath(url);
      const r2Key = urlToR2Key(url);

      if (localPath && r2Key) {
        urlMap.set(url, { localPath, r2Key, r2Url: null });
      }
    }
  }

  console.log(`Found ${urlMap.size} unique images to migrate\n`);

  // Step 2: Upload images to R2
  console.log('Step 2: Uploading images to R2...\n');

  let uploaded = 0;
  let skipped = 0;
  let missing = 0;
  let errors = 0;
  const errorList = [];

  let i = 0;
  for (const [url, data] of urlMap) {
    i++;
    const progress = `[${i}/${urlMap.size}]`;

    // Check if file exists locally
    if (!fs.existsSync(data.localPath)) {
      console.log(`${progress} MISSING: ${data.localPath}`);
      missing++;
      continue;
    }

    try {
      // Check if already in R2
      const exists = await existsInR2(client, data.r2Key);
      if (exists) {
        data.r2Url = `${R2_PUBLIC_URL}/${data.r2Key}`;
        console.log(`${progress} SKIP: ${data.r2Key}`);
        skipped++;
        continue;
      }

      // Upload
      data.r2Url = await uploadFile(client, data.localPath, data.r2Key);
      console.log(`${progress} UPLOADED: ${data.r2Key}`);
      uploaded++;
    } catch (err) {
      console.log(`${progress} ERROR: ${data.r2Key} - ${err.message}`);
      errorList.push({ url, error: err.message });
      errors++;
    }
  }

  console.log(`\nUpload complete: ${uploaded} uploaded, ${skipped} skipped, ${missing} missing, ${errors} errors\n`);

  // Step 3: Update database
  console.log('Step 3: Updating database references...\n');

  let postsUpdated = 0;
  for (const post of posts) {
    let content = post.content || '';
    let featuredImage = post.featured_image || '';
    let changed = false;

    for (const [oldUrl, data] of urlMap) {
      if (!data.r2Url) continue;

      if (content.includes(oldUrl)) {
        content = content.split(oldUrl).join(data.r2Url);
        changed = true;
      }
      if (featuredImage === oldUrl) {
        featuredImage = data.r2Url;
        changed = true;
      }
    }

    if (changed) {
      await prisma.posts.update({
        where: { id: post.id },
        data: {
          content,
          featured_image: featuredImage,
          updated_at: new Date()
        }
      });
      postsUpdated++;
      console.log(`Updated post: ${post.slug}`);
    }
  }

  console.log(`\n${postsUpdated} posts updated in database`);

  // Summary
  console.log('\n========================================');
  console.log('  Migration Complete');
  console.log('========================================');
  console.log(`  Images uploaded: ${uploaded}`);
  console.log(`  Images skipped:  ${skipped}`);
  console.log(`  Images missing:  ${missing}`);
  console.log(`  Errors:          ${errors}`);
  console.log(`  Posts updated:   ${postsUpdated}`);

  if (errorList.length > 0) {
    console.log('\nErrors:');
    errorList.forEach(e => console.log(`  - ${e.url}: ${e.error}`));
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
