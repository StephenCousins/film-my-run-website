// The words on a social post: the card's headline (and which of its words go orange) and the
// Facebook and Instagram captions. Claude writes them; code adds the link, the photo credit and
// the hashtags in a fixed order, so the credit can never go missing.
import { completeJsonClaudeFirst, type ClaudeRunner } from '@/lib/llm';
import { WRITE_MODEL } from '@/lib/news/models';
import type { SocialTag } from './tag';

export interface CopyStory {
  slug: string;
  title: string;
  excerpt: string;
  /** The story's HTML (news_stories.content) or plain text. */
  content: string;
  photoCredit: string | null;
  topic?: string | null;
  tag: SocialTag;
}

export interface SocialCopy {
  headline: string;
  /** Headline words to show in the brand colour. */
  highlight: string[];
  captionFacebook: string;
  captionInstagram: string;
  hashtags: string[];
  /** OpenRouter spend (the news ceiling); Claude key spend is in claudeCreditSpentThisRun(). */
  costUsd: number;
}

interface CopyReply {
  headline: string;
  highlight: string[];
  caption: string;
  hashtags: string[];
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'highlight', 'caption', 'hashtags'],
  properties: {
    headline: { type: 'string', description: 'Card headline, at most 60 characters' },
    highlight: { type: 'array', items: { type: 'string' }, description: '1 to 3 words copied exactly from the headline to show in colour' },
    caption: { type: 'string', description: '1 to 3 short punchy sentences, at most 220 characters, hook first; no link, no hashtags, no photo credit' },
    hashtags: { type: 'array', items: { type: 'string' }, description: '3 to 6 hashtags' },
  },
} as const;

export const HEADLINE_MAX = 60;
/** What the caption body (before the link line) should be at most; asked for in the prompt. */
export const CAPTION_TARGET = 220;
/** The guard: a body longer than this is cut back to its last full sentence that fits. */
export const CAPTION_MAX = 300;

/**
 * The caption body, kept short (Stephen, 26 Nov 2026: the sample captions were too long).
 * Over CAPTION_MAX: cut at the end of the last full sentence that fits; if not even the first
 * sentence fits, cut at the last whole word and end with an ellipsis.
 */
export function trimCaption(body: string, max = CAPTION_MAX): string {
  const text = body.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const sentences = text.match(/[^.!?]+[.!?]+["'”’)]*(\s|$)/g) ?? [];
  let out = '';
  for (const sentence of sentences) {
    if ((out + sentence).trim().length > max) break;
    out += sentence;
  }
  if (out.trim()) return out.trim();
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '').replace(/[,;:]$/, '')}…`;
}

const plain = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();

/** Stephen never uses em dashes; a spaced en dash reads the same way. */
const noDashes = (s: string) => s.replace(/\s*—\s*/g, ', ').replace(/\s+–\s+/g, ', ').trim();

const wordKey = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** The photo credit line for a caption: "📷 Photo: Jane Smith / iRunFar". */
export function creditCaptionLine(photoCredit: string | null): string {
  const c = (photoCredit ?? '').trim();
  if (!c) return '';
  return `📷 ${/^photo:/i.test(c) ? c : `Photo: ${c}`}`;
}

function defaultTags(topic?: string | null): string[] {
  const topical = topic === 'trail_ultra' ? ['#trailrunning', '#ultrarunning'] : topic === 'track' ? ['#athletics', '#trackandfield'] : ['#running', '#marathon'];
  return [...topical, '#runningnews', '#filmmyrun'];
}

/** 3 to 6 clean, distinct hashtags: letters, digits and underscores only, topped up with defaults. */
export function cleanHashtags(tags: string[], topic?: string | null): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of [...tags, ...defaultTags(topic)]) {
    const body = t.trim().replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '');
    if (!body || seen.has(body.toLowerCase())) continue;
    seen.add(body.toLowerCase());
    out.push(`#${body}`);
    if (out.length >= 6) break;
  }
  return out;
}

/** Keep only highlight words that really are in the headline (at most 3), as the headline spells them. */
export function cleanHighlight(headline: string, highlight: string[]): string[] {
  const wanted = new Set(highlight.flatMap((h) => h.split(/\s+/)).map(wordKey).filter(Boolean));
  const out: string[] = [];
  for (const raw of headline.split(/\s+/)) {
    const w = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (wanted.has(wordKey(w)) && !out.some((o) => wordKey(o) === wordKey(w))) out.push(w);
  }
  return out.slice(0, 3);
}

/**
 * The two captions from Claude's sentences: Facebook gets the link (clickable there);
 * Instagram can't link from a caption, so it says "link in bio". Both carry the photo credit
 * and the hashtags.
 */
export function buildCaptions(caption: string, slug: string, photoCredit: string | null, hashtags: string[]) {
  const credit = creditCaptionLine(photoCredit);
  const tags = hashtags.join(' ');
  const join = (link: string) => [caption.trim(), link, credit, tags].filter(Boolean).join('\n\n');
  return {
    facebook: join(`Full story: https://filmmyrun.com/news/${slug}`),
    instagram: join('Full story: link in bio'),
  };
}

function prompt(s: CopyStory): string {
  return `Write the words for a Facebook and Instagram post about this running news story from Film My Run (filmmyrun.com).

1. "headline": the big text on the image card, at most ${HEADLINE_MAX} characters. Punchy and specific: names, race, the result or the news. It may differ from the article's title. No clickbait, no questions, no exclamation marks, no emoji, no em dashes. Every fact must come from the story below.
2. "highlight": 1 to 3 words copied exactly from your headline that carry the news (a name, a time, "record", the race), to be shown in colour.
3. "caption": 1 to 3 short, punchy sentences, ${CAPTION_TARGET} characters at most in total. Hook first: open with the single most striking fact (who, what, the number). Then at most one or two sentences of context. Plain, factual, British English, like a runner telling other runners. Facts only from the story; no hype words (epic, incredible, insane), no em dashes. Do NOT include a link, hashtags, emoji or the photo credit: they are added after.
4. "hashtags": 3 to 6 relevant hashtags (the race, the discipline, e.g. #UTMB #trailrunning). No spaces inside a tag.

The card's tag is ${s.tag}.

Title: ${s.title}
Excerpt: ${s.excerpt}
Story:
${plain(s.content).slice(0, 6000)}`;
}

/**
 * Claude writes the copy: the API key on Opus 5.5 first, then Claude Code, then OpenRouter
 * (completeJsonClaudeFirst, as the news group does). Throws when every route fails or the reply
 * has no headline or caption; socialPostForStory records that as a failed post.
 */
export async function writeSocialCopy(s: CopyStory, run?: ClaudeRunner): Promise<SocialCopy> {
  const r = await completeJsonClaudeFirst<CopyReply>(
    {
      label: 'social',
      claude: 'opus',
      model: WRITE_MODEL,
      system: 'You write short, factual social media posts for a running news site. Follow the instructions exactly.',
      prompt: prompt(s),
      maxTokens: 800,
      schemaName: 'social_copy',
      schema: SCHEMA,
    },
    run,
  );
  const d = r.data;
  if (!d || typeof d.headline !== 'string' || typeof d.caption !== 'string' || !d.headline.trim() || !d.caption.trim()) {
    throw new Error('social copy: the reply had no headline or caption');
  }
  let headline = noDashes(d.headline).replace(/\s+/g, ' ');
  // Over the limit: cut at a word, never mid-word. The card shrinks the type for long ones anyway.
  if (headline.length > HEADLINE_MAX + 15) headline = headline.slice(0, HEADLINE_MAX + 15).replace(/\s+\S*$/, '');
  const hashtags = cleanHashtags(Array.isArray(d.hashtags) ? d.hashtags : [], s.topic);
  const captions = buildCaptions(trimCaption(noDashes(d.caption)), s.slug, s.photoCredit, hashtags);
  return {
    headline,
    highlight: cleanHighlight(headline, Array.isArray(d.highlight) ? d.highlight : []),
    captionFacebook: captions.facebook,
    captionInstagram: captions.instagram,
    hashtags,
    costUsd: r.costUsd,
  };
}
