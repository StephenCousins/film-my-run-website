/**
 * Uploads model photos of Printify products (tees, hoodies...) to R2 and writes the URLs
 * into film-my-run-merch/config/model-photos.json, keyed by product key then colour.
 * Files come from film-my-run-merch/Merch-Images/Tees/<product-key>--<Colour>[-n].png,
 * e.g. "phrase-legs-have-gone--Dark Grey.png". export-catalog.js then shows these
 * instead of the Printify mockups for that colour.
 *
 *   node scripts/upload-tee-photos.mjs
 */
import 'dotenv/config';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const bucket = process.env.R2_BUCKET_NAME || 'filmmyrun-images';
const base = process.env.R2_PUBLIC_URL || 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev';

const dir = '../film-my-run-merch/Merch-Images/Tees';
const configPath = '../film-my-run-merch/config/model-photos.json';
const photos = {};
for (const f of (await readdir(dir)).filter((f) => f.endsWith('.png')).sort()) {
  const m = f.match(/^(.+?)--(.+?)(?:-(\d+))?\.png$/);
  if (!m) { console.warn(`skip ${f}: expected <product-key>--<Colour>.png`); continue; }
  const [, key, colour, n = '1'] = m;
  const body = await sharp(await readFile(`${dir}/${f}`)).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  const objectKey = `shop/${key}-${colour.toLowerCase().replace(/\s+/g, '-')}-${n}.jpg`;
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: body, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000' }));
  ((photos[key] ??= {})[colour] ??= []).push(`${base}/${objectKey}`);
  console.log(`${key} ${colour}: ${objectKey}`);
}
await writeFile(configPath, JSON.stringify(photos, null, 2) + '\n');
