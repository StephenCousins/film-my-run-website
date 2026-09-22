import { describe, expect, it } from 'vitest';
import { memberCheckout } from './checkout';

const m = { id: 7, email: 'runner@example.com', name: null, proUntil: null };

describe('memberCheckout', () => {
  it('applies the coupon and stamps the order for a member', () => {
    expect(memberCheckout(m, true, 'MEMBER10')).toEqual({
      discounts: [{ coupon: 'MEMBER10' }],
      orderFields: { user_id: 7, email: 'runner@example.com' },
      response: { member: true },
    });
  });
  it('gives a Pro subscriber without an account the coupon and nothing to stamp', () => {
    expect(memberCheckout(null, false, 'MEMBER10', true)).toEqual({ discounts: [{ coupon: 'MEMBER10' }], orderFields: {}, response: { member: true } });
    expect(memberCheckout(null, false, undefined, true).response).toEqual({ member: false, reason: 'no_coupon' });
  });
  it('does nothing for a guest', () => {
    expect(memberCheckout(null, false, 'MEMBER10')).toEqual({ discounts: undefined, orderFields: {}, response: { member: false } });
  });
  it('says signed_out when a bearer was sent but did not resolve', () => {
    expect(memberCheckout(null, true, 'MEMBER10').response).toEqual({ member: false, reason: 'signed_out' });
  });
  it('still stamps the order but says no_coupon when the coupon is not configured', () => {
    expect(memberCheckout(m, true, undefined)).toEqual({
      discounts: undefined,
      orderFields: { user_id: 7, email: 'runner@example.com' },
      response: { member: false, reason: 'no_coupon' },
    });
  });
});
