/**
 * Turns a basket (slug + variant id + quantity) into priced order lines. Prices and
 * names always come from the catalogue, never from the client.
 */
import { shopItems, type ShopItem, type ShopVariant } from '@/lib/shop';

export interface BasketLine {
  slug: string;
  variantId: number;
  quantity: number;
}

export interface OrderLine {
  slug: string;
  name: string;
  variantLabel: string;
  image: string | undefined;
  printifyProductId: string;
  variantId: number;
  quantity: number;
  unitPence: number;
}

export const MAX_LINES = 10;
export const MAX_QTY = 10;

export const variantLabel = (v: ShopVariant) => [v.colour, v.size].filter((s) => s && s !== 'One size').join(' / ');

export function buildOrderLines(lines: BasketLine[], items: ShopItem[] = shopItems): OrderLine[] {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('Basket is empty');
  if (lines.length > MAX_LINES) throw new Error(`Too many lines (max ${MAX_LINES})`);
  return lines.map((l) => {
    const item = items.find((i) => i.slug === l.slug);
    const v = item?.variants.find((v) => v.id === l.variantId);
    if (!item || !v) throw new Error(`Unknown product ${l.slug}/${l.variantId}`);
    const quantity = Number(l.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) throw new Error(`Bad quantity for ${l.slug}`);
    return {
      slug: item.slug,
      name: item.name,
      variantLabel: variantLabel(v),
      image: item.images[0]?.src,
      printifyProductId: item.printifyId,
      variantId: v.id,
      quantity,
      unitPence: Math.round(v.price * 100),
    };
  });
}

export const subtotalPence = (lines: OrderLine[]) => lines.reduce((s, l) => s + l.unitPence * l.quantity, 0);

export const gbp = (pence: number) => `£${(pence / 100).toFixed(2)}`;
