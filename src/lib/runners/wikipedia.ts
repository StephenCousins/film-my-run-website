import type { RunnerPhoto } from './types';
import { httpGet, parseJson, type Getter } from './utmb';

const WIKI = 'https://en.wikipedia.org';
const COMMONS = 'https://commons.wikimedia.org';

const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** A Commons file's author and licence, or null when either can't be read. */
export async function commonsLicence(fileTitle: string, get: Getter = httpGet): Promise<{ credit: string; licence: string | null } | null> {
  const body = await get(`${COMMONS}/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=extmetadata&format=json`);
  if (!body) return null;
  const json = parseJson(body) as { query?: { pages?: Record<string, unknown> } } | null;
  const pages = json?.query?.pages ?? {};
  const meta = (Object.values(pages)[0] as { imageinfo?: { extmetadata?: Record<string, { value: string }> }[] })?.imageinfo?.[0]?.extmetadata;
  const artist = meta?.Artist?.value ? stripTags(meta.Artist.value) : '';
  if (!artist) return null;
  return { credit: `Photo: ${artist} / Wikimedia Commons`, licence: meta?.LicenseShortName?.value ?? null };
}

/**
 * The English Wikipedia article on a runner: plain text (to rewrite, never copy:
 * CC BY-SA), its link, and its lead photo when Commons says who took it.
 * A disambiguation page or no article at all is null.
 */
export async function wikipediaArticle(name: string, get: Getter = httpGet) {
  const title = encodeURIComponent(name.replace(/ /g, '_'));
  const sumBody = await get(`${WIKI}/api/rest_v1/page/summary/${title}?redirect=true`);
  if (!sumBody) return null;
  const sum = parseJson(sumBody) as {
    type?: string;
    title?: string;
    content_urls?: { desktop?: { page?: string } };
    originalimage?: { source?: string };
  } | null;
  if (sum?.type !== 'standard') return null;
  const textBody = await get(`${WIKI}/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=${title}`);
  const textJson = textBody ? (parseJson(textBody) as { query?: { pages?: Record<string, unknown> } } | null) : null;
  const text = textJson ? ((Object.values(textJson?.query?.pages ?? {})[0] as { extract?: string })?.extract ?? '') : '';
  if (!text) return null;
  let image: RunnerPhoto | null = null;
  const src: string | undefined = sum.originalimage?.source;
  if (src) {
    const url = new URL(src);
    const filename = decodeURIComponent(url.pathname.split('/').pop()!);
    const file = `File:${filename}`;
    const lic = await commonsLicence(file, get);
    if (lic) image = { kind: 'portrait', url: `${url.origin}${url.pathname}`, credit: lic.credit, licence: lic.licence, source_url: `${COMMONS}/wiki/${file.replace(/ /g, '_')}` };
  }
  return { title: sum.title as string, url: sum.content_urls?.desktop?.page as string, text, image };
}
