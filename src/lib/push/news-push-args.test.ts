import { describe, expect, it } from 'vitest';
import { parseNewsPushArgs, tail } from './news-push-args';

describe('parseNewsPushArgs', () => {
  it('dry run', () => expect(parseNewsPushArgs(['--dry-run'])).toEqual({ mode: 'dry-run' }));
  it('single token', () =>
    expect(parseNewsPushArgs(['--to', 'abc', '--env', 'sandbox'])).toEqual({ mode: 'to', token: 'abc', env: 'sandbox' }));
  it('rejects missing or bad env, missing token, nothing', () => {
    expect(() => parseNewsPushArgs(['--to', 'abc'])).toThrow(/Usage/);
    expect(() => parseNewsPushArgs(['--to', 'abc', '--env', 'prod'])).toThrow(/Usage/);
    expect(() => parseNewsPushArgs(['--to', '--env', 'sandbox'])).toThrow(/Usage/);
    expect(() => parseNewsPushArgs([])).toThrow(/Usage/);
  });
  it('tail keeps six characters', () => expect(tail('0123456789abcdef')).toBe('...abcdef'));
});
