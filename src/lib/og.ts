// Site-wide social share image (public/og-image.jpg, 1200x630).
// Regenerate with: node scripts/generate-og-image.mjs
// Relative URL: resolves against metadataBase (https://filmmyrun.com) in the root layout.
export const DEFAULT_OG_IMAGE = '/og-image.jpg';
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;
// Absolute form for JSON-LD, which is not resolved against metadataBase.
export const DEFAULT_OG_IMAGE_ABSOLUTE = 'https://filmmyrun.com/og-image.jpg';

// Use this for `openGraph.images`: a page's `openGraph` replaces the root layout's
// wholesale, so pass the dimensions and alt text along with the URL.
export const DEFAULT_OG_IMAGES = [
  {
    url: DEFAULT_OG_IMAGE,
    width: DEFAULT_OG_IMAGE_WIDTH,
    height: DEFAULT_OG_IMAGE_HEIGHT,
    alt: 'Film My Run',
  },
];
