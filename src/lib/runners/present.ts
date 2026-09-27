import { prisma } from '@/lib/db';
import { loadNameIndex, mentionedSlugs } from './names';
import type { RunnerPhoto } from './types';

export function personJsonLd(r: { name: string; slug: string; nationality: string | null; photos: RunnerPhoto[]; bioText: string; sameAs: string[] }) {
  const photo = r.photos.find((p) => p.kind === 'portrait') ?? r.photos[0];
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: r.name,
    url: `https://filmmyrun.com/runners/${r.slug}`,
    description: r.bioText.slice(0, 300),
    ...(r.nationality ? { nationality: r.nationality } : {}),
    ...(photo ? { image: photo.url } : {}),
    ...(r.sameAs.length ? { sameAs: r.sameAs } : {}),
  };
}

/**
 * Our published stories about a runner, newest first: exactly the stories whose
 * text links them (mentionedSlugs), so the two directions always agree.
 * ponytail: scans every published story per page view (hundreds of rows); add a
 * story_runners table if it passes a few thousand.
 */
export async function storiesAbout(slug: string) {
  const index = await loadNameIndex();
  const names = [...index.entries()].filter(([, s]) => s === slug).map(([n]) => n);
  if (!names.length) return [];
  const rows = await prisma.news_stories.findMany({
    where: { status: 'published', OR: names.map((n) => ({ content: { contains: n.split(' ').pop()! } })) },
    select: { slug: true, title: true, image_url: true, content: true, published_at: true, created_at: true },
    orderBy: { published_at: 'desc' },
  });
  return rows
    .filter((r) => mentionedSlugs(r.content, index).has(slug))
    .map((r) => ({ slug: r.slug, title: r.title, imageUrl: r.image_url, publishedAt: (r.published_at ?? r.created_at).toISOString() }));
}
