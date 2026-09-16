/**
 * Shop catalogue. Generated from Printify by the film-my-run-merch project
 * (`npm run export-catalog` there) and committed as data/shop-catalog.json, so
 * the shop builds without any network access. Checkout happens on Etsy for now.
 */
import catalog from '../../data/shop-catalog.json';

export interface ShopImage {
  src: string;
  position: string;
}

export interface ShopItem {
  key: string;
  slug: string;
  name: string;
  subtitle: string;
  title: string;
  category: string;
  categoryLabel: string;
  productType: string;
  description: string;
  tags: string[];
  priceFrom: number;
  priceTo: number;
  currency: string;
  colours: string[];
  sizes: string[];
  images: ShopImage[];
  etsyUrl: string;
  etsyListingId: string;
  printifyId: string;
}

export interface ShopCategory {
  key: string;
  label: string;
  count: number;
}

interface Catalog {
  generatedAt: string;
  shop: { etsyUrl: string };
  categories: ShopCategory[];
  items: ShopItem[];
}

const data = catalog as Catalog;

export const shopItems: ShopItem[] = data.items;
export const shopCategories: ShopCategory[] = data.categories;
export const etsyShopUrl = data.shop.etsyUrl;

export const getShopItem = (slug: string) => shopItems.find((i) => i.slug === slug);

export function formatPrice(item: Pick<ShopItem, 'priceFrom' | 'priceTo'>) {
  const gbp = (n: number) => `£${n.toFixed(2)}`;
  return item.priceTo > item.priceFrom ? `From ${gbp(item.priceFrom)}` : gbp(item.priceFrom);
}

/** Etsy listing link with a source tag so sales from the site are traceable in Etsy stats. */
export const etsyLink = (url: string) =>
  `${url}${url.includes('?') ? '&' : '?'}utm_source=filmmyrun.com&utm_medium=shop`;

/** Swatch colours for the Printify colour names we sell. */
export const swatch: Record<string, string> = {
  White: '#f4f4f2',
  'Soft Pink': '#f2d7dc',
  Black: '#1a1a1a',
  'Dark Grey': '#3c3c3c',
  Charcoal: '#3c3c3c',
  Forest: '#1f3a2c',
  'Forest Green': '#1f3a2c',
  Navy: '#1d2438',
  'Navy Blue': '#1d2438',
  'Light Pink': '#f2d7dc',
  Orange: '#f88c00',
  Grey: '#9a9a9a',
};
