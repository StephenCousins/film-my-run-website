import { completeJson } from '@/lib/llm';
import { NEWS_CONFIG } from './config';
import { decide } from '@/lib/jev';
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

/**
 * A round-up ("The RunUltra Update: ...", "Weekend Ultra News 7 September"): several events in one
 * piece. One item = one story, and the writer mixed four into one (Stephen, 2 Oct 2026), so these
 * never lead a story. They still back a single-event story when Stephen asks for one by hand.
 */
export function isRoundUp(title: string): boolean {
  return /\bupdate\s*[:;]|round-?up|\bweekly\b|\bweek(end)?(['’]s)?\b.*\bnews\b|\bweek in\b/i.test(title);
}
const ROUND_UP: Verdict = { type: 'opinion', confidence: 1, isRunning: true, topic: 'trail_ultra', isUk: false, importance: 1 };

export async function sortItem(c: Candidate, call: typeof completeJson = completeJson) {
  // Video, audio and live pages carry no text to write from, whatever the event: settle them without a call.
  if (isRoundUp(c.title)) return { verdict: ROUND_UP, costUsd: 0 };
  if (MEDIA_URL.test(c.url)) return { verdict: { type: 'media', confidence: 1, isRunning: true, topic: 'road', isUk: false, importance: 1 } as Verdict, costUsd: 0 };
  const prompt = `Classify this running article for a news desk. It must be NEWS to publish: something that has happened (race results, records, wins, DNFs, selections, announcements, course or rule changes, injuries, retirements, doping cases). NOT news: race previews or "who to watch", a runner's own race report, gear or shoe reviews, training advice, opinion or columns, podcasts or videos, sponsored posts.
Also NOT news (type "other", "opinion" or "media"): interviews and profiles, "takeaways" or analysis pieces, weekly recap columns, features about a result already reported, entries opening, "X% sold" or other sales updates, event promotion and countdowns, video clips and live-blog or live-tracking pages. A race selling out completely, a course change, a cancellation and a team selection ARE news.
"isRunning" is false for field events (jumps, throws, combined events) and for non-running sports; sprints, hurdles and relays are running.

Give "confidence" as the probability (0-1) that your "type" is right.
"importance" 1-10 for a UK running site read by trail, ultra and road runners alike. Use the whole scale:
10: the biggest days of the year: UTMB or Western States won, an ultra world record, a British win at either.
8-9: world championship results in ultra, trail or mountain running; a course record at a major ultra; a record on a classic round or long trail (Bob Graham, Paddy Buckley, Ramsay, Pennine Way, a notable FKT); a road or track world record; a Majors marathon win.
8-9 as well: the death of a known runner, and the stories the running world is talking about (a controversy, a big name's surprising move); 9 when it is one of the sport's biggest names. Also 8-9: doping bans and results stripped (a provisional suspension or whereabouts case before any ban is 6-7, 7-8 for one of the sport's biggest names), cheating caught and punished by a race, race disasters (runners lost in the mountains, a race stopped by weather, a death during a race), results overturned or records voided, sporting firsts (first woman to win outright, first to complete a route).
7-8: changes that affect thousands of ordinary runners: qualifying times, cut-offs, entry rules or ballots for the Majors, UTMB or other races thousands enter (a Boston qualifying cut-off, the London ballot). Also 7-8: governing-body rows (UTMB lottery or Index, World Athletics rules, prize money), a race or series sold, axed or collapsing, a sponsor walking away, a legend retiring or coming back.
6-7 as well: trails or races losing access (closures, permits pulled), viral human-interest (the oldest finisher, a record in fancy dress, a run across a continent).
5: celebrities running a race.
6-7: notable results at well-known races, big-name injuries or retirements, rule changes that affect many runners.
4-5: results at smaller races, national-level news.
1-3: local news, minor announcements, entries and logistics.
Add 1 when British athletes or UK races are central, capped at 10.
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

/**
 * Jev scores the size of the event, not this site's readers: against SORT_MODEL on 118 news stories
 * it ran ~3 high on track and ~1 high on road (fitted on half, checked on the other: within 1 point
 * went 45% -> 73%). Re-fit if the score scale or the readership changes.
 */
const TYPES: string[] = SCHEMA.properties.type.enum;
const TOPICS: string[] = SCHEMA.properties.topic.enum;
const JEV_TOPIC_OFFSET: Record<Verdict['topic'], number> = { trail_ultra: 0, road: 1, track: 3 };

interface JevChoice { choice: string; probabilities: Record<string, number> }
interface JevAnswers {
  type: JevChoice; topic: JevChoice; running: { noul: number }; uk: { noul: number }; importance: { score: number };
}

/**
 * The live sorter since 1 Oct 2026: the same verdict from Jev, a decision model, at ~1/30th of
 * SORT_MODEL's cost (scripts/news-sorter-check.ts --jev, docs/news/sorter-check-jev.md).
 * "confidence" is Jev's probability for the chosen type, and the +1 for UK stories is done here
 * because Jev reads instructions literally and leaves arithmetic to code. Jev has no fallback of
 * its own, so a failed or malformed answer goes to sortItem instead.
 */
export async function sortItemJev(c: Candidate, call: typeof completeJson = completeJson): Promise<{ verdict: Verdict | null; costUsd: number }> {
  if (MEDIA_URL.test(c.url) || isRoundUp(c.title)) return sortItem(c, call);
  const state = {
    source: c.source, title: c.title, published: c.pubDate.toISOString().slice(0, 10),
    summary: c.summary.slice(0, 1200), opening: (c.text ?? '').slice(0, 1500),
  };
  const questions = {
    type: {
      type: 'choice',
      instructions: 'What kind of article is this, for a running news desk that only publishes news?',
      criteria: {
        news: 'Reports something that has happened: race results, records, wins, DNFs, team selections, announcements, course or rule changes, cancellations, a race selling out completely, injuries, retirements, doping cases.',
        preview: 'A race preview or "who to watch" piece about a race not yet run.',
        personal_race_report: "A runner's own account of their race.",
        review: 'A gear or shoe review.',
        training: 'Training advice.',
        opinion: 'Opinion, a column, a "takeaways" or analysis piece, or a weekly recap column.',
        media: 'A podcast, a video clip, a live blog or a live-tracking page.',
        sponsored: 'A sponsored post.',
        other: 'An interview or profile, a feature about a result already reported, entries opening, "X% sold" or other sales updates, event promotion or countdowns, or anything else.',
      },
    },
    running: {
      type: 'noul',
      instructions: 'Is this about running?',
      criteria: {
        true: 'Road, trail, ultra, mountain, cross-country or track running, including sprints, hurdles and relays.',
        false: 'Field events (jumps, throws, combined events) or a sport other than running.',
      },
    },
    topic: {
      type: 'choice',
      instructions: 'Which part of running is this about?',
      criteria: { trail_ultra: 'Trail, ultra, mountain or sky running.', road: 'Road running, marathons, parkrun, cross-country.', track: 'Track and field running events.' },
    },
    uk: {
      type: 'noul',
      instructions: 'Are British athletes or UK races central to this story?',
      criteria: { true: 'British athletes or UK races are central.', false: 'They are absent or only mentioned in passing.' },
    },
    importance: {
      type: 'score',
      instructions: 'How important is this story to a UK running site read by trail, ultra and road runners alike?',
      criteria: [
        'Local news, minor announcements, entries and logistics.',
        'Minor race news of local interest.',
        'Local race results.',
        'Results at smaller races.',
        'National-level news, or celebrities running a race.',
        'Notable results at well-known races, big-name injuries or retirements, trails or races losing access, viral human-interest, a provisional doping suspension.',
        'Changes that affect thousands of ordinary runners (qualifying times, cut-offs, ballots for the Majors or UTMB), governing-body rows, a race sold, axed or losing its sponsor, a legend retiring or coming back.',
        'World championship results in ultra, trail or mountain running, a course record at a major ultra, a record on a classic round or long trail (Bob Graham, Paddy Buckley, Ramsay, Pennine Way, a notable FKT), a road or track world record, a Majors marathon win, the death of a known runner, doping bans, cheating punished, race disasters, results overturned, sporting firsts, a controversy the running world is talking about.',
        'One of those stories about one of the sport\'s biggest names.',
        'The biggest days of the year: UTMB or Western States won, an ultra world record, a British win at either.',
      ],
    },
  };
  try {
    const { answers: a, costUsd } = await decide<JevAnswers>(state, questions);
    if (!TYPES.includes(a?.type?.choice) || !TOPICS.includes(a.topic?.choice) || typeof a.importance?.score !== 'number') {
      throw new Error(`malformed answers: ${JSON.stringify(a).slice(0, 300)}`);
    }
    const isUk = a.uk.noul >= 0.5;
    const topic = a.topic.choice as Verdict['topic'];
    const verdict: Verdict = {
      type: a.type.choice as Verdict['type'],
      confidence: a.type.probabilities[a.type.choice] ?? 0,
      isRunning: a.running.noul >= 0.5,
      topic,
      isUk,
      importance: Math.max(1, Math.min(10, Math.round(a.importance.score) + 1 + (isUk ? 1 : 0) - JEV_TOPIC_OFFSET[topic])),
    };
    return { verdict, costUsd };
  } catch (e) {
    console.warn(`Jev sort failed for ${c.url}, falling back to ${SORT_MODEL}: ${(e as Error).message}`);
    return sortItem(c, call);
  }
}
