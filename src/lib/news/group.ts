import { completeJson } from '@/lib/llm';
import { GROUP_MODEL } from './models';
import type { Bundle, Candidate, Verdict } from './types';

export function bundleImportance(b: Bundle): number {
  const top = Math.max(0, ...b.verdicts.map((v) => v.importance));
  const uk = b.verdicts.some((v) => v.isUk) ? 1 : 0;
  return Math.min(10, top + uk);
}

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['groups'],
  properties: { groups: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['key', 'headline', 'articleIds', 'alreadyCovered'],
    properties: { key: { type: 'string' }, headline: { type: 'string' }, articleIds: { type: 'array', items: { type: 'integer' } }, alreadyCovered: { type: 'boolean' } },
  } } },
};

export async function groupItems(items: { c: Candidate; v: Verdict }[], recentHeadlines: string[], call: typeof completeJson = completeJson) {
  if (items.length === 0) return { bundles: [], costUsd: 0 };
  const list = items.map(({ c }) => `${c.articleId} | ${c.source} | ${c.pubDate.toISOString().slice(0, 10)} | ${c.title}`).join('\n');
  const prompt = `Group these running news items by the single event they report (the same race result, record or announcement). One group per event; an item in exactly one group.
"key": a short stable slug for the event, e.g. "utmb-2026-womens-result".
"alreadyCovered": true only when one of the stories we have already published (below) reports this same development. A result after we published a preview is NOT already covered.

Items (id | source | date | title):
${list}

Already published in the last 14 days:
${recentHeadlines.map((h) => `- ${h}`).join('\n') || '- none'}`;
  const r = await call<{ groups: { key: string; headline: string; articleIds: number[]; alreadyCovered: boolean }[] }>({ model: GROUP_MODEL, prompt, maxTokens: 4000, schemaName: 'groups', schema: SCHEMA });
  const byId = new Map(items.map((i) => [i.c.articleId, i]));
  const used = new Set<number>();
  const bundles: Bundle[] = (r.data?.groups ?? []).flatMap((g) => {
    const members = g.articleIds
      .filter((id) => !used.has(id))
      .map((id) => byId.get(id))
      .filter((m): m is { c: Candidate; v: Verdict } => !!m);
    members.forEach((m) => used.add(m.c.articleId));
    return members.length ? [{ key: g.key, headline: g.headline, items: members.map((m) => m.c), verdicts: members.map((m) => m.v), alreadyCovered: g.alreadyCovered }] : [];
  });
  return { bundles, costUsd: r.costUsd };
}
