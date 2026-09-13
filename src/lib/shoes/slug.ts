export function shoeToSlug(brand: string, model: string): string {
  return `${brand}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function urlMatchesShoe(url: string, brand: string, model: string): boolean {
  const slug = `${brand}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
  return url.toLowerCase().includes(slug);
}
