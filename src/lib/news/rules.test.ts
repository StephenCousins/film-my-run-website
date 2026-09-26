import { describe, expect, it } from 'vitest';
import { ruleProblems } from './rules';

const good = { title: 'Evans wins UTMB', excerpt: 'Tom Evans took the title in 19:37.', paragraphs: ['a b c', 'd e f', 'g h i'] };

describe('code-rule gate', () => {
  it('passes a clean draft', () => expect(ruleProblems(good, ['unrelated source words'])).toEqual([]));
  it('needs a title, an excerpt and 3-6 paragraphs', () => {
    expect(ruleProblems({ ...good, title: '' }, [])).toContain('no title');
    expect(ruleProblems({ ...good, paragraphs: ['one', 'two'] }, [])).toContain('2 paragraphs (3-6)');
    expect(ruleProblems({ ...good, paragraphs: Array(7).fill('x') }, [])).toContain('7 paragraphs (3-6)');
  });
  it('counts only non-blank paragraphs, so all-blank fails with "no body"', () => {
    expect(ruleProblems({ ...good, paragraphs: ['', ' ', ''] }, [])).toContain('no body');
  });
  it('no em dashes or semicolons', () => {
    expect(ruleProblems({ ...good, paragraphs: ['He won — easily.', 'b', 'c'] }, [])).toContain('em dash');
    expect(ruleProblems({ ...good, paragraphs: ['He won; easily.', 'b', 'c'] }, [])).toContain('semicolon');
  });
  it('flags a spaced en dash as an em dash, but not an unspaced range en dash', () => {
    expect(ruleProblems({ ...good, paragraphs: ['He won – easily.', 'b', 'c'] }, [])).toContain('em dash');
    expect(ruleProblems({ ...good, paragraphs: ['He covered 5–10 miles.', 'b', 'c'] }, [])).not.toContain('em dash');
  });
  it('fails a near-copy: ten words in a row lifted from a source', () => {
    const lifted = 'the leaders reached the col de balme just after dawn with fresh legs';
    const draft = { ...good, paragraphs: [`Early on, ${lifted}.`, 'b', 'c'] };
    expect(ruleProblems(draft, [`Report: ${lifted} and pushed on.`])).toContain('near-copy of a source');
  });
  it('normalises curly quotes before comparing to sources', () => {
    const draft = { ...good, paragraphs: ["Evans's remarkable run continued into the night as fatigue set in.", 'b', 'c'] };
    const source = 'Race report: Evans’s remarkable run continued into the night as fatigue set in cold conditions.';
    expect(ruleProblems(draft, [source])).toContain('near-copy of a source');
  });
});
