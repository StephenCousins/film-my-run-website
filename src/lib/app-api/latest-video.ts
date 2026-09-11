import { FILM_MY_RUN_CHANNEL_ID } from '@/lib/youtube-stats';

/**
 * The newest upload on the Film My Run channel, from YouTube's public Atom
 * feed. No API key, no quota. Cached by Next's fetch for an hour.
 */
export interface LatestVideo {
  id: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  url: string;
}

export function feedUrl(channelId = FILM_MY_RUN_CHANNEL_ID): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}[^>]*>([^<]*)</${name}>`));
  return m ? decodeEntities(m[1].trim()) : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/** Parses the first <entry> of a channel feed. Null if there is none. */
export function parseLatestVideo(xml: string): LatestVideo | null {
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
  if (!entry) return null;
  const id = tag(entry, 'yt:videoId');
  const title = tag(entry, 'title');
  const publishedAt = tag(entry, 'published');
  if (!id || !title || !publishedAt) return null;
  return {
    id,
    title,
    publishedAt,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${id}`,
  };
}

export async function fetchLatestVideo(
  channelId = FILM_MY_RUN_CHANNEL_ID
): Promise<LatestVideo | null> {
  const response = await fetch(feedUrl(channelId), { next: { revalidate: 3600 } });
  if (!response.ok) return null;
  return parseLatestVideo(await response.text());
}
