/**
 * Uploads model photos of Printify products (tees, hoodies...) to R2 and writes the URLs
 * into film-my-run-merch/config/model-photos.json, keyed by product key then colour.
 * Files come from film-my-run-merch/Merch-Images/{Tees,Hoodies,Caps}/<product-key>--<Colour>[-n].(png|webp|jpg),
 * e.g. "phrase-legs-have-gone--Dark Grey.png" or "hoodie-legs-have-gone--Charcoal.webp". export-catalog.js then shows these
 * instead of the Printify mockups for that colour.
 *
 * A video with the same name, <product-key>--<Colour>[-n].mp4, replaces the photo in that
 * slot: it is re-encoded (720p, muted, h264, the same settings as the vest clips), a poster is
 * taken from its first frame, and both go to R2 under content-hashed keys. In the JSON a
 * video slot is { src: poster, video: mp4 } instead of a plain URL. The photo file stays for
 * Etsy (etsy-photos.js only reads images).
 *
 *   node scripts/upload-tee-photos.mjs
 */
import 'dotenv/config';
import { readFile, readdir, writeFile, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const bucket = process.env.R2_BUCKET_NAME || 'filmmyrun-images';
const base = process.env.R2_PUBLIC_URL || 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev';

const dirs = ['Tees', 'Hoodies', 'Caps'].map((d) => `../film-my-run-merch/Merch-Images/${d}`);
const configPath = '../film-my-run-merch/config/model-photos.json';
const photos = {};
const slots = {}; // key -> colour -> n -> entry
const work = await mkdtemp(join(tmpdir(), 'tee-video-'));
for (const dir of dirs) for (const f of (await readdir(dir)).filter((f) => /\.(png|webp|jpe?g|mp4)$/i.test(f)).sort()) {
  const m = f.match(/^(.+?)--(.+?)(?:-(\d+))?\.(\w+)$/);
  if (!m) { console.warn(`skip ${f}: expected <product-key>--<Colour>.png`); continue; }
  const [, key, colour, n = '1', ext] = m;
  const slug = `${key}-${colour.toLowerCase().replace(/\s+/g, '-')}-${n}`;
  const slot = ((slots[key] ??= {})[colour] ??= {});
  if (ext.toLowerCase() === 'mp4') {
    const out = join(work, `${slug}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${dir}/${f}`, '-an', '-vf', 'scale=-2:min(720\\,ih)', '-c:v', 'libx264', '-crf', '28', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
    const mp4 = await readFile(out);
    const poster = await sharp(execFileSync('ffmpeg', ['-loglevel', 'error', '-i', out, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { maxBuffer: 64e6 })).jpeg({ quality: 88 }).toBuffer();
    const objectKey = `shop/${slug}-video-${createHash('sha256').update(mp4).digest('hex').slice(0, 10)}`;
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: `${objectKey}.mp4`, Body: mp4, ContentType: 'video/mp4', CacheControl: 'public, max-age=31536000' }));
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: `${objectKey}.jpg`, Body: poster, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000' }));
    slot[n] = { src: `${base}/${objectKey}.jpg`, video: `${base}/${objectKey}.mp4` };
    console.log(`${key} ${colour}: VIDEO ${objectKey}.mp4 (${Math.round(mp4.length / 1024)} KB)`);
    continue;
  }
  if (slot[n]?.video) continue; // a video already fills this slot
  const body = await sharp(await readFile(`${dir}/${f}`)).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  const objectKey = `shop/${slug}.jpg`;
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: body, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000' }));
  slot[n] = `${base}/${objectKey}`;
  console.log(`${key} ${colour}: ${objectKey}`);
}
for (const [key, colours] of Object.entries(slots)) for (const [colour, byN] of Object.entries(colours)) {
  (photos[key] ??= {})[colour] = Object.keys(byN).sort((a, b) => a - b).map((n) => byN[n]);
}
await writeFile(configPath, JSON.stringify(photos, null, 2) + '\n');
