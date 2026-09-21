/** What a member changes about a Stripe Checkout Session and the pending order (spec §3). Pure. */
import type { Member } from './handlers';

export type MemberCheckout = {
  discounts: { coupon: string }[] | undefined;
  orderFields: { user_id?: number; email?: string };
  response: { member: boolean; reason?: 'signed_out' | 'no_coupon' };
};

export function memberCheckout(member: Member | null, hadBearer: boolean, coupon: string | undefined): MemberCheckout {
  if (!member) return { discounts: undefined, orderFields: {}, response: hadBearer ? { member: false, reason: 'signed_out' } : { member: false } };
  const orderFields = { user_id: member.id, email: member.email };
  if (!coupon) return { discounts: undefined, orderFields, response: { member: false, reason: 'no_coupon' } };
  return { discounts: [{ coupon }], orderFields, response: { member: true } };
}
