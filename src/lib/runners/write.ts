import { completeJson } from '@/lib/llm';
import { CHECK_MODEL, WRITE_MODEL } from '@/lib/news/models';
import { VOICE } from '@/lib/news/write';
import type { RunnerFile } from './types';

const BIO_SCHEMA = { type: 'object', additionalProperties: false, required: ['paragraphs'], properties: { paragraphs: { type: 'array', items: { type: 'string' } } } };
const CHECK_SCHEMA = { type: 'object', additionalProperties: false, required: ['unsupported'], properties: { unsupported: { type: 'array', items: { type: 'string' } } } };

const RULES = `A short profile of a runner for the Film My Run runners pages: 3 to 5 plain-text paragraphs.
- Who they are and what they run, then their biggest results with times and places, then what they are doing now (or, for a runner from the past, what they are remembered for).
- Only facts in the sources below. Nothing from your own knowledge, however well known.
- Living people: nothing about health, family or private life beyond what the runner has made public. Doping only where an official body (AIU, USADA, UKAD, WADA, a national federation) has ruled; say who ruled and what. A death only as a source reports it.
- No title, no headings, no lists: paragraphs only.`;

const sources = (f: RunnerFile) => f.texts.map((t, n) => `SOURCE ${n + 1} (${t.source.name}, ${t.source.url}):\n${t.text.slice(0, 12000)}`).join('\n\n');

type Call = typeof completeJson;
const paragraphs = (x: unknown) => (Array.isArray((x as { paragraphs?: unknown })?.paragraphs) && (x as { paragraphs: unknown[] }).paragraphs.every((p) => typeof p === 'string') ? (x as { paragraphs: string[] }).paragraphs : null);

export async function writeProfile(f: RunnerFile, call: Call = completeJson) {
  const r = await call<{ paragraphs: string[] }>({ model: WRITE_MODEL, prompt: `${VOICE}\n\n${RULES}\n\nThe runner: ${f.name}.\n\n${sources(f)}`, maxTokens: 2000, temperature: 0.6, schemaName: 'profile', schema: BIO_SCHEMA });
  return { bio: paragraphs(r.data), costUsd: r.costUsd };
}

export async function checkProfile(f: RunnerFile, bio: string[], call: Call = completeJson) {
  const r = await call<{ unsupported: string[] }>({ model: CHECK_MODEL, prompt: `Fact-check this runner profile against its sources. List every name, time, placing, record, distance, date or number in the PROFILE that does not appear in (or follow directly from) the SOURCES. Return an empty list when everything is supported. Be strict.\n\nPROFILE:\n${bio.join('\n\n')}\n\n${sources(f)}`, maxTokens: 1500, schemaName: 'check', schema: CHECK_SCHEMA });
  const u = r.data?.unsupported;
  return { unsupported: Array.isArray(u) && u.every((x) => typeof x === 'string') ? u : ['checker reply unreadable'], costUsd: r.costUsd };
}

export async function editProfile(f: RunnerFile, bio: string[], fix: { unsupported?: string[]; phrases?: string[]; problems?: string[]; mark?: string[] }, call: Call = completeJson) {
  const asks = [
    ...(fix.problems ?? []).map((p) => `- Fix: ${p} (3 to 5 paragraphs, no em dashes, no semicolons).`),
    ...(fix.phrases ?? []).map((p) => `- Too close to a source's wording; say it in new words: "${p}"`),
    ...(fix.unsupported ?? []).map((u) => `- Not found in any source; remove it, or state it exactly as a source does: ${u}`),
    ...(fix.mark ?? []).map((m) => `- Could not be verified; keep it only if the profile needs it, with an asterisk (*) straight after it: ${m}`),
  ].join('\n');
  const r = await call<{ paragraphs: string[] }>({ model: WRITE_MODEL, prompt: `${VOICE}\n\n${RULES}\n\nYou wrote this profile. Put right every point below and change nothing else.\n${asks}\n\nPROFILE (JSON):\n${JSON.stringify(bio)}\n\n${sources(f)}`, maxTokens: 2000, temperature: 0.3, schemaName: 'profile', schema: BIO_SCHEMA });
  return { bio: paragraphs(r.data), costUsd: r.costUsd };
}

/** The monthly refresh: revises our existing profile instead of starting over. The previous profile is also one of `f.texts`. */
export async function reviseProfile(f: RunnerFile, previous: string[], call: Call = completeJson) {
  const r = await call<{ paragraphs: string[] }>({ model: WRITE_MODEL, prompt: `${VOICE}\n\n${RULES}\n\nThe runner: ${f.name}.\n\nThis is our current profile of them. Revise it rather than starting over: keep what is still true, add their new results and any news in the sources below, and bring "what they are doing now" up to date. Still 3 to 5 paragraphs.\n\nCURRENT PROFILE (JSON):\n${JSON.stringify(previous)}\n\n${sources(f)}`, maxTokens: 2000, temperature: 0.4, schemaName: 'profile', schema: BIO_SCHEMA });
  return { bio: paragraphs(r.data), costUsd: r.costUsd };
}
