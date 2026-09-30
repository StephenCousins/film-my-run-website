# Runner Type Tee: decisions

## The £3 own-type discount is spoofable, on purpose (30 Sep 2026)

A tee is £3 off when its design is the buyer's own quiz type. The server checks that the quiz
result is well formed (the four scores really point at that type), but it can't know the buyer
answered the questions honestly: anyone can make up four scores for the type they want, or
retake the quiz until they get it. We accept that:

- the most anyone can gain is £3 a shirt;
- the floor still holds: no tee ever sells for less than its variant price minus £5
  (£24.99 for a £29.99 M), whatever discounts stack;
- stopping it would mean accounts and a stored, server-side quiz result for every buyer, which
  costs more in friction than £3 is worth.

## Tee baskets don't use the Stripe coupon (30 Sep 2026)

The member (10%) and Club (15%) discounts are Stripe coupons on the whole Checkout Session. A
coupon can't stop at the tee floor, so when a basket has a Runner Type Tee and the buyer gets a
member discount, checkout sends no coupon and puts the discount in each line's price instead
(`src/lib/shop/tee-pricing.ts`): tees at their floored price, every other product at exactly the
coupon's rate. Stripe shows those lines as "Member price" / "FMR Club price".

So Stripe's coupon redemption counts undercount member orders from then on. To count member
orders, count `orders` rows with a `user_id` (a signed-in member at checkout), not coupon
redemptions. Lines charged this way also record their net unit price as `payPence` in
`orders.items`, which the confirmation email and the app's order history show.

The price a page shows comes from `GET /api/shop/rate`, which uses the same rule as checkout
(`src/lib/shop/member-pricing.ts`), so the page, the basket and Stripe always agree.
