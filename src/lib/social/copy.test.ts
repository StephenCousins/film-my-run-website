import { afterEach, describe, expect, it, vi } from 'vitest';
import { CAPTION_MAX, buildCaptions, cleanHashtags, cleanHighlight, creditCaptionLine, trimCaption, writeSocialCopy } from './copy';

const story = {
  slug: 'walmsley-wins', title: 'Jim Walmsley wins Western States', excerpt: 'A new course record.',
  content: '<p>Jim Walmsley won in 14:09.</p>', photoCredit: 'Photo: Jane Smith / iRunFar', topic: 'trail_ultra', tag: 'RESULTS' as const,
};

afterEach(() => vi.unstubAllEnvs());

describe('captions', () => {
  it('both carry the photo credit and the hashtags; Facebook has the link, Instagram says link in bio', () => {
    const c = buildCaptions('Walmsley won. A new record.', 'walmsley-wins', 'Photo: Jane Smith / iRunFar', ['#WSER', '#ultrarunning', '#trailrunning']);
    for (const text of [c.facebook, c.instagram]) {
      expect(text).toContain('📷 Photo: Jane Smith / iRunFar');
      expect(text).toContain('#WSER #ultrarunning #trailrunning');
      expect(text.startsWith('Walmsley won. A new record.')).toBe(true);
    }
    expect(c.facebook).toContain('Full story: https://filmmyrun.com/news/walmsley-wins');
    expect(c.instagram).toContain('Full story: link in bio');
    expect(c.instagram).not.toContain('https://');
  });
  it('adds "Photo:" to a bare credit', () => {
    expect(creditCaptionLine('Jane Smith')).toBe('📷 Photo: Jane Smith');
    expect(creditCaptionLine(null)).toBe('');
  });
  it('hashtags: cleaned, de-duplicated, 3 to 6', () => {
    expect(cleanHashtags(['UTMB', '#utmb', '#trail running', '#Chamonix!'], 'trail_ultra')).toEqual(['#UTMB', '#trailrunning', '#Chamonix', '#ultrarunning', '#runningnews', '#filmmyrun']);
    expect(cleanHashtags([], 'road')).toHaveLength(4);
    expect(cleanHashtags(['#a', '#b', '#c', '#d', '#e', '#f', '#g'])).toHaveLength(6);
  });
  it('highlight words must be in the headline', () => {
    expect(cleanHighlight('Walmsley smashes the record', ['walmsley', 'Record', 'Western'])).toEqual(['Walmsley', 'record']);
  });
});

describe('caption length', () => {
  it('a short body is left alone', () => {
    expect(trimCaption('Kejelcha is out of Valencia. Injury again.')).toBe('Kejelcha is out of Valencia. Injury again.');
  });
  it('an overlong body is cut back to its last full sentence under the limit', () => {
    const s1 = 'Peres Jepchirchir is banned for three years after EPO was found in a July sample.';
    const s2 = 'She also loses her Sydney Marathon title, won in a course record last August.';
    const s3 = 'Two other Kenyan athletes were sanctioned by the Athletics Integrity Unit on the same day, the AIU said in a statement on Wednesday afternoon.';
    const long = `${s1} ${s2} ${s3}`;
    expect(long.length).toBeGreaterThan(CAPTION_MAX);
    expect(trimCaption(long)).toBe(`${s1} ${s2}`);
    expect(trimCaption(long).length).toBeLessThanOrEqual(CAPTION_MAX);
  });
  it('one endless sentence is cut at a word, with an ellipsis', () => {
    const out = trimCaption(`${'word '.repeat(100)}end.`);
    expect(out.length).toBeLessThanOrEqual(CAPTION_MAX);
    expect(out.endsWith('word…')).toBe(true);
  });
  it('the guard runs on what Claude writes, before the link, credit and hashtags', async () => {
    vi.stubEnv('ANTHROPIC_CREDIT_API_KEY', '');
    vi.stubEnv('CLAUDE_CODE_OAUTH_TOKEN', 'x');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const body = `${'A sentence about the race that goes on a while. '.repeat(10)}`;
    const run = vi.fn(async () => JSON.stringify({ result: JSON.stringify({ headline: 'Walmsley wins', highlight: [], caption: body, hashtags: ['#WSER'] }) }));
    const c = await writeSocialCopy(story, run);
    const captionBody = c.captionFacebook.split('\n\nFull story:')[0];
    expect(captionBody.length).toBeLessThanOrEqual(CAPTION_MAX);
    expect(captionBody.endsWith('.')).toBe(true);
    expect(c.captionFacebook).toContain('📷 Photo: Jane Smith / iRunFar');
    vi.restoreAllMocks();
  });
});

describe('writeSocialCopy', () => {
  it('asks Claude (here through the CLI route) and builds both captions with the credit', async () => {
    vi.stubEnv('ANTHROPIC_CREDIT_API_KEY', '');
    vi.stubEnv('CLAUDE_CODE_OAUTH_TOKEN', 'x');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    let asked = '';
    const run = vi.fn(async (_args: string[], stdin: string) => {
      asked = stdin;
      return JSON.stringify({ result: JSON.stringify({ headline: 'Walmsley — record at Western States', highlight: ['Walmsley', 'record'], caption: 'Jim Walmsley won — in 14:09.', hashtags: ['#WSER', 'ultrarunning'] }) });
    });
    const c = await writeSocialCopy(story, run);
    expect(asked).toContain('Jim Walmsley won in 14:09.');
    expect(c.headline).toBe('Walmsley, record at Western States'); // no em dashes
    expect(c.highlight).toEqual(['Walmsley', 'record']);
    expect(c.captionFacebook).toContain('📷 Photo: Jane Smith / iRunFar');
    expect(c.captionInstagram).toContain('📷 Photo: Jane Smith / iRunFar');
    expect(c.captionFacebook).toContain('#WSER #ultrarunning');
    expect(c.costUsd).toBe(0);
    vi.restoreAllMocks();
  });
  it('throws when the reply has no headline (the post is then recorded as failed)', async () => {
    vi.stubEnv('ANTHROPIC_CREDIT_API_KEY', '');
    vi.stubEnv('CLAUDE_CODE_OAUTH_TOKEN', 'x');
    vi.stubEnv('OPENROUTER_API_KEY', '');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const run = vi.fn(async () => JSON.stringify({ result: JSON.stringify({ headline: '', highlight: [], caption: 'x', hashtags: [] }) }));
    await expect(writeSocialCopy(story, run)).rejects.toThrow(/headline/);
    vi.restoreAllMocks();
  });
});
