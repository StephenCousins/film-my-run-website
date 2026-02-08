#!/usr/bin/env node

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'filmmyrun-images';
const BASE_PATH = '../html/wp-content/uploads';

const imagesToUpload = [
  { local: '2025/06/IMG_2508-scaled.png', r2Key: 'wp-uploads/2025/06/IMG_2508-scaled.png', mime: 'image/png' },
  { local: '2025/06/IMG_1324-scaled.jpg', r2Key: 'wp-uploads/2025/06/IMG_1324-scaled.jpg', mime: 'image/jpeg' },
  { local: '2025/06/IMG_1304-2-scaled.jpg', r2Key: 'wp-uploads/2025/06/IMG_1304-2-scaled.jpg', mime: 'image/jpeg' },
  { local: '2025/06/IMG_1707-scaled.jpg', r2Key: 'wp-uploads/2025/06/IMG_1707-scaled.jpg', mime: 'image/jpeg' },
  { local: '2020/03/transgrancanaria2020-12054-scaled.jpg', r2Key: 'wp-uploads/2020/03/transgrancanaria2020-12054-scaled.jpg', mime: 'image/jpeg' },
];

async function upload() {
  for (const img of imagesToUpload) {
    const localPath = path.join(process.cwd(), BASE_PATH, img.local);

    if (!fs.existsSync(localPath)) {
      console.log(`SKIP: ${img.local} (not found)`);
      continue;
    }

    const fileContent = fs.readFileSync(localPath);

    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: img.r2Key,
        Body: fileContent,
        ContentType: img.mime,
      }));
      console.log(`OK: ${img.r2Key}`);
    } catch (err) {
      console.log(`ERROR: ${img.r2Key} - ${err.message}`);
    }
  }
}

upload();
