/**
 * The iOS app's catalogue: the same data the website's shop builds from, plus
 * the slugs the app's hero and Today card rotate through. Vests first: they
 * are the newest and the only cut-and-sew product.
 */
import { shopItems, shopCategories } from '@/lib/shop';
import catalog from '../../../data/shop-catalog.json';

export const FEATURED = ['running-vest-side-stripes', 'running-vest-shoulder-stripe'];

export function appShopCatalogue() {
  const featured = FEATURED.filter((slug) => shopItems.some((i) => i.slug === slug));
  return { generatedAt: (catalog as { generatedAt: string }).generatedAt, categories: shopCategories, items: shopItems, featured };
}
