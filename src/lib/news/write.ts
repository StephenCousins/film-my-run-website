import { completeJson } from '@/lib/llm';
import { CHECK_MODEL, WRITE_MODEL } from './models';
import type { Bundle, Draft } from './types';

export const VOICE = `You are a reporter on the Film My Run news desk (filmmyrun.com), a British trail and ultra running site. Write in Stephen Cousins's style, third person, from the newsroom (never "I", never as if you were there):
- Short declarative sentences, about 16 words on average; the occasional longer one carries the detail.
- British English and British mild vocabulary. Dry, understated, never hyped.
- Specific numbers: finish times to the second where given, distances, climb in metres, positions, dates.
- Name people with their times and results. At least one concrete detail about the place or the course.
- No em dashes. No semicolons. None of: "journey", "dive in", "game-changer", "unpack", "leverage", "It's not just X, it's Y", stacked lists of three adjectives.
- Original wording throughout: report the facts in your own sentences, never a sentence lifted or lightly reworded from a source.
- Quote at most a few words directly from any source; write everything else in your own words.
- Match the tone to the story. A death or serious accident: plain and respectful, no dry humour, nothing beyond what has been reported about how it happened, and room for what the runner achieved and who they leave behind. Gossip or controversy: say what happened and what the person said, without sneering or sensationalising.`;

const DRAFT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['isNews', 'reason', 'title', 'excerpt', 'paragraphs', 'people'],
  properties: {
    isNews: { type: 'boolean' }, reason: { type: 'string' },
    title: { type: 'string' }, excerpt: { type: 'string' },
    paragraphs: { type: 'array', items: { type: 'string' } },
    people: { type: 'array', items: { type: 'string' } },
  },
};

function sourcesBlock(b: Bundle): string {
  // ponytail: writer and checker must slice sources to the same 12,000 chars, or
  // the checker can fail (or wrongly pass) facts the writer never actually saw.
  return b.items.filter((i) => i.text).map((i, n) => `SOURCE ${n + 1} (${i.source}, ${i.pubDate.toISOString().slice(0, 10)}, ${i.url}):\n${i.text!.slice(0, 12000)}`).join('\n\n');
}

export async function writeStory(b: Bundle, now: Date, call: typeof completeJson = completeJson, avoid: string[] = [], unsupported: string[] = []) {
  if (!b.items.some((i) => i.text)) return { draft: null, refusal: 'no full text', costUsd: 0 };
  const prompt = `${VOICE}

Today is ${now.toISOString().slice(0, 10)}. ${b.onDemand ? 'The editor has asked for this story: set isNews true and write it, whatever its date.' : 'First decide: is this genuinely running NEWS from the last 14 days (something that happened, not a preview, review, training piece or opinion)? If not, set isNews false, give the reason, and leave the other fields empty.'}

Also not for us: a story that accuses a named private individual (not a professional or elite athlete) of cheating when no race or governing body has acted on it. A disqualification or ban by a race, federation or the AIU is fine; say who took the action.

If it is: write one story about this event: ${b.headline}. (That label is our desk's, not a source's: take every name and its spelling from the sources.) Combine every source that reports it. Add nothing from your own knowledge, however well known (where a route runs, a runner's past results): only what the sources say. If a source is about a different race or incident, leave it out entirely: one event per story. A source named "Film My Run runner file" is our own background file on a runner: use it for facts about that runner (records, past results), not as a report of this event.
- When British athletes or UK races feature (a British record, a British medal, a UK race), say so early.
- title: specific, not clickbait, no colon-subtitle.
- excerpt: one sentence, at most 160 characters.
- paragraphs: 3 to 6 plain-text paragraphs. Lead with what happened. Only facts that appear in the sources.
- people: the full names of the runners this story is about (winners, record-breakers, the subject), spelt as in the sources. Not everyone mentioned: leave out also-rans, officials and race directors. Empty when it is about no particular runner.

${b.note ? `\nA note from the editor for this story: ${b.note}\n` : ''}${unsupported.length ? `\nA previous draft was held because the fact-checker could not find these in the sources. Leave each out, or state it exactly as a source does:\n${unsupported.map((u) => `- ${u}`).join('\n')}\n` : ''}${avoid.length ? `\nA previous draft was too close to a source's wording. None of these phrases may appear, even lightly reworded; say the same facts in new sentences:\n${avoid.map((a) => `- "${a}"`).join('\n')}\n` : ''}
${sourcesBlock(b)}`;
  const r = await call<{ isNews: boolean; reason: string; title: string; excerpt: string; paragraphs: string[]; people: string[] }>({ model: WRITE_MODEL, prompt, maxTokens: 3000, temperature: 0.6, schemaName: 'story', schema: DRAFT_SCHEMA });
  if (!r.data) return { draft: null, refusal: 'unreadable reply', costUsd: r.costUsd };
  if (r.data.isNews === false) return { draft: null, refusal: `not news: ${r.data.reason}`, costUsd: r.costUsd };
  const { title, excerpt, paragraphs } = r.data;
  const usable = r.data.isNews === true && typeof title === 'string' && typeof excerpt === 'string'
    && Array.isArray(paragraphs) && paragraphs.every((p) => typeof p === 'string');
  if (!usable) return { draft: null, refusal: 'unreadable reply', costUsd: r.costUsd };
  const people = Array.isArray(r.data.people) ? r.data.people.filter((p) => typeof p === 'string') : [];
  return { draft: { title, excerpt, paragraphs, people } as Draft, refusal: null, costUsd: r.costUsd };
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
  const u = r.data?.unsupported;
  const unsupported = Array.isArray(u) && u.every((x) => typeof x === 'string') ? u : ['checker reply unreadable'];
  return { ok: unsupported.length === 0, unsupported, costUsd: r.costUsd };
}

/** What an edit must put right. */
export interface Fix { problems?: string[]; phrases?: string[]; unsupported?: string[]; mark?: string[] }

/** Ends a story that keeps facts nobody could confirm (Stephen, 27 Sep 2026). */
export const UNVERIFIED_NOTE = '* Film My Run could not verify this information.';

/**
 * Put a draft right without rewriting it: Opus changes only what the checks
 * flagged (a rule broken, a phrase too close to a source, a fact the checker
 * could not find) and leaves the rest of the story as it is. Up to
 * NEWS_CONFIG.fixRounds of these before a story is not published; it replaced
 * holding stories for Stephen to review (27 Sep 2026).
 */
export async function editStory(d: Draft, b: Bundle, fix: Fix, call: typeof completeJson = completeJson) {
  const asks = [
    ...(fix.problems ?? []).map((p) => `- Fix: ${p} (3 to 6 paragraphs, no em dashes, no semicolons, a title and a one-sentence excerpt).`),
    ...(fix.phrases ?? []).map((p) => `- Too close to a source's wording; say it in new words: "${p}"`),
    ...(fix.unsupported ?? []).map((u) => `- Not found in any source; remove it, or state it exactly as a source does: ${u}`),
    ...(fix.mark ?? []).map((m) => `- Could not be verified; keep it only if the story needs it, with an asterisk (*) straight after it: ${m}`),
  ].join('\n');
  const prompt = `${VOICE}

You wrote this news story. Edit it so every point below is put right. Change nothing else: keep the structure, the facts that are fine and the voice. Only facts from the sources below.

${asks}

STORY (JSON):
${JSON.stringify(d)}

${sourcesBlock(b)}`;
  const r = await call<{ isNews: boolean; reason: string; title: string; excerpt: string; paragraphs: string[]; people: string[] }>({ model: WRITE_MODEL, prompt, maxTokens: 3000, temperature: 0.3, schemaName: 'story', schema: DRAFT_SCHEMA });
  const x = r.data;
  const ok = x && typeof x.title === 'string' && typeof x.excerpt === 'string' && Array.isArray(x.paragraphs) && x.paragraphs.every((p) => typeof p === 'string');
  if (!ok) return { draft: null, costUsd: r.costUsd };
  const paragraphs = x.paragraphs.filter((p) => p.trim() !== UNVERIFIED_NOTE);
  // Any asterisk left in the story gets the note as its last line.
  if (paragraphs.some((p) => p.includes('*'))) paragraphs.push(UNVERIFIED_NOTE);
  const people = Array.isArray(x.people) && x.people.length ? x.people : d.people;
  return { draft: { title: x.title, excerpt: x.excerpt, paragraphs, people } as Draft, costUsd: r.costUsd };
}
