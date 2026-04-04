import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
const assetsDir = path.resolve(__dirname, '..', '..', 'Assets');
const files = fs.readdirSync(assetsDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));

console.log(`Found ${files.length} images in Assets folder`);

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  const key = 'blog/2025/' + file.toLowerCase().replace(/ /g, '-');
  const body = fs.readFileSync(path.join(assetsDir, file));
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: MIME[ext] || 'application/octet-stream',
    CacheControl: 'public, max-age=31536000',
  }));
  console.log('Uploaded:', process.env.R2_PUBLIC_URL + '/' + key);
}

console.log('Done!');
