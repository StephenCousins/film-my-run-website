import { describe, expect, it } from 'vitest';
import { buildIndex, search, splitPack } from './search';

const PACK = `# Facts about Stephen and Film My Run
He lives in Worthing.

# Stephen's race results: every race he has run
2026-10-18 | Abingdon Marathon | Marathon | 42.2 km | 3:49:33

# Pages on filmmyrun.com

### POV Race Coverage
URL: https://filmmyrun.com/services/pov-race-coverage
Head-mounted footage of your whole course.

# Stephen's blog (race reports and stories)
- [Great South Run](https://filmmyrun.com/blog/great-south-run): Yesterday I ran 10 miles in 1:12:38.
- [Triathlon Day](https://filmmyrun.com/blog/triathlon-day): All three disciplines in one day.
`;

describe('splitPack', () => {
  const { core, passages } = splitPack(PACK);

  it('keeps facts and race results whole in the core, with a list of pages', () => {
    expect(core).toContain('He lives in Worthing.');
    expect(core).toContain('Abingdon Marathon');
    expect(core).toContain('- [POV Race Coverage](https://filmmyrun.com/services/pov-race-coverage)');
    expect(core).not.toContain('Head-mounted footage');
    expect(core).not.toContain('Great South Run');
  });

  it('turns pages and blog posts into searchable passages', () => {
    expect(passages.map((p) => p.url)).toEqual([
      'https://filmmyrun.com/services/pov-race-coverage',
      'https://filmmyrun.com/blog/great-south-run',
      'https://filmmyrun.com/blog/triathlon-day',
    ]);
    expect(search(buildIndex(passages), 'how fast was the great south run?', 1)[0].url).toBe('https://filmmyrun.com/blog/great-south-run');
  });
});
