import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { lookup } from 'mime-types';
import * as fs from 'fs';
import * as path from 'path';

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'filmmyrun-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://images.filmmyrun.co.uk';

// Validate required environment variables
function validateConfig() {
  if (!R2_ACCOUNT_ID) throw new Error('R2_ACCOUNT_ID is required');
  if (!R2_ACCESS_KEY_ID) throw new Error('R2_ACCESS_KEY_ID is required');
  if (!R2_SECRET_ACCESS_KEY) throw new Error('R2_SECRET_ACCESS_KEY is required');
}

// Create S3-compatible client for Cloudflare R2
export function createR2Client(): S3Client {
  validateConfig();

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

// Lazy-initialized client
let _r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!_r2Client) {
    _r2Client = createR2Client();
  }
  return _r2Client;
}

/**
 * Upload a file to R2
 * @param key - The path/key in R2 (e.g., "blog/2018/image.jpg")
 * @param body - File contents as Buffer
 * @param contentType - MIME type (e.g., "image/jpeg")
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const client = getR2Client();

  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000', // 1 year cache for immutable assets
  }));

  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Upload a local file to R2
 * @param localPath - Path to local file
 * @param r2Key - Key/path in R2 bucket
 * @returns Public URL of the uploaded file
 */
export async function uploadFileToR2(
  localPath: string,
  r2Key: string
): Promise<string> {
  const fileBuffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();

  // Determine content type
  let contentType = lookup(ext) || 'application/octet-stream';

  // Special handling for SVGs
  if (ext === '.svg') {
    contentType = 'image/svg+xml';
  }

  return uploadToR2(r2Key, fileBuffer, contentType);
}

/**
 * Check if a file exists in R2
 * @param key - The path/key to check
 * @returns true if exists, false otherwise
 */
export async function existsInR2(key: string): Promise<boolean> {
  const client = getR2Client();

  try {
    await client.send(new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the public URL for an R2 key
 * @param key - The path/key in R2
 * @returns Public URL
 */
export function getR2Url(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Convert a local /images/ or /videos/ path to an R2 URL
 * @param localPath - Path like "/images/blog/2018/photo.jpg"
 * @returns R2 URL like "https://images.filmmyrun.co.uk/blog/2018/photo.jpg"
 */
export function localPathToR2Url(localPath: string): string {
  // Remove leading /images/ or /videos/ prefix
  let key = localPath;
  if (key.startsWith('/images/')) {
    key = key.replace('/images/', '');
  } else if (key.startsWith('/videos/')) {
    key = key.replace('/videos/', 'videos/');
  } else if (key.startsWith('/')) {
    key = key.substring(1);
  }

  return `${R2_PUBLIC_URL}/${key}`;
}

// Export configuration for scripts
export const r2Config = {
  accountId: R2_ACCOUNT_ID,
  bucketName: R2_BUCKET_NAME,
  publicUrl: R2_PUBLIC_URL,
};
