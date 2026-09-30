/**
 * Runner Type Tee prices (Stephen, 30 Sep). Every tee costs its variant price; a buyer's own
 * type is £3 off. Member (10%) and Club (15%) discounts stack on top, but no tee ever sells for
 * less than its variant price minus £5 (£24.99 for a £29.99 M).
 *
 * The member discount is normally a Stripe coupon on the whole session. A coupon can't stop at
 * the floor, so a basket with a tee in it takes the member discount as line prices instead: the
 * tees at their floored price, everything else at exactly the coupon's rate. The buyer sees
 * those prices on our page, in the basket and on Stripe's page. Safe for client code.
 */
import { CLUB_DISCOUNT, MEMBER_DISCOUNT } from '@/lib/members/price';
import type { OrderLine } from './orders';
import { RUNNER_TEE_SLUG, runnerTee } from './runner-tee';

export const OWN_TYPE_OFF_PENCE = 300;
export const FLOOR_OFFSET_PENCE = 500;

/** The member rate a checkout gets: 0 for a guest (or no coupon configured), else the coupon's. */
export function memberRate(discounts: { coupon: string }[] | undefined, clubCoupon: string | undefined): number {
  if (!discounts?.length) return 0;
  return clubCoupon && discounts[0].coupon === clubCoupon ? CLUB_DISCOUNT : MEMBER_DISCOUNT;
}

/** What a tee sells for before any member discount: the variant price, £3 less for your own type. */
export const teeListPence = (variantPence: number, ownType: boolean) => variantPence - (ownType ? OWN_TYPE_OFF_PENCE : 0);

/** What the buyer pays for one tee, member discount included, never below the floor. */
export const teePayPence = (variantPence: number, ownType: boolean, rate: number) =>
  Math.max(Math.round(teeListPence(variantPence, ownType) * (1 - rate)), variantPence - FLOOR_OFFSET_PENCE);

export const isTee = (l: Pick<OrderLine, 'slug'>) => l.slug === RUNNER_TEE_SLUG;
export const isOwnType = (l: Pick<OrderLine, 'design' | 'personal'>) => Boolean(l.personal && l.personal.type === l.design);

const variantPence = (variantId: number | string) => {
  const v = runnerTee.variants.find((x) => String(x.id) === String(variantId));
  if (!v) throw new Error(`Not a runner tee variant: ${variantId}`);
  return Math.round(v.price * 100);
};

/** One unit of a line at the member `rate` (other products at exactly the coupon's rate). */
export function linePayPence(l: OrderLine, rate: number): number {
  if (isTee(l)) return teePayPence(variantPence(l.variantId), isOwnType(l), rate);
  return Math.round(l.unitPence * (1 - rate));
}

/**
 * How the member discount is charged: as Stripe's session coupon (no tee in the basket, as
 * before), or as line prices (a tee in the basket, so the floor holds).
 */
export const discountAsLinePrices = (lines: OrderLine[], rate: number) => rate > 0 && lines.some(isTee);

/** What the buyer pays for the goods, before postage. Matches what Stripe will charge. */
export function payPence(lines: OrderLine[], rate: number): number {
  const list = lines.reduce((s, l) => s + l.unitPence * l.quantity, 0);
  if (!discountAsLinePrices(lines, rate)) return Math.round(list * (1 - rate)); // the coupon, on the whole basket
  return lines.reduce((s, l) => s + linePayPence(l, rate) * l.quantity, 0);
}
