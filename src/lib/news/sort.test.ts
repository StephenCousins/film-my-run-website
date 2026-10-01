import { afterEach, describe, expect, it, vi } from 'vitest';
import { passesSort, isBorderline, sortItem, sortItemJev } from './sort';
import type { Candidate, Verdict } from './types';

const v = (over: Partial<Verdict>): Verdict => ({ type: 'news', confidence: 0.95, isRunning: true, topic: 'trail_ultra', isUk: false, importance: 7, ...over });
const c: Candidate = { articleId: 1, url: 'https://x.test/a', source: 'iRunFar', title: 'T', pubDate: new Date(), summary: 's', text: 'full', imageUrl: null, photoCredit: null };

describe('sorting', () => {
  it('passes only running news at 0.90 or more', () => {
    expect(passesSort(v({}))).toBe(true);
    expect(passesSort(v({ confidence: 0.89 }))).toBe(false);
    expect(passesSort(v({ type: 'review' }))).toBe(false);
    expect(passesSort(v({ isRunning: false }))).toBe(false);
    expect(passesSort(null)).toBe(false);
  });
  it('marks news at 0.50-0.90 as borderline for the log', () => {
    expect(isBorderline(v({ confidence: 0.7 }))).toBe(true);
    expect(isBorderline(v({ confidence: 0.95 }))).toBe(false);
    expect(isBorderline(v({ type: 'opinion', confidence: 0.7 }))).toBe(false);
  });
  it('a reply that is not a verdict gives null, not a throw', async () => {
    const call = async () => ({ data: null, costUsd: 0.001, raw: 'nope' });
    const r = await sortItem(c, call as never);
    expect(r.verdict).toBeNull();
    expect(r.costUsd).toBe(0.001);
  });
  it('a confidence outside [0, 1] fails closed', async () => {
    const call = async () => ({ data: v({ confidence: 1.5 }), costUsd: 0.001, raw: '' });
    const r = await sortItem(c, call as never);
    expect(r.verdict).toBeNull();
  });
});

describe('sortItem media pages', () => {
  it('settles a video page as media without calling the model', async () => {
    let called = false;
    const call = (async () => { called = true; return { data: null, costUsd: 0.001, raw: '' }; }) as never;
    const r = await sortItem({ ...c, url: 'https://www.bbc.co.uk/sport/athletics/videos/cv2dw8p0g12ro?at_medium=RSS' }, call);
    expect(called).toBe(false);
    expect(passesSort(r.verdict)).toBe(false);
    expect(r.costUsd).toBe(0);
  });
});

describe('sortItemJev', () => {
  const answers = (over: object = {}) => ({
    type: { choice: 'news', probabilities: { news: 0.93 } }, topic: { choice: 'track', probabilities: {} },
    running: { noul: 0.9 }, uk: { noul: 0.8 }, importance: { score: 6.2 }, ...over,
  });
  const stubFetch = (res: Response) => vi.stubGlobal('fetch', vi.fn(async () => res));
  const gemini = async () => ({ data: v({ importance: 4 }), costUsd: 0.002, raw: '' });
  afterEach(() => vi.unstubAllGlobals());

  it('maps answers to a verdict, with the UK bonus and the track offset', async () => {
    stubFetch(Response.json({ answers: answers(), usage: { cost: 0.00006 } }));
    const r = await sortItemJev(c, gemini as never);
    // score 6.2 -> 6, +1 to the 1-10 scale, +1 UK, -3 track
    expect(r.verdict).toEqual({ type: 'news', confidence: 0.93, isRunning: true, topic: 'track', isUk: true, importance: 5 });
    expect(r.costUsd).toBe(0.00006);
  });
  it('falls back to the chat sorter when Jev errors', async () => {
    stubFetch(new Response('down', { status: 503 }));
    const r = await sortItemJev(c, gemini as never);
    expect(r.verdict?.importance).toBe(4);
    expect(r.costUsd).toBe(0.002);
  });
  it('falls back when an answer is malformed', async () => {
    stubFetch(Response.json({ answers: answers({ type: { choice: 'gossip', probabilities: {} } }) }));
    const r = await sortItemJev(c, gemini as never);
    expect(r.verdict?.importance).toBe(4);
  });
});
