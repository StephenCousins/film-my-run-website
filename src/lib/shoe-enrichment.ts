// Re-export shim: the shoe enrichment code now lives in src/lib/shoes/.
// Kept only until the add and weekly-update routes are rewritten (Tasks 10-11).
export { shoeToSlug } from './shoes/slug';
export { webSearch } from './shoes/search';
export { fetchReviewsForShoe } from './shoes/reviews';
export { parseShoeSpecs as parseShoeQuery } from './shoes/specs';
// findImageForShoe is replaced in Task 8
