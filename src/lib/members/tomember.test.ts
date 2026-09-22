import { describe, it, expect } from 'vitest';
import { toMember } from './store';

const now = new Date('2026-09-22T12:00:00Z');
const base = { id: 1, email: 'a@b.co', name: null };

describe('toMember', () => {
  it('a hand-set PRO with no end date is Pro for ever', () => {
    const m = toMember({ ...base, access_tier: 'PRO', subscription_end: null }, now);
    expect(m.proUntil).not.toBeNull();
    expect(new Date(m.proUntil!).getTime()).toBeGreaterThan(now.getTime());
  });

  it('a PRO with a future end date is Pro until then', () => {
    const end = new Date('2026-12-01T00:00:00Z');
    expect(toMember({ ...base, access_tier: 'PRO', subscription_end: end }, now).proUntil).toBe(end.toISOString());
  });

  it('a lapsed PRO and a FREE account are not', () => {
    expect(toMember({ ...base, access_tier: 'PRO', subscription_end: new Date('2026-01-01T00:00:00Z') }, now).proUntil).toBeNull();
    expect(toMember({ ...base, access_tier: 'FREE', subscription_end: null }, now).proUntil).toBeNull();
  });
});
