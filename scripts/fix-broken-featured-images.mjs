import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        file.close();
        fs.unlinkSync(dest);
        resolve(false);
      }
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function uploadToR2(localPath, r2Key) {
  const fileContent = fs.readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: r2Key,
    Body: fileContent,
    ContentType: 'image/jpeg'
  }));
  return `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/${r2Key}`;
}

async function fixPost(post) {
  const youtubeId = post.meta?.youtubeId;

  if (!youtubeId) {
    console.log(`❌ ${post.slug} - No youtubeId`);
    return false;
  }

  // Extract year from slug or use 2020 as default
  const yearMatch = post.slug.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : '2020';

  const tmpPath = `/tmp/${post.slug}-youtube.jpg`;
  const r2Key = `blog/${year}/${post.slug}-youtube.jpg`;

  // Try maxresdefault first, then hqdefault
  let downloaded = await downloadFile(
    `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
    tmpPath
  );

  if (!downloaded) {
    downloaded = await downloadFile(
      `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      tmpPath
    );
  }

  if (!downloaded) {
    console.log(`❌ ${post.slug} - Could not download thumbnail`);
    return false;
  }

  // Upload to R2
  const r2Url = await uploadToR2(tmpPath, r2Key);

  // Update database
  await prisma.posts.update({
    where: { id: post.id },
    data: { featured_image: r2Url }
  });

  // Clean up
  fs.unlinkSync(tmpPath);

  console.log(`✅ ${post.slug} -> ${r2Url}`);
  return true;
}

async function main() {
  const posts = await prisma.posts.findMany({
    where: {
      status: 'published',
      featured_image: { contains: 'images.filmmyrun.co.uk' }
    },
    select: { id: true, slug: true, featured_image: true, meta: true }
  });

  console.log(`Found ${posts.length} posts with broken featured images\n`);

  for (const post of posts) {
    await fixPost(post);
  }

  console.log('\nDone!');
  await prisma.$disconnect();
}

main();
