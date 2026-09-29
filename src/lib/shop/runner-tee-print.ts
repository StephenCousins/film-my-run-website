/**
 * Server only. After payment: render each Runner Type Tee's front and back, upload them, and
 * turn the line into a Printify "product on the fly" line item (blueprint + provider + variant
 * + print areas), so it goes in the same Printify order as the catalogue lines.
 */
import { backArt, frontArt } from '@/lib/runner-quiz/shirt-art';
import { rankTypes } from '@/lib/runner-quiz';
import type { OrderLine } from './orders';
import type { PrintifyLine } from './printify';
import { RUNNER_TEE_BLUEPRINT, RUNNER_TEE_PROVIDER, personalType, teeColour } from './runner-tee';
import type { ShirtColour } from '@/lib/runner-quiz/shirt-art';

export interface PrintDeps {
  /** SVG → PNG (renderPng at 4500 wide, the largest print area; Printify scales it down for XS-M). */
  render: (svg: string) => Promise<Buffer>;
  /** Uploads a PNG and returns its public URL. */
  upload: (key: string, png: Buffer) => Promise<string>;
  /** The logo image for backArt, for this shirt colour. */
  logo: (colour: ShirtColour) => string;
  /** The day the order was paid, printed on the back. */
  paidAt: Date;
}

export const printKey = (orderId: number, index: number, side: 'front' | 'back') => `quiz-shirts/${orderId}-${index}-${side}.png`;

/**
 * Printify line items for `lines` (the order's Printify lines). `items` is the whole order, so
 * each print file is named by its line's position in the order and a retry overwrites, never adds.
 */
export async function printifyLineItems(orderId: number, items: OrderLine[], lines: OrderLine[], d: PrintDeps): Promise<PrintifyLine[]> {
  const out: PrintifyLine[] = [];
  for (const l of lines) {
    if (!l.personal) {
      out.push({ product_id: l.supplierProductId, variant_id: Number(l.variantId), quantity: l.quantity });
      continue;
    }
    const index = items.indexOf(l);
    const type = personalType(l.personal);
    const second = rankTypes(l.personal.scores).find((t) => t.id !== type.id)!;
    const colour = teeColour(l.variantId);
    const front = await d.upload(printKey(orderId, index, 'front'), await d.render(frontArt(type, colour)));
    const back = await d.upload(
      printKey(orderId, index, 'back'),
      await d.render(backArt(type, second, l.personal.scores, d.paidAt, colour, d.logo(colour)))
    );
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
