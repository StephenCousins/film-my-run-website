/**
 * Server only. After payment: render each Runner Type Tee's front and back, upload them, and
 * turn the line into a Printify "product on the fly" line item (blueprint + provider + variant
 * + print areas), so it goes in the same Printify order as the catalogue lines.
 */
import { SHIRT_COLOURS, frontArt, teeBackArt } from '@/lib/runner-quiz/shirt-art';
import { typeById } from '@/lib/runner-quiz';
import type { OrderLine } from './orders';
import type { PrintifyLine } from './printify';
import { RUNNER_TEE_BLUEPRINT, RUNNER_TEE_PROVIDER, RUNNER_TEE_SLUG, teeColour } from './runner-tee';
import type { ShirtColour } from '@/lib/runner-quiz/shirt-art';

export interface PrintDeps {
  /** SVG → PNG at `width` (renderPng). Print files use 4500, the largest print area; Printify scales it down for XS-M. */
  render: (svg: string, width: number) => Promise<Buffer>;
  /** Uploads a PNG and returns its public URL. */
  upload: (key: string, png: Buffer) => Promise<string>;
  /** The logo image for backArt, for this shirt colour. */
  logo: (colour: ShirtColour) => string;
  /** The day the order was paid, printed on the back. */
  paidAt: Date;
}

export const PRINT_WIDTH = 4500;
export const PREVIEW_WIDTH = 800;

/** `preview` is the back on its shirt colour at 800 px, for the confirmation email. */
export const printKey = (orderId: number, index: number, side: 'front' | 'back' | 'preview') =>
  `quiz-shirts/${orderId}-${index}-${side}.png`;

/**
 * Printify line items for `lines` (the order's Printify lines). `items` is the whole order, so
 * each print file is named by its line's position in the order and a retry overwrites, never adds.
 */
export async function printifyLineItems(orderId: number, items: OrderLine[], lines: OrderLine[], d: PrintDeps): Promise<PrintifyLine[]> {
  const out: PrintifyLine[] = [];
  for (const l of lines) {
    if (l.slug !== RUNNER_TEE_SLUG) {
      out.push({ product_id: l.supplierProductId, variant_id: Number(l.variantId), quantity: l.quantity });
      continue;
    }
    const index = items.indexOf(l);
    // The shirt's design (old orders: the buyer's own type); the back is the buyer's DNA, or the plain back.
    const type = typeById(l.design ?? l.personal?.type)!;
    const colour = teeColour(l.variantId);
    const personal = l.personal ? { type: typeById(l.personal.type)!, scores: l.personal.scores } : null;
    const backSvg = teeBackArt(type, personal, d.paidAt, colour, d.logo(colour));
    const front = await d.upload(printKey(orderId, index, 'front'), await d.render(frontArt(type, colour), PRINT_WIDTH));
    const back = await d.upload(printKey(orderId, index, 'back'), await d.render(backSvg, PRINT_WIDTH));
    // Not a print file: the back on the shirt colour, small, for the email.
    const onShirt = backSvg.replace('>', `><rect width="100%" height="100%" fill="${SHIRT_COLOURS[colour]}"/>`);
    await d.upload(printKey(orderId, index, 'preview'), await d.render(onShirt, PREVIEW_WIDTH));
    out.push({
      blueprint_id: RUNNER_TEE_BLUEPRINT,
      print_provider_id: RUNNER_TEE_PROVIDER,
      variant_id: Number(l.variantId),
      quantity: l.quantity,
      print_areas: { front, back },
    });
  }
  return out;
}
