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

export async function sortItem(c: Candidate, call: typeof completeJson = completeJson) {
  const prompt = `Classify this running article for a news desk. It must be NEWS to publish: something that has happened (race results, records, wins, DNFs, selections, announcements, course or rule changes, injuries, retirements, doping cases). NOT news: race previews or "who to watch", a runner's own race report, gear or shoe reviews, training advice, opinion or columns, podcasts or videos, sponsored posts.

Give "confidence" as the probability (0-1) that your "type" is right.
"importance" 1-10 for a trail and ultra running site: trail and ultra first (a UTMB or Western States win is 9-10), big road and track moments next (a marathon or track world record is 7-8), everyday results lower. Add 1 when British athletes or UK races are central, capped at 10.
"isUk": British athletes or UK races are central.

Source: ${c.source}
Title: ${c.title}
Published: ${c.pubDate.toISOString().slice(0, 10)}
Summary: ${c.summary.slice(0, 1200)}
Opening: ${(c.text ?? '').slice(0, 1500)}`;
  const r = await call<Verdict>({ model: SORT_MODEL, prompt, maxTokens: 300, schemaName: 'verdict', schema: SCHEMA });
  const d = r.data;
  const valid = d && typeof d.confidence === 'number' && d.confidence >= 0 && d.confidence <= 1 && typeof d.importance === 'number';
  return { verdict: valid ? { ...d, importance: Math.max(1, Math.min(10, Math.round(d.importance))) } : null, costUsd: r.costUsd };
}
