/**
 * Uploads Stephen's vest photos to R2 and writes the URLs into
 * film-my-run-merch/config/contrado.json (modelPhotos, one list per colour + layout).
 * Files come from film-my-run-merch/Merch-Images/Vests/<Colour> - <side stripes|shoulder stripe>/*.(png|webp|jpg)
 * in file-name order (so number them), plus *.mp4 clips
 * (re-encoded with ffmpeg to a small muted h264 with a poster frame; written to modelVideos).
 * Keys carry a content hash, so a replaced photo gets a new URL and no cache serves the old one.
 *
 *   node scripts/upload-vest-photos.mjs
 */
import 'dotenv/config';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
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
  for (const [layout, folder] of [['side', 'side stripes'], ['shoulder', 'shoulder stripe']]) {
    const name = `vest-${colour}-${layout}`;
    const dir = `../film-my-run-merch/Merch-Images/Vests/${colour[0].toUpperCase()}${colour.slice(1)} - ${folder}`;
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
    const videos = [];
    for (const [n, f] of (await readdir(dir)).filter((f) => /\.mp4$/i.test(f)).sort().entries()) {
      const out = `${tmpdir()}/${name}-${n + 1}.mp4`;
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${dir}/${f}`, '-an', '-vf', 'scale=-2:min(720\\,ih)', '-c:v', 'libx264', '-crf', '28', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
      const mp4 = await readFile(out);
      const poster = await sharp(execFileSync('ffmpeg', ['-loglevel', 'error', '-i', out, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { maxBuffer: 64e6 })).jpeg({ quality: 88 }).toBuffer();
      const hash = createHash('md5').update(mp4).digest('hex').slice(0, 8);
      const key = `shop/${name}-video-${n + 1}-${hash}`;
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: `${key}.mp4`, Body: mp4, ContentType: 'video/mp4', CacheControl: 'public, max-age=31536000' }));
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: `${key}.jpg`, Body: poster, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000' }));
      videos.push({ src: `${base}/${key}.mp4`, poster: `${base}/${key}.jpg` });
    }
    if (videos.length) config.products[name].modelVideos = videos; else delete config.products[name].modelVideos;
    console.log(`${name}: ${urls.length} photos, ${videos.length} videos`);
  }
}
await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
