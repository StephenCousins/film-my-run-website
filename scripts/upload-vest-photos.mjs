/**
 * Uploads Stephen's vest photos to R2 and writes the URLs into
 * film-my-run-merch/config/contrado.json (modelPhotos, one list per colour + layout).
 * Files come from film-my-run-merch/Merch-Images/<Colour> <Side|Stripe>/*.(png|webp|jpg).
 * Keys carry a content hash, so a replaced photo gets a new URL and no cache serves the old one.
 *
 *   node scripts/upload-vest-photos.mjs
 */
import 'dotenv/config';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const bucket = process.env.R2_BUCKET_NAME || 'filmmyrun-images';
const base = process.env.R2_PUBLIC_URL || 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev';

const configPath = '../film-my-run-merch/config/contrado.json';
const config = JSON.parse(await readFile(configPath, 'utf8'));

for (const colour of ['black', 'white', 'forest', 'navy', 'orange']) {
  for (const [layout, folder] of [['side', 'Side'], ['shoulder', 'Stripe']]) {
    const name = `vest-${colour}-${layout}`;
    const dir = `../film-my-run-merch/Merch-Images/${colour[0].toUpperCase()}${colour.slice(1)} ${folder}`;
    const files = (await readdir(dir)).filter((f) => /\.(png|webp|jpe?g)$/i.test(f)).sort();
    const urls = [];
    for (const [n, f] of files.entries()) {
      const body = await sharp(await readFile(`${dir}/${f}`)).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
      const key = `shop/${name}-${n + 1}-${createHash('md5').update(body).digest('hex').slice(0, 8)}.jpg`;
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000' }));
      urls.push(`${base}/${key}`);
    }
    delete config.products[name].modelPhoto;
    config.products[name].modelPhotos = urls;
    console.log(`${name}: ${urls.length} photos`);
  }
}
await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
