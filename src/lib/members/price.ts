/** The member price shown in the client (spec §3). Stripe computes the real figure from the coupon. */
export const MEMBER_DISCOUNT = 0.1;
export const memberPrice = (pounds: number) => Math.round((pounds * (1 - MEMBER_DISCOUNT) + 1e-9) * 100) / 100;
