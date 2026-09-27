import sharp from 'sharp';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { uploadToR2 } from '@/lib/r2';
import { profileProblems } from './checks';
import type { RunnerFile, RunnerPhoto } from './types';

const R2_PUBLIC = process.env.R2_PUBLIC_URL ?? 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev';
const esc = (p: string) => p.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);

export const bioHtml = (paragraphs: string[]) => paragraphs.map((p) => `<p>${esc(p.trim())}</p>`).join('\n');

export interface PhotoDeps { fetch?: typeof fetch; upload?: (key: string, body: Buffer, type: string) => Promise<string> }

/** Copies a photo to R2 (never hotlinked): at most 1600 px wide, webp. */
export async function storePhoto(p: RunnerPhoto, slug: string, deps: PhotoDeps = {}): Promise<RunnerPhoto> {
  if (p.url.startsWith(`${R2_PUBLIC}/runners/`)) return p;
  const res = await (deps.fetch ?? fetch)(p.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FilmMyRunBot/1.0; +https://filmmyrun.com)' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) throw new Error(`Not an image: ${p.url}`);
  const body = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const url = await (deps.upload ?? uploadToR2)(`runners/${slug}-${p.kind}.webp`, body, 'image/webp');
  return { ...p, url };
}

/** Checks, stores the photos and publishes (insert or update by slug). */
export async function saveRunner(f: RunnerFile, writtenBy: 'session' | 'auto', deps: PhotoDeps = {}): Promise<{ slug: string }> {
  const problems = profileProblems(f);
  if (problems.length) throw new Error(`Not saved, ${f.slug}: ${problems.join('; ')}`);
  const photos: RunnerPhoto[] = [];
  for (const p of f.photos ?? []) photos.push(await storePhoto(p, f.slug, deps));
  const data = {
    name: f.name, aliases: f.aliases, nationality: f.nationality, sex: f.sex, birth_year: f.birthYear,
    disciplines: f.disciplines, era: f.era, bio: bioHtml(f.bio ?? []),
    best_finishes: (f.bestFinishes ?? []) as unknown as Prisma.InputJsonValue,
    sources: (f.sources ?? []) as unknown as Prisma.InputJsonValue,
    photos: photos as unknown as Prisma.InputJsonValue,
    utmb_id: f.utmb?.id ?? null, utmb_uri: f.utmb?.uri ?? null, utmb_index: f.utmb?.index ?? null,
    utmb_index_at: f.utmb ? new Date() : null,
    status: 'published', written_by: writtenBy, bio_checked_at: new Date(),
  };
  await prisma.runners.upsert({ where: { slug: f.slug }, create: { slug: f.slug, ...data }, update: data });
  return { slug: f.slug };
}
