// Publishes a runner from a work file a session has filled in (bio, bestFinishes, photos, sources).
//
// Run:   npm run runners:save -- runners-work/ann-trason.json
import { readFile } from 'node:fs/promises';
import { prisma } from '@/lib/db';
import { saveRunner } from '@/lib/runners/save';
import type { RunnerFile } from '@/lib/runners/types';

(async () => {
  const path = process.argv[2];
  if (!path) throw new Error('Usage: npm run runners:save -- runners-work/<slug>.json');
  const f = JSON.parse(await readFile(path, 'utf8')) as RunnerFile;
  const { slug } = await saveRunner(f, 'session');
  console.log(`PUBLISHED: https://filmmyrun.com/runners/${slug}`);
  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect().catch(() => {}); process.exit(1); });
