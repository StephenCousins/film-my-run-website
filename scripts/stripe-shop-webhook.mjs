/**
 * Creates (or recreates) the Stripe webhook endpoint for the shop and stores its signing
 * secret on the Railway service. Run with the service's env so the key never leaves Railway:
 *
 *   railway run --service film-my-run-website node scripts/stripe-shop-webhook.mjs
 *
 * Prints account and endpoint ids only, never secrets.
 */
import Stripe from 'stripe';
import { execFileSync } from 'child_process';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error('STRIPE_SECRET_KEY missing from env');
const stripe = new Stripe(key, { apiVersion: '2023-10-16' });

const acct = await stripe.accounts.retrieve();
console.log(
  'account', acct.id, '|', acct.settings?.dashboard?.display_name,
  '|', key.startsWith('sk_live_') ? 'LIVE' : 'TEST',
  '| charges', acct.charges_enabled, '| payouts', acct.payouts_enabled,
);

const url = 'https://filmmyrun.com/api/shop/webhook/stripe';
const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.filter((w) => w.url === url);
for (const w of existing) {
  await stripe.webhookEndpoints.del(w.id);
  console.log('removed old endpoint', w.id);
}
const ep = await stripe.webhookEndpoints.create({
  url,
  enabled_events: ['checkout.session.completed'],
  description: 'filmmyrun.com shop',
});
execFileSync(
  'railway',
  ['variables', '--service', 'film-my-run-website', '--skip-deploys', '--set', `STRIPE_WEBHOOK_SECRET=${ep.secret}`],
  { stdio: 'ignore' },
);
console.log('endpoint', ep.id, ep.status, '→ STRIPE_WEBHOOK_SECRET set on Railway');
