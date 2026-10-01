/**
 * Turns a basket (slug + variant id + quantity) into priced order lines. Prices and
 * names always come from the catalogue, never from the client.
 */
import { shopItems, type ShopItem, type ShopVariant, type Supplier, type VariantOption } from '@/lib/shop';
import { RUNNER_TEE_SLUG, runnerTee, parsePersonal, type Personal } from './runner-tee';
import { typeById } from '@/lib/runner-quiz';
import { teeListPence } from './tee-pricing';

export interface BasketLine {
  slug: string;
  variantId: number | string;
  quantity: number;
  /** Runner Type Tee only: the type whose phrase is on the front. Old lines leave it out: their personal type. */
  design?: string;
  /** Runner Type Tee only, optional: the buyer's quiz result, printed on the back. */
  personal?: Personal;
}

export interface OrderLine {
  slug: string;
  name: string;
  variantLabel: string;
  image: string | undefined;
  supplier: Supplier;
  /** Printify product id or Contrado store product id, as a string either way. */
  supplierProductId: string;
  variantId: number | string;
  options?: VariantOption[];
  quantity: number;
  unitPence: number;
  /**
   * Set at checkout when the member discount is charged as line prices (a tee in the basket):
   * what one unit really costs. Otherwise the discount is Stripe's coupon and this is absent.
   */
  payPence?: number;
  /** Runner Type Tee only: the shirt's type (its phrase on the front). */
  design?: string;
  /** Runner Type Tee only, validated: the buyer's quiz result for the back. */
  personal?: Personal;
  /** The one tee this order took the £3 own-type discount on (once per member account). */
  ownTypeOff?: true;
}

export const MAX_LINES = 10;
export const MAX_QTY = 10;

export const variantLabel = (v: ShopVariant) => [v.colour, v.size].filter((s) => s && s !== 'One size').join(' / ');

/**
 * `ownTypeOff`: this buyer may take the £3 own-type discount (a signed-in member who never has,
 * see own-type.ts). It goes on ONE tee: the first of their own type, split off its line if the
 * line has more than one. Everyone else, guests included, pays the variant price.
 */
export function buildOrderLines(lines: BasketLine[], items: ShopItem[] = shopItems, { ownTypeOff = false } = {}): OrderLine[] {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('Basket is empty');
  if (lines.length > MAX_LINES) throw new Error(`Too many lines (max ${MAX_LINES})`);
  const priced = lines.map((l): OrderLine => {
    const item = l.slug === RUNNER_TEE_SLUG ? runnerTee : items.find((i) => i.slug === l.slug);
    const tee = l.slug === RUNNER_TEE_SLUG;
    if (!tee && (l.personal !== undefined || l.design !== undefined)) throw new Error(`${l.slug} can't be personalised`);
    // A tee's quiz result is optional, but one that is sent must be real (type matches scores).
    const personal = tee && l.personal !== undefined ? parsePersonal(l.personal) : undefined;
    if (personal === null) throw new Error('This shirt needs a valid quiz result');
    // Any of the 12 designs; an old line without one is the buyer's own type.
    const design = tee ? typeById(l.design ?? personal?.type) : undefined;
    if (tee && !design) throw new Error('Choose a shirt design');
    const v = item?.variants.find((v) => String(v.id) === String(l.variantId));
    if (!item || !v) throw new Error(`Unknown product ${l.slug}/${l.variantId}`);
    const quantity = Number(l.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) throw new Error(`Bad quantity for ${l.slug}`);
    return {
      slug: item.slug,
      name: design ? `${item.name}: ${design.name}` : item.name,
      variantLabel: variantLabel(v),
      image: (item.images.find((i) => i.colour === v.colour) ?? item.images[0])?.src,
      supplier: item.supplier ?? 'printify',
      supplierProductId: v.supplierProductId ?? item.printifyId,
      variantId: v.id,
      options: v.options,
      quantity,
      // The £3 own-type discount is applied below, once; member discounts come later (tee-pricing.ts).
      unitPence: Math.round(v.price * 100),
      ...(design && { design: design.id }),
      ...(personal && { personal }),
    };
  });
  if (!ownTypeOff) return priced;
  const i = priced.findIndex(isOwnTypeTee);
  if (i < 0) return priced;
  const l = priced[i];
  const off: OrderLine = { ...l, quantity: 1, unitPence: teeListPence(l.unitPence, true), ownTypeOff: true };
  const rest = l.quantity > 1 ? [{ ...l, quantity: l.quantity - 1 }] : [];
  return [...priced.slice(0, i), off, ...rest, ...priced.slice(i + 1)];
}

/** A tee whose design is the buyer's own quiz type: the shirt the £3 can go on. */
export const isOwnTypeTee = (l: Pick<OrderLine, 'design' | 'personal'>) => !!l.design && l.personal?.type === l.design;

export const subtotalPence = (lines: OrderLine[]) => lines.reduce((s, l) => s + l.unitPence * l.quantity, 0);

export const gbp = (pence: number) => `£${(pence / 100).toFixed(2)}`;

export const linesFor = (lines: OrderLine[], supplier: Supplier) => lines.filter((l) => l.supplier === supplier);

/** Contrado UK tracked: £5.99 for the first item, 49p each extra (Helix /shipping/en-GB, zone 2). */
export const contradoShippingPence = (count: number) => (count > 0 ? 599 + 49 * (count - 1) : 0);

/**
 * Free UK postage from £45 of goods (before any member discount, so the
 * threshold does not move under people). Set just above a single running tee,
 * so one item does not qualify and a second one does.
 */
export const FREE_SHIPPING_PENCE = 4500;

/** What the buyer pays for postage: nothing once the basket clears the threshold. */
export const shippingToCharge = (subtotalPence: number, shippingPence: number) =>
  subtotalPence >= FREE_SHIPPING_PENCE ? 0 : shippingPence;

/** Pence still to spend for free postage, or 0 when it is already free. */
export const toFreeShipping = (subtotalPence: number) => Math.max(0, FREE_SHIPPING_PENCE - subtotalPence);

/** Where Stripe sends the buyer afterwards. The app flags its pages so they offer "Back to the app". */
export function returnUrls(base: string, source: unknown) {
  const app = source === 'app';
  return {
    success_url: `${base}/shop/thanks?session_id={CHECKOUT_SESSION_ID}${app ? '&app=1' : ''}`,
    cancel_url: `${base}/shop/basket${app ? '?app=1' : ''}`,
    metadata: (app ? { source: 'app' } : {}) as Record<string, string>,
  };
}
