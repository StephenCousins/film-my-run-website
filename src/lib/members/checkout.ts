/** What a member changes about a Stripe Checkout Session and the pending order (spec §3). Pure. */
import type { Member } from './handlers';

export type MemberCheckout = {
  discounts: { coupon: string }[] | undefined;
  orderFields: { user_id?: number; email?: string };
  response: { member: boolean; club?: boolean; reason?: 'signed_out' | 'no_coupon' };
};

/**
 * `coupons.member` is the free account's 10%, `coupons.club` the paying one's
 * 15%. A Club coupon that is not configured falls back to the member one, so a
 * missing env var costs 5%, never the whole discount.
 */
export function memberCheckout(
  member: Member | null,
  hadBearer: boolean,
  coupons: { member: string | undefined; club?: string | undefined },
  pro = false,
): MemberCheckout {
  const isClub = pro || Boolean(member?.proUntil && new Date(member.proUntil) > new Date());
  const coupon = (isClub ? coupons.club : undefined) ?? coupons.member;
  // A Club subscriber who has not signed in: the discount, no account to stamp.
  if (!member && pro) return coupon ? { discounts: [{ coupon }], orderFields: {}, response: { member: true, club: true } } : { discounts: undefined, orderFields: {}, response: { member: false, reason: 'no_coupon' } };
  if (!member) return { discounts: undefined, orderFields: {}, response: hadBearer ? { member: false, reason: 'signed_out' } : { member: false } };
  const orderFields = { user_id: member.id, email: member.email };
  if (!coupon) return { discounts: undefined, orderFields, response: { member: false, reason: 'no_coupon' } };
  return { discounts: [{ coupon }], orderFields, response: { member: true, ...(isClub ? { club: true } : {}) } };
}
