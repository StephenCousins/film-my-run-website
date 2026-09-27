import { describe, expect, it } from 'vitest';
import { profileText, RUNNER_FILE_SOURCE, toCandidate } from './runner-file';

const row = { slug: 'ruth-croft', name: 'Ruth Croft', nationality: 'NZ', utmb_index: 920, bio: '<p>Ruth Croft is a New Zealand trail runner.</p>', best_finishes: [{ race: 'UTMB Mont-Blanc CCC', year: 2025, distance: '100 km', time: '11:10:00', position: '1st woman', source: 'UTMB' }] };

describe('a runner file as a news source', () => {
  it('reads as plain text with the index and best finishes', () => {
    const t = profileText(row);
    expect(t).toContain('Ruth Croft is a New Zealand trail runner.');
    expect(t).toContain('UTMB Index 920');
    expect(t).toContain('2025: UTMB Mont-Blanc CCC, 100 km, 11:10:00, 1st woman');
    expect(t).not.toContain('<p>');
  });
  it('is a Candidate from our own site, never a feed item', () => {
    const c = toCandidate(row, new Date('2026-09-27T00:00:00Z'));
    expect(c).toMatchObject({ articleId: 0, source: RUNNER_FILE_SOURCE, url: 'https://filmmyrun.com/runners/ruth-croft', imageUrl: null });
  });
  it('drops the whole paragraph carrying an unverified fact, and the note itself, but keeps the rest of the bio', () => {
    const unverified = { ...row, bio: '<p>She won in 2019.*</p><p>She lives in Leeds.</p><p>* Film My Run could not verify this information.</p>' };
    const t = profileText(unverified);
    expect(t).not.toContain('2019');
    expect(t).not.toContain('*');
    expect(t).toContain('She lives in Leeds.');
  });
  it('drops the paragraph even when the asterisk lands after a decimal (the old sentence split broke on "2:05.3*.")', () => {
    const unverified = { ...row, bio: '<p>Her personal best for the marathon is 2:05.3.*</p><p>She lives in Leeds.</p>' };
    const t = profileText(unverified);
    expect(t).not.toContain('2:05.3');
    expect(t).not.toContain('*');
    expect(t).toContain('She lives in Leeds.');
  });
});
