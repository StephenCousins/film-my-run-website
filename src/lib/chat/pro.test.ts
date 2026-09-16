import { describe, expect, it } from 'vitest';
import { checkProHeader, encodeTestJws } from './pro';

const now = Date.UTC(2026, 8, 16);
const payload = { bundleId: 'com.filmmyrun.app', productId: 'com.filmmyrun.app.pro.annual', expiresDate: now + 86_400_000 };

describe('checkProHeader', () => {
  it('accepts a live annual or monthly transaction for our bundle', () => {
    expect(checkProHeader(encodeTestJws(payload), 'i1', { now })).toEqual({ ok: true, productId: payload.productId, source: 'jws' });
    expect(checkProHeader(encodeTestJws({ ...payload, productId: 'com.filmmyrun.app.pro.monthly' }), 'i1', { now }).ok).toBe(true);
  });
  it('refuses missing, malformed, expired, revoked, wrong-bundle and wrong-product', () => {
    expect(checkProHeader(null, 'i1', { now }).ok).toBe(false);
    expect(checkProHeader('not.a.jws', 'i1', { now }).ok).toBe(false);
    expect(checkProHeader(encodeTestJws({ ...payload, expiresDate: now - 1 }), 'i1', { now }).ok).toBe(false);
    expect(checkProHeader(encodeTestJws({ ...payload, revocationDate: now - 1 }), 'i1', { now }).ok).toBe(false);
    expect(checkProHeader(encodeTestJws({ ...payload, bundleId: 'com.other' }), 'i1', { now }).ok).toBe(false);
    expect(checkProHeader(encodeTestJws({ ...payload, productId: 'com.filmmyrun.app.other' }), 'i1', { now }).ok).toBe(false);
  });
  it('accepts debug-<installId> only when that id is in the allow list', () => {
    expect(checkProHeader('debug-abc', 'abc', { now, debugIds: 'xyz, abc' })).toEqual({ ok: true, productId: 'debug', source: 'debug' });
    expect(checkProHeader('debug-abc', 'abc', { now, debugIds: 'xyz' }).ok).toBe(false);
    expect(checkProHeader('debug-abc', 'other', { now, debugIds: 'abc' }).ok).toBe(false);
    expect(checkProHeader('debug-abc', 'abc', { now }).ok).toBe(false);
  });
  it('matches the allow list and the header id whatever their case (the app sends an upper-case UUID)', () => {
    expect(checkProHeader('debug-6F9619FF-8B86', '6f9619ff-8b86', { now, debugIds: '6f9619ff-8b86' }).ok).toBe(true);
    expect(checkProHeader('debug-6f9619ff-8b86', '6F9619FF-8B86', { now, debugIds: '6F9619FF-8B86' }).ok).toBe(true);
    expect(checkProHeader('debug-6f9619ff-8b86', '6f9619ff-8b86', { now, debugIds: 'other' }).ok).toBe(false);
  });
});
