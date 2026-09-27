// Collects everything on a runner into runners-work/<slug>.json for a session to write from.
//
// Run:   npm run runners:gather -- "Ann Trason" [--historic]
//        npm run runners:gather -- --utmb 2704.kilian.jornetburgada
//        npm run runners:gather -- --top 50        (the top 50 women and 50 men by UTMB index, one file each)
import { mkdir, writeFile } from 'node:fs/promises';
import { prisma } from '@/lib/db';
import { gatherRunner } from '@/lib/runners/gather';
import { topRunners } from '@/lib/runners/utmb';

const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

async function one(input: { name?: string; utmbUri?: string; era?: 'current' | 'historic' }) {
  const f = await gatherRunner(input);
  if (!f) { console.log(`NOT FOUND: ${input.name ?? input.utmbUri} (no UTMB entry, no Wikipedia article)`); return; }
  await writeFile(`runners-work/${f.slug}.json`, JSON.stringify(f, null, 2));
  console.log(`${f.slug}: ${f.texts.map((t) => t.source.name).join(', ')}; ${f.results.length} results; ${f.photoCandidates.length} photo candidates`);
}

(async () => {
  await mkdir('runners-work', { recursive: true });
  const top = flag('--top');
  if (top) {
    for (const sex of ['F', 'M'] as const) for (const r of await topRunners(sex, Number(top))) await one({ utmbUri: r.uri });
  } else if (flag('--utmb')) {
    await one({ utmbUri: flag('--utmb') });
  } else {
    const name = args.find((a) => !a.startsWith('--'));
    if (!name) throw new Error('Usage: npm run runners:gather -- "Name" [--historic] | --utmb <uri> | --top N');
    await one({ name, era: args.includes('--historic') ? 'historic' : 'current' });
  }
  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => { console.error(e); await prisma.$disconnect().catch(() => {}); process.exit(1); });
