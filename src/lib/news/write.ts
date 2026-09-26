import { completeJson } from '@/lib/llm';
import { CHECK_MODEL, WRITE_MODEL } from './models';
import type { Bundle, Draft } from './types';

const VOICE = `You are a reporter on the Film My Run news desk (filmmyrun.com), a British trail and ultra running site. Write in Stephen Cousins's style, third person, from the newsroom (never "I", never as if you were there):
- Short declarative sentences, about 16 words on average; the occasional longer one carries the detail.
- British English and British mild vocabulary. Dry, understated, never hyped.
- Specific numbers: finish times to the second where given, distances, climb in metres, positions, dates.
- Name people with their times and results. At least one concrete detail about the place or the course.
- No em dashes. No semicolons. None of: "journey", "dive in", "game-changer", "unpack", "leverage", "It's not just X, it's Y", stacked lists of three adjectives.
- Original wording throughout: report the facts in your own sentences, never a sentence lifted or lightly reworded from a source.`;

const DRAFT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['isNews', 'reason', 'title', 'excerpt', 'paragraphs'],
  properties: {
    isNews: { type: 'boolean' }, reason: { type: 'string' },
    title: { type: 'string' }, excerpt: { type: 'string' },
    paragraphs: { type: 'array', items: { type: 'string' } },
  },
};

function sourcesBlock(b: Bundle): string {
  return b.items.filter((i) => i.text).map((i, n) => `SOURCE ${n + 1} (${i.source}, ${i.pubDate.toISOString().slice(0, 10)}, ${i.url}):\n${i.text!.slice(0, 12000)}`).join('\n\n');
}

export async function writeStory(b: Bundle, now: Date, call: typeof completeJson = completeJson) {
  if (!b.items.some((i) => i.text)) return { draft: null, refusal: 'no full text', costUsd: 0 };
  const prompt = `${VOICE}

Today is ${now.toISOString().slice(0, 10)}. First decide: is this genuinely running NEWS from the last 14 days (something that happened, not a preview, review, training piece or opinion)? If not, set isNews false, give the reason, and leave the other fields empty.

If it is: write one story combining every source below.
- title: specific, not clickbait, no colon-subtitle.
- excerpt: one sentence, at most 160 characters.
- paragraphs: 3 to 6 plain-text paragraphs. Lead with what happened. Only facts that appear in the sources.

${sourcesBlock(b)}`;
  const r = await call<{ isNews: boolean; reason: string; title: string; excerpt: string; paragraphs: string[] }>({ model: WRITE_MODEL, prompt, maxTokens: 3000, temperature: 0.6, schemaName: 'story', schema: DRAFT_SCHEMA });
  if (!r.data) return { draft: null, refusal: 'unreadable reply', costUsd: r.costUsd };
  if (!r.data.isNews) return { draft: null, refusal: `not news: ${r.data.reason}`, costUsd: r.costUsd };
  const { title, excerpt, paragraphs } = r.data;
  return { draft: { title, excerpt, paragraphs } as Draft, refusal: null, costUsd: r.costUsd };
}

const CHECK_SCHEMA = { type: 'object', additionalProperties: false, required: ['unsupported'], properties: { unsupported: { type: 'array', items: { type: 'string' } } } };

export async function checkFacts(d: Draft, b: Bundle, call: typeof completeJson = completeJson) {
  const prompt = `Fact-check this news story against its sources. List every name, time, placing, record, distance, date or number in the STORY that does not appear in (or follow directly from) the SOURCES. Return an empty list when everything is supported. Be strict: a wrong second or a misspelt name counts.

STORY:
${d.title}
${d.excerpt}
${d.paragraphs.join('\n\n')}

${sourcesBlock(b)}`;
  const r = await call<{ unsupported: string[] }>({ model: CHECK_MODEL, prompt, maxTokens: 1500, schemaName: 'check', schema: CHECK_SCHEMA });
  const unsupported = r.data?.unsupported ?? ['checker reply unreadable'];
  return { ok: unsupported.length === 0, unsupported, costUsd: r.costUsd };
}
