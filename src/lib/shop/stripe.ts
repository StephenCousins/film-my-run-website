import Stripe from 'stripe';

let client: Stripe | undefined;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return (client ??= new Stripe(key, { apiVersion: '2023-10-16' }));
}

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.com';
