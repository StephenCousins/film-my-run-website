/**
 * The personalised runner quiz shirt: the phrase for the buyer's type on the front, their
 * Runner DNA on the back. Same garment as Bonus Miles (Bella+Canvas 3001, Printify blueprint
 * 12, provider 72), so sizes, variant ids and prices come from that catalogue entry. The
 * print files are made after payment (see runner-tee-print.ts). Safe for client code.
 */
import { getShopItem, type ShopItem } from '@/lib/shop';
import { typeById, type QuizType, type Scores } from '@/lib/runner-quiz';
import { SHIRT_COLOURS, type ShirtColour } from '@/lib/runner-quiz/shirt-art';

export const RUNNER_TEE_SLUG = 'runner-type-tee';
export const RUNNER_TEE_BLUEPRINT = 12;
export const RUNNER_TEE_PROVIDER = 72;

/** What the buyer's quiz result puts on the shirt. The server builds every word from it. */
export interface Personal {
  type: string;
  scores: Scores;
}

const base = getShopItem('bonus-miles')!;
const colours = Object.keys(SHIRT_COLOURS) as ShirtColour[];
const variants = base.variants.filter((v) => colours.includes(v.colour as ShirtColour));
const prices = variants.map((v) => v.price);

export const runnerTee: ShopItem = {
  ...base,
  key: RUNNER_TEE_SLUG,
  slug: RUNNER_TEE_SLUG,
  name: 'Runner Type Tee',
  subtitle: 'Personalised with your Runner DNA',
  title: 'Runner Type Tee, personalised with your Runner DNA | Film My Run',
  description:
    'Your runner type phrase on the front. On the back, the Film My Run logo, your Runner DNA from the quiz and the date. Nobody else has quite the same shirt.',
  tags: [],
  colours: colours.filter((c) => variants.some((v) => v.colour === c)),
  variants,
  priceFrom: Math.min(...prices),
  priceTo: Math.max(...prices),
  images: [],
  etsyUrl: '',
  etsyListingId: '',
  // Only used for the Printify shipping quote: same garment and provider, so the same postage.
  printifyId: base.printifyId,
  supplier: 'printify',
};

/** A basket's `personal` as sent by the client → a valid Personal, or null. */
export function parsePersonal(p: unknown): Personal | null {
  if (!p || typeof p !== 'object') return null;
  const { type, scores } = p as { type?: unknown; scores?: unknown };
  if (typeof type !== 'string' || !typeById(type)) return null;
  if (!Array.isArray(scores) || scores.length !== 4 || !scores.every((v) => Number.isInteger(v) && v >= 0 && v <= 100)) return null;
  return { type, scores: [...scores] as Scores };
}

export const personalType = (p: Personal): QuizType => typeById(p.type)!;

/** The shirt colour behind a runner tee variant id. */
export function teeColour(variantId: number | string): ShirtColour {
  const v = variants.find((x) => String(x.id) === String(variantId));
  if (!v) throw new Error(`Not a runner tee variant: ${variantId}`);
  return v.colour as ShirtColour;
}
