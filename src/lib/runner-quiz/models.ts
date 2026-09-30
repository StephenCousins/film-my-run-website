/**
 * Printify model photos of each type's shirt on its default colour (with sample scores on the
 * back), 1200 px WebP on R2. A new set is one edit: bump the folder.
 */
export const MODELS_BASE = 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/quiz-shirts/models/v3';

/** Three model shots of the front, then the flat back. */
export const modelPhotos = (typeId: string): [string, string, string, string] => [
  `${MODELS_BASE}/${typeId}-1.webp`,
  `${MODELS_BASE}/${typeId}-2.webp`,
  `${MODELS_BASE}/${typeId}-3.webp`,
  `${MODELS_BASE}/${typeId}-back.webp`,
];
