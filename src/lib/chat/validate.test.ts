import { describe, expect, it } from 'vitest';
import { isInstallId, validateNewMessage } from './validate';

describe('validateNewMessage', () => {
  it('trims and accepts a good message', () => {
    const r = validateNewMessage({ name: ' Stephen ', email: 'S@Example.com', text: '  hello  ' });
    expect(r).toEqual({ ok: true, value: { name: 'Stephen', email: 's@example.com', text: 'hello' } });
  });
  it('refuses empty text, text over 2000, a bad email, a long name, a non-object', () => {
    expect(validateNewMessage({ name: 'a', email: 'a@b.c', text: '   ' }).ok).toBe(false);
    expect(validateNewMessage({ name: 'a', email: 'a@b.c', text: 'x'.repeat(2001) }).ok).toBe(false);
    expect(validateNewMessage({ name: 'a', email: 'nope', text: 'hi' }).ok).toBe(false);
    expect(validateNewMessage({ name: 'n'.repeat(81), email: 'a@b.c', text: 'hi' }).ok).toBe(false);
    expect(validateNewMessage('str').ok).toBe(false);
  });
  it('strips control characters from the name, which goes into an email subject', () => {
    const r = validateNewMessage({ name: 'Jo\r\nBcc: x@y.z\tSmith\x00\x7f', email: 'a@b.c', text: 'hi' });
    expect(r).toEqual({ ok: true, value: { name: 'JoBcc: x@y.zSmith', email: 'a@b.c', text: 'hi' } });
    // A name that is nothing but control characters is no name.
    expect(validateNewMessage({ name: '\n\t', email: 'a@b.c', text: 'hi' }).ok).toBe(false);
  });
});

describe('isInstallId', () => {
  it('accepts a UUID and refuses anything else', () => {
    expect(isInstallId('6F9619FF-8B86-D011-B42D-00C04FC964FF')).toBe(true);
    expect(isInstallId('short')).toBe(false);
    expect(isInstallId(null)).toBe(false);
  });
});
