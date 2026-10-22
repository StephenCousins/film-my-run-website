// Builds the site assistant's knowledge pack, content/assistant/pack.md, from content/assistant/facts.md and the
// live site (every URL in the sitemap). Read the output: it is exactly what the assistant knows.
//
// Run:   npm run assistant:pack            then commit content/assistant/pack.md and push
// Needs: YOUTUBE_API_KEY in .env (for the most-watched list; costs ~101 of the 10,000 daily quota units)
import { readFile, writeFile } from 'node:fs/promises';
import { pageSummary } from '@/lib/assistant/html';

const SITE = 'https://filmmyrun.com';
const CHANNEL = 'UCjphxoB7x0A_VhB1CUz3AwA'; // the main Film My Run channel (docs/youtube-stats.md)
// Pages the assistant gets in full (trimmed); everything else is one line of title + description.
const FULL = /^\/(|about|services(\/.*)?|club|training|tools(\/[^/]+)?|games\/fartlex|shop(\/.*)?|discounts|contact|live|races|films|privacy)$/;
const FULL_CHARS = 4000;

async function fetchText(url: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'FilmMyRun-assistant-pack' } });
    if (res.ok) return res.text();
    if (attempt === 3) throw new Error(`${res.status} ${url}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

// [path, heading, how much of each page's description to keep]
const SECTIONS: [RegExp, string, number][] = [
  [/^\/blog\//, "Stephen's blog (race reports and stories)", 300],
  [/^\/films\//, "Stephen's films", 300],
  // Headlines say enough, and every token here is paid for on every message.
  [/^\/news\//, 'Recent news stories on the site', 0],
  [/^\/runners\//, 'Runner profiles (elite and notable runners, not Stephen)', 0],
];

/** The channel's 25 most-viewed videos with real counts, so the assistant never quotes a page's marketing figures. */
async function mostWatched(): Promise<string> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY is not set (run with .env, see the header)');
  const api = (path: string) => fetchText(`https://www.googleapis.com/youtube/v3/${path}&key=${key}`).then(JSON.parse);
  const search = await api(`search?part=id&channelId=${CHANNEL}&order=viewCount&type=video&maxResults=25`);
  const ids = search.items.map((i: { id: { videoId: string } }) => i.id.videoId).join(',');
  const [videos, channel] = await Promise.all([
    api(`videos?part=snippet,statistics&id=${ids}`),
    api(`channels?part=statistics&id=${CHANNEL}`),
  ]);
  type Video = { id: string; snippet: { title: string; publishedAt: string }; statistics: { viewCount: string } };
  const lines = (videos.items as Video[])
    .sort((a, b) => Number(b.statistics.viewCount) - Number(a.statistics.viewCount))
    .map((v, i) => `${i + 1}. [${v.snippet.title}](https://www.youtube.com/watch?v=${v.id}): ${Number(v.statistics.viewCount).toLocaleString('en-GB')} views, published ${v.snippet.publishedAt.slice(0, 10)}`);
  const c = channel.items[0].statistics;
  return [
    `# Film My Run YouTube channel: real figures on ${new Date().toISOString().slice(0, 10)}`,
    `https://www.youtube.com/@filmmyrun has ${Number(c.subscriberCount).toLocaleString('en-GB')} subscribers, ${Number(c.videoCount).toLocaleString('en-GB')} videos and ${Number(c.viewCount).toLocaleString('en-GB')} views in total. These are the only reliable view counts: use them for any question about views or the most-watched videos, not figures quoted on other pages.`,
    'Most-viewed videos:',
    ...lines,
  ].join('\n');
}

(async () => {
  const youtube = await mostWatched();
  const sitemap = await fetchText(`${SITE}/sitemap.xml`);
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/\/$/, ''));
  console.log(`${paths.length} URLs`);

  let failed = 0;
  const pages = await mapLimit(paths, 6, async (path) => {
    try {
      return { path, ...pageSummary(await fetchText(SITE + path)) };
    } catch (e) {
      failed++;
      console.log(`skipped ${path}: ${(e as Error).message}`);
      return null;
    }
  });

  const full: string[] = [];
  const lists = new Map<string, string[]>(SECTIONS.map(([, h]) => [h, []]));
  for (const p of pages) {
    if (!p) continue;
    if (FULL.test(p.path || '/')) {
      full.push(`### ${p.title}\nURL: ${SITE}${p.path || '/'}\n${p.text.slice(0, FULL_CHARS)}`);
      continue;
    }
    const section = SECTIONS.find(([re]) => re.test(p.path));
    if (!section) continue;
    const description = p.description.slice(0, section[2]);
    lists.get(section[1])!.push(`- [${p.title}](${SITE}${p.path})${description ? `: ${description}` : ''}`);
  }

  const facts = await readFile('content/assistant/facts.md', 'utf8');
  const pack = [
    `<!-- Generated by npm run assistant:pack on ${new Date().toISOString().slice(0, 10)}. Edit facts.md, not this file. -->`,
    facts.trim(),
    youtube,
    '# Pages on filmmyrun.com',
    ...full,
    ...[...lists].map(([h, lines]) => `# ${h}\n${lines.join('\n')}`),
  ].join('\n\n');

  await writeFile('content/assistant/pack.md', pack + '\n');
  console.log(`content/assistant/pack.md: ${pack.length} chars (~${Math.round(pack.length / 4 / 1000)}k tokens), ${failed} pages skipped`);
})();
