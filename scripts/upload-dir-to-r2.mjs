// Upload every image in a folder to R2 under a prefix: node scripts/upload-dir-to-r2.mjs <dir> <prefix>
// e.g. node scripts/upload-dir-to-r2.mjs ~/shots centurion/pitch  →  {R2_PUBLIC_URL}/centurion/pitch/<file>
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const [dir, prefix] = process.argv.slice(2);
if (!dir || !prefix) { console.error('usage: upload-dir-to-r2.mjs <dir> <prefix>'); process.exit(1); }

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

for (const file of fs.readdirSync(dir).filter(f => MIME[path.extname(f).toLowerCase()])) {
  const key = `${prefix.replace(/\/$/, '')}/${file}`;
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME, Key: key, Body: fs.readFileSync(path.join(dir, file)),
    ContentType: MIME[path.extname(file).toLowerCase()], CacheControl: 'public, max-age=86400',
  }));
  console.log(`${process.env.R2_PUBLIC_URL}/${key}`);
}
