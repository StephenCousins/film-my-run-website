import { describe, expect, it } from 'vitest';
import { RULES, cleanLinks, isInstallId, parseContext } from './chat';

describe('wilson assistant', () => {
  it('parseContext', () => {
    expect(parseContext({ context: { runs: 3 } })).toBe('{"runs":3}');
    expect(parseContext({})).toHaveProperty('error');
    expect(parseContext({ context: { a: 'x'.repeat(7992) } })).toHaveLength(8000);
    expect(parseContext({ context: { a: 'x'.repeat(7993) } })).toHaveProperty('error');
  });
  it('isInstallId', () => {
    expect(isInstallId('3f2b8c1e-9d4a-4b7e-8f00-1a2b3c4d5e6f')).toBe(true);
    expect(isInstallId('abc')).toBe(false);
  });
  it('cleanLinks', () => {
    expect(cleanLinks('[Bushy](wilson://event/bushy) and [x](https://evil.com) see https://evil.com')).toBe(
      '[Bushy](wilson://event/bushy) and x see',
    );
    expect(cleanLinks('[a](wilson://nope)')).toBe('a');
    expect(cleanLinks('[https://evil.com](https://evil.com)')).toBe('');
    expect(cleanLinks('[a](https://x.com "t")')).toBe('a');
    expect(cleanLinks('[a](javascript:alert(1))')).toBe('a');
    expect(cleanLinks('see https://filmmyrun.com/wilsonevil now')).toBe('see now');
    expect(cleanLinks('go wilson://settings now')).toBe('go wilson://settings now');
    expect(cleanLinks('[p](https://filmmyrun.com/wilson/privacy)')).toBe('[p](https://filmmyrun.com/wilson/privacy)');
  });
  it('RULES', () => {
    for (const s of ['parkrun', 'never invent', 'only from', "If the runner's facts say runs: 0"]) {
      expect(RULES.toLowerCase()).toContain(s.toLowerCase());
    }
  });
});
