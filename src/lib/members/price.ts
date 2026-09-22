/**
 * What the shop takes off, shown in the client; Stripe computes the real
 * figure from the coupon. A free account saves 10%, a paying one 15%.
 */
export const MEMBER_DISCOUNT = 0.1;
export const CLUB_DISCOUNT = 0.15;

export const discountFor = (isClub: boolean) => (isClub ? CLUB_DISCOUNT : MEMBER_DISCOUNT);

export const memberPrice = (pounds: number, isClub = false) =>
  Math.round((pounds * (1 - discountFor(isClub)) + 1e-9) * 100) / 100;
