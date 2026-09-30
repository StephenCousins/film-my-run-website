/**
 * Server only. The member discount a request gets at checkout: the same answer for the checkout
 * route and for GET /api/shop/rate, so the price a page shows is the price Stripe charges.
 */
import { currentMember } from '@/lib/members/current';
import { memberCheckout } from '@/lib/members/checkout';
import { memberRate } from './tee-pricing';

export async function memberPricing(request: Request) {
  const { member, hadBearer, pro } = await currentMember(request);
  const clubCoupon = process.env.STRIPE_CLUB_COUPON;
  const mc = memberCheckout(member, hadBearer, { member: process.env.STRIPE_MEMBER_COUPON, club: clubCoupon }, pro);
  return { mc, rate: memberRate(mc.discounts, clubCoupon) };
}
