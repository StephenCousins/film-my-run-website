import { completeJson } from '@/lib/llm';
import { NEWS_CONFIG } from './config';
import { SORT_MODEL } from './models';
import type { Candidate, Verdict } from './types';

export function passesSort(v: Verdict | null): boolean {
  return !!v && v.type === 'news' && v.isRunning && v.confidence >= NEWS_CONFIG.newsThreshold;
}

export function isBorderline(v: Verdict | null): boolean {
  return !!v && v.type === 'news' && v.isRunning && v.confidence >= NEWS_CONFIG.borderlineFrom && v.confidence < NEWS_CONFIG.newsThreshold;
}

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['type', 'confidence', 'isRunning', 'topic', 'isUk', 'importance'],
  properties: {
    type: { type: 'string', enum: ['news', 'preview', 'personal_race_report', 'review', 'training', 'opinion', 'media', 'sponsored', 'other'] },
    confidence: { type: 'number' }, isRunning: { type: 'boolean' },
    topic: { type: 'string', enum: ['trail_ultra', 'road', 'track'] }, isUk: { type: 'boolean' },
    importance: { type: 'integer' },
  },
};

const MEDIA_URL = /\/(videos?|av|podcasts?|watch|live)(\/|$)/i;

export async function sortItem(c: Candidate, call: typeof completeJson = completeJson) {
  // Video, audio and live pages carry no text to write from, whatever the event: settle them without a call.
  if (MEDIA_URL.test(c.url)) return { verdict: { type: 'media', confidence: 1, isRunning: true, topic: 'road', isUk: false, importance: 1 } as Verdict, costUsd: 0 };
  const prompt = `Classify this running article for a news desk. It must be NEWS to publish: something that has happened (race results, records, wins, DNFs, selections, announcements, course or rule changes, injuries, retirements, doping cases). NOT news: race previews or "who to watch", a runner's own race report, gear or shoe reviews, training advice, opinion or columns, podcasts or videos, sponsored posts.
Also NOT news (type "other", "opinion" or "media"): interviews and profiles, "takeaways" or analysis pieces, weekly recap columns, features about a result already reported, entries opening, "X% sold" or other sales updates, event promotion and countdowns, video clips and live-blog or live-tracking pages. A race selling out completely, a course change, a cancellation and a team selection ARE news.
"isRunning" is false for field events (jumps, throws, combined events) and for non-running sports; sprints, hurdles and relays are running.

Give "confidence" as the probability (0-1) that your "type" is right.
"importance" 1-10 for a trail and ultra running site: trail and ultra first (a UTMB or Western States win is 9-10), big road and track moments next (a marathon or track world record is 7-8), everyday results lower. Add 1 when British athletes or UK races are central, capped at 10.
"isUk": British athletes or UK races are central.

Source: ${c.source}
Title: ${c.title}
Published: ${c.pubDate.toISOString().slice(0, 10)}
Summary: ${c.summary.slice(0, 1200)}
Opening: ${(c.text ?? '').slice(0, 1500)}`;
  // Gemini 3.7 Flash always reasons first (it can't be switched off) and the reasoning
  // counts against max_tokens: at 300 it used ~190 and cut the JSON short. Only used tokens are billed.
  const r = await call<Verdict>({ model: SORT_MODEL, prompt, maxTokens: 2000, schemaName: 'verdict', schema: SCHEMA });
  const d = r.data;
  const valid = d && typeof d.confidence === 'number' && d.confidence >= 0 && d.confidence <= 1 && typeof d.importance === 'number';
  return { verdict: valid ? { ...d, importance: Math.max(1, Math.min(10, Math.round(d.importance))) } : null, costUsd: r.costUsd };
}
