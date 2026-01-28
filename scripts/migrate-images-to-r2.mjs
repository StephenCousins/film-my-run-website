#!/usr/bin/env node

/**
 * Image Migration Script: Upload all images and videos from public/ to Cloudflare R2
 *
 * Usage:
 *   node scripts/migrate-images-to-r2.mjs
 *
 * Environment variables required:
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME (optional, defaults to 'filmmyrun-images')
 *   R2_PUBLIC_URL (optional, defaults to 'https://images.filmmyrun.co.uk')
 *
 * Output:
 *   - Uploads all files to R2
 *   - Creates image-migration-map.json with old path -> new URL mappings
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'filmmyrun-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://images.filmmyrun.co.uk';

// MIME type mapping
const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avif': 'image/avif',
};

// Validate configuration
function validateConfig() {
  const missing = [];
  if (!R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
  if (!R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
  if (!R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach((v) => console.error(`  - ${v}`));
    console.error('\nPlease set these in your .env file or environment.');
    process.exit(1);
  }
}

// Create R2 client
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

// Check if file exists in R2
async function existsInR2(client, key) {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

// Upload a file to R2
async function uploadFile(client, localPath, key) {
  const ext = path.extname(localPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Set cache control - 1 year for immutable assets
  const cacheControl = 'public, max-age=31536000';

  const fileBuffer = fs.readFileSync(localPath);

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      CacheControl: cacheControl,
    })
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

// Recursively get all files in a directory
function getAllFiles(dir, basePath = '') {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(basePath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, relativePath));
    } else {
      files.push({
        localPath: fullPath,
        relativePath: relativePath,
      });
    }
  }

  return files;
}

// Main migration function
async function migrate() {
  console.log('========================================');
  console.log('  Image Migration to Cloudflare R2');
  console.log('========================================\n');

  validateConfig();

  const client = createClient();
  const projectRoot = path.resolve(__dirname, '..');
  const publicDir = path.join(projectRoot, 'public');
  const imagesDir = path.join(publicDir, 'images');
  const videosDir = path.join(publicDir, 'videos');

  // Track migrations
  const migrations = {};
  const errors = [];
  let uploaded = 0;
  let skipped = 0;

  // Gather all files
  const allFiles = [];

  if (fs.existsSync(imagesDir)) {
    const imageFiles = getAllFiles(imagesDir);
    imageFiles.forEach((f) => {
      // R2 key removes 'images/' prefix since we're at images.filmmyrun.co.uk
      const key = f.relativePath.replace(/\\/g, '/');
      const localPath = `/images/${f.relativePath.replace(/\\/g, '/')}`;
      allFiles.push({
        ...f,
        key,
        localPath,
      });
    });
  }

  if (fs.existsSync(videosDir)) {
    const videoFiles = getAllFiles(videosDir);
    videoFiles.forEach((f) => {
      // Videos keep their 'videos/' prefix
      const key = `videos/${f.relativePath.replace(/\\/g, '/')}`;
      const localPath = `/videos/${f.relativePath.replace(/\\/g, '/')}`;
      allFiles.push({
        ...f,
        key,
        localPath,
      });
    });
  }

  console.log(`Found ${allFiles.length} files to migrate\n`);

  // Process each file
  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    const progress = `[${i + 1}/${allFiles.length}]`;

    try {
      // Check if already exists (skip if so)
      const exists = await existsInR2(client, file.key);

      if (exists) {
        console.log(`${progress} SKIP (exists): ${file.key}`);
        migrations[file.localPath] = `${R2_PUBLIC_URL}/${file.key}`;
        skipped++;
        continue;
      }

      // Upload the file
      const url = await uploadFile(client, file.localPath.startsWith('/') ? path.join(publicDir, file.localPath) : file.localPath, file.key);
      console.log(`${progress} UPLOADED: ${file.key}`);
      migrations[file.localPath] = url;
      uploaded++;
    } catch (error) {
      console.error(`${progress} ERROR: ${file.key} - ${error.message}`);
      errors.push({ file: file.key, error: error.message });
    }
  }

  // Write migration map
  const mapPath = path.join(projectRoot, 'image-migration-map.json');
  fs.writeFileSync(mapPath, JSON.stringify(migrations, null, 2));

  // Summary
  console.log('\n========================================');
  console.log('  Migration Complete');
  console.log('========================================');
  console.log(`  Uploaded: ${uploaded}`);
  console.log(`  Skipped:  ${skipped} (already existed)`);
  console.log(`  Errors:   ${errors.length}`);
  console.log(`\n  Migration map saved to: ${mapPath}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach((e) => console.log(`  - ${e.file}: ${e.error}`));
  }

  console.log('\nNext steps:');
  console.log('  1. Update code references using the migration map');
  console.log('  2. Update database Post.featuredImage and Post.content');
  console.log('  3. Test all pages to ensure images load correctly');
  console.log('  4. Remove public/images and public/videos from git\n');
}

// Run migration
migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
