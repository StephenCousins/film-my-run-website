/**
 * Uploads the model photos for the Contrado vests to R2 and prints the public URLs.
 * Files come from film-my-run-merch/photos/results/vest-<colour>-<layout>-model.png.
 *
 *   node scripts/upload-vest-photos.mjs
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const bucket = process.env.R2_BUCKET_NAME || 'filmmyrun-images';
const base = process.env.R2_PUBLIC_URL || 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev';

for (const colour of ['black', 'white', 'forest', 'navy', 'orange']) {
  for (const layout of ['side', 'shoulder']) {
    const name = `vest-${colour}-${layout}`;
    const png = await readFile(`../film-my-run-merch/photos/results/${name}-model.png`);
    const body = await sharp(png).jpeg({ quality: 88 }).toBuffer();       // 1024px square, ~150 KB
    const key = `shop/${name}-model.jpg`;
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000' }));
    console.log(`${name} ${base}/${key}`);
  }
}
