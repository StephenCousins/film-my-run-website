/**
 * Printify model photos of each type's shirt in each of the five colours (the back with sample
 * scores), 1200 px WebP on R2. A new set is one edit: bump the folder.
 */
import { QUIZ } from './index';

export const MODELS_BASE = 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/quiz-shirts/models/v4';

/** "Dark Grey" → "dark-grey", as the files are named. */
const slug = (colour: string) => colour.toLowerCase().replace(/\s+/g, '-');

/**
 * Three model shots of the front, then the flat back, for `typeId` in `colour` (a SHIRT_COLOURS
 * name). Without a colour: the type's own default colour.
 */
export function modelPhotos(typeId: string, colour?: string): [string, string, string, string] {
  const c = slug(colour ?? QUIZ.types.find((t) => t.id === typeId)?.shirtColour ?? 'Black');
  return [
    `${MODELS_BASE}/${typeId}-${c}-1.webp`,
    `${MODELS_BASE}/${typeId}-${c}-2.webp`,
    `${MODELS_BASE}/${typeId}-${c}-3.webp`,
    `${MODELS_BASE}/${typeId}-${c}-back.webp`,
  ];
}

/**
 * The one model photo shown for a type in a grid: shot 1, 2 or 3 by the type's place in the
 * quiz content (not display order), in its default colour, so the three models alternate.
 */
export function chooserPhoto(typeId: string): string {
  const i = Math.max(0, QUIZ.types.findIndex((t) => t.id === typeId));
  return modelPhotos(typeId)[i % 3];
}
