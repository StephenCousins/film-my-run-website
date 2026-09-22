import { describe, it, expect } from 'vitest';
import { accessFor, mergeWithExisting } from './subscription';

const end = Math.floor(new Date('2026-10-22T00:00:00Z').getTime() / 1000);

describe('accessFor', () => {
  it('unlocks for a live subscription and says when it runs out', () => {
    expect(accessFor({ status: 'active', currentPeriodEnd: end })).toEqual({ tier: 'PRO', until: new Date(end * 1000) });
    expect(accessFor({ status: 'trialing', currentPeriodEnd: end }).tier).toBe('PRO');
    // Stripe retries a failed card for days; locking them out loses the member.
    expect(accessFor({ status: 'past_due', currentPeriodEnd: end }).tier).toBe('PRO');
  });

  it('keeps a cancelled subscription until the period they paid for ends', () => {
    expect(accessFor({ status: 'active', currentPeriodEnd: end, cancelAtPeriodEnd: true })).toEqual({ tier: 'PRO', until: new Date(end * 1000) });
  });

  it('locks out once it is over', () => {
    for (const status of ['canceled', 'incomplete_expired', 'unpaid']) {
      expect(accessFor({ status, currentPeriodEnd: end })).toEqual({ tier: 'FREE', until: null });
    }
    expect(accessFor(null)).toEqual({ tier: 'FREE', until: null });
  });
});

describe('mergeWithExisting', () => {
  const later = new Date('2026-12-01T00:00:00Z');

  it('never undoes a hand-set PRO with no end date', () => {
    expect(mergeWithExisting({ tier: 'FREE', until: null }, { tier: 'PRO', until: null })).toEqual({ tier: 'PRO', until: null });
    expect(mergeWithExisting({ tier: 'PRO', until: new Date(end * 1000) }, { tier: 'PRO', until: null })).toEqual({ tier: 'PRO', until: null });
  });

  it('keeps whichever end date is further away', () => {
    expect(mergeWithExisting({ tier: 'PRO', until: new Date(end * 1000) }, { tier: 'PRO', until: later }).until).toEqual(later);
    expect(mergeWithExisting({ tier: 'PRO', until: later }, { tier: 'PRO', until: new Date(end * 1000) }).until).toEqual(later);
  });

  it('lets an ordinary lapse through', () => {
    expect(mergeWithExisting({ tier: 'FREE', until: null }, { tier: 'PRO', until: new Date(end * 1000) })).toEqual({ tier: 'FREE', until: null });
  });
});
