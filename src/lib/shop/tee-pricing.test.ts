import { describe, it, expect } from 'vitest';
import { buildOrderLines, type BasketLine } from './orders';
import { RUNNER_TEE_SLUG, runnerTee } from './runner-tee';
import { CLUB_DISCOUNT, MEMBER_DISCOUNT } from '@/lib/members/price';
import { discountAsLinePrices, linePayPence, memberRate, payPence, teePayPence } from './tee-pricing';

const fell = { type: 'fell', scores: [18, 29, 45, 64] as [number, number, number, number] };
const M = runnerTee.variants.find((v) => v.colour === 'Black' && v.size === 'M')!; // £29.99
const XXXXL = runnerTee.variants.find((v) => v.colour === 'Black' && v.size === '4XL')!; // £38.99
const tee = (design: string, personal?: typeof fell, variantId: number | string = M.id): BasketLine => ({
  slug: RUNNER_TEE_SLUG,
  variantId,
  quantity: 1,
  design,
  ...(personal && { personal }),
});
const pay = (l: BasketLine, rate: number) => linePayPence(buildOrderLines([l])[0], rate);

const GUEST = 0;
const MEMBER = MEMBER_DISCOUNT;
const CLUB = CLUB_DISCOUNT;

describe('Runner Type Tee prices, size M (£29.99, floor £24.99)', () => {
  it.each([
    ['guest, own type', GUEST, tee('fell', fell), 2699],
    ['guest, other type', GUEST, tee('lab', fell), 2999],
    ['guest, no quiz', GUEST, tee('lab'), 2999],
    ['member, own type', MEMBER, tee('fell', fell), 2499], // 26.99 − 10% = 24.29, floored
    ['member, other type', MEMBER, tee('lab', fell), 2699],
    ['member, no quiz', MEMBER, tee('lab'), 2699],
    ['Club, own type', CLUB, tee('fell', fell), 2499], // 26.99 − 15% = 22.94, floored
    ['Club, other type', CLUB, tee('lab', fell), 2549],
    ['Club, no quiz', CLUB, tee('lab'), 2549],
  ] as const)('%s pays %i', (_label, rate, line, expected) => {
    expect(pay(line, rate)).toBe(expected);
  });

  it('keeps the same £5 floor offset on bigger sizes (4XL £38.99 → never below £33.99)', () => {
    expect(teePayPence(3899, true, CLUB)).toBe(3399);
    expect(pay(tee('fell', fell, XXXXL.id), CLUB)).toBe(3399);
    expect(pay(tee('lab', undefined, XXXXL.id), MEMBER)).toBe(3509);
  });

  it('never goes below the floor for any tee, any rate, any size', () => {
    for (const v of runnerTee.variants)
      for (const own of [true, false])
        for (const rate of [GUEST, MEMBER, CLUB]) expect(teePayPence(Math.round(v.price * 100), own, rate)).toBeGreaterThanOrEqual(Math.round(v.price * 100) - 500);
  });
});

describe('a mixed basket', () => {
  const basket = buildOrderLines([
    tee('fell', fell),
    tee('lab'),
    { slug: 'bonus-miles', variantId: 18100, quantity: 2 },
  ]);

  it('a guest pays list prices, own type £3 off', () => {
    expect(discountAsLinePrices(basket, GUEST)).toBe(false);
    expect(payPence(basket, GUEST)).toBe(2699 + 2999 + 2 * 2999);
  });

  it('a member: tees floored, other products at exactly 10% as before', () => {
    expect(discountAsLinePrices(basket, MEMBER)).toBe(true);
    const other = basket[2];
    expect(linePayPence(other, MEMBER)).toBe(Math.round(2999 * 0.9));
    expect(payPence(basket, MEMBER)).toBe(2499 + 2699 + 2 * 2699);
  });

  it('a Club member: tees floored, other products at exactly 15%', () => {
    expect(payPence(basket, CLUB)).toBe(2499 + 2549 + 2 * Math.round(2999 * 0.85));
  });

  it('without a tee the member discount stays Stripe’s whole-basket coupon, unchanged', () => {
    const noTee = buildOrderLines([{ slug: 'bonus-miles', variantId: 18100, quantity: 2 }]);
    expect(discountAsLinePrices(noTee, MEMBER)).toBe(false);
    expect(payPence(noTee, MEMBER)).toBe(Math.round(5998 * 0.9));
  });
});

describe('memberRate', () => {
  it('reads the rate from the coupon the checkout chose', () => {
    expect(memberRate(undefined, 'CLUB15')).toBe(0);
    expect(memberRate([{ coupon: 'MEMBER10' }], 'CLUB15')).toBe(MEMBER);
    expect(memberRate([{ coupon: 'CLUB15' }], 'CLUB15')).toBe(CLUB);
    expect(memberRate([{ coupon: 'MEMBER10' }], undefined)).toBe(MEMBER);
  });
});
