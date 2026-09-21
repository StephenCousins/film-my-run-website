import { describe, expect, it } from 'vitest';
import { hashCode, makeCode, makeToken, normaliseEmail } from './codes';

describe('normaliseEmail', () => {
  it('trims and lower-cases', () => {
    expect(normaliseEmail('  Stephen@FilmMyRun.com ')).toBe('stephen@filmmyrun.com');
  });
  it('rejects junk', () => {
    expect(normaliseEmail('')).toBeNull();
    expect(normaliseEmail('not an email')).toBeNull();
    expect(normaliseEmail(42)).toBeNull();
    expect(normaliseEmail('a@' + 'b'.repeat(260) + '.com')).toBeNull();
  });
});

describe('makeCode', () => {
  it('is six digits', () => {
    for (let i = 0; i < 50; i++) expect(makeCode()).toMatch(/^\d{6}$/);
  });
});

describe('hashCode', () => {
  it('is stable and bound to the email', () => {
    expect(hashCode('a@b.co', '123456')).toBe(hashCode('a@b.co', '123456'));
    expect(hashCode('a@b.co', '123456')).not.toBe(hashCode('x@b.co', '123456'));
    expect(hashCode('a@b.co', '123456')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('makeToken', () => {
  it('is 43 base64url chars and unique', () => {
    const a = makeToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(makeToken()).not.toBe(a);
  });
});
