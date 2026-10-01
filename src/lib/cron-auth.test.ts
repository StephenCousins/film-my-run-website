import { describe, expect, it } from 'vitest';
import { hasBearerSecret } from './cron-auth';

const req = (auth?: string, url = 'https://filmmyrun.com/api/x') => new Request(url, { headers: auth ? { authorization: auth } : {} });

describe('hasBearerSecret', () => {
  it('accepts only the exact bearer secret', () => {
    expect(hasBearerSecret(req('Bearer s3cret'), 's3cret')).toBe(true);
    expect(hasBearerSecret(req('Bearer s3cre'), 's3cret')).toBe(false);
    expect(hasBearerSecret(req('s3cret'), 's3cret')).toBe(false);
    expect(hasBearerSecret(req(), 's3cret')).toBe(false);
  });
  it('refuses everyone when no secret is configured, and ignores ?secret=', () => {
    expect(hasBearerSecret(req('Bearer '), undefined)).toBe(false);
    expect(hasBearerSecret(req('Bearer '), '')).toBe(false);
    expect(hasBearerSecret(req(undefined, 'https://filmmyrun.com/api/x?secret=s3cret'), 's3cret')).toBe(false);
  });
});
