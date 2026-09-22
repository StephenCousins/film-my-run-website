import { describe, expect, it } from 'vitest';
import { memberCheckout } from './checkout';

const m = { id: 7, email: 'runner@example.com', name: null, proUntil: null };
const club = { ...m, proUntil: new Date(Date.now() + 86_400_000).toISOString() };

describe('memberCheckout', () => {
  it('applies the coupon and stamps the order for a member', () => {
    expect(memberCheckout(m, true, { member: 'MEMBER10' })).toEqual({
      discounts: [{ coupon: 'MEMBER10' }],
      orderFields: { user_id: 7, email: 'runner@example.com' },
      response: { member: true },
    });
  });
  it('gives a Pro subscriber without an account the coupon and nothing to stamp', () => {
    expect(memberCheckout(null, false, { member: 'MEMBER10' }, true)).toEqual({ discounts: [{ coupon: 'MEMBER10' }], orderFields: {}, response: { member: true, club: true } });
    expect(memberCheckout(null, false, { member: undefined }, true).response).toEqual({ member: false, reason: 'no_coupon' });
  });
  it('does nothing for a guest', () => {
    expect(memberCheckout(null, false, { member: 'MEMBER10' })).toEqual({ discounts: undefined, orderFields: {}, response: { member: false } });
  });
  it('says signed_out when a bearer was sent but did not resolve', () => {
    expect(memberCheckout(null, true, { member: 'MEMBER10' }).response).toEqual({ member: false, reason: 'signed_out' });
  });
  it('still stamps the order but says no_coupon when the coupon is not configured', () => {
    expect(memberCheckout(m, true, { member: undefined })).toEqual({
      discounts: undefined,
      orderFields: { user_id: 7, email: 'runner@example.com' },
      response: { member: false, reason: 'no_coupon' },
    });
  });
  it('gives a Club member 15% and falls back to the 10% coupon when none is set', () => {
    expect(memberCheckout(club, true, { member: 'MEMBER10', club: 'CLUB15' })).toEqual({
      discounts: [{ coupon: 'CLUB15' }],
      orderFields: { user_id: 7, email: 'runner@example.com' },
      response: { member: true, club: true },
    });
    // A missing Club coupon costs 5%, never the whole discount.
    expect(memberCheckout(club, true, { member: 'MEMBER10' }).discounts).toEqual([{ coupon: 'MEMBER10' }]);
    // An expired subscription is an ordinary member again.
    const lapsed = { ...m, proUntil: new Date(Date.now() - 1000).toISOString() };
    expect(memberCheckout(lapsed, true, { member: 'MEMBER10', club: 'CLUB15' }).discounts).toEqual([{ coupon: 'MEMBER10' }]);
  });
});
