/** Order emails via Resend. Plain text plus a minimal HTML twin, same as the contact form. */
import { Resend } from 'resend';
import { gbp, type OrderLine } from './orders';

const from = () => process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function send(to: string, subject: string, lines: string[]) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn('RESEND_API_KEY not set; skipping', subject); return; }
  const text = lines.join('\n');
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:20px;line-height:1.5">
    <div style="border-bottom:3px solid #f88c00;padding-bottom:12px;margin-bottom:20px;font-weight:700">Film My Run</div>
    ${lines.map((l) => (l ? `<p style="margin:0 0 8px">${esc(l)}</p>` : '<br>')).join('')}
  </div>`;
  await new Resend(key).emails.send({ from: from(), to, bcc: 'stephen@filmmyrun.com', subject, text, html });
}

const itemLines = (items: OrderLine[]) =>
  items.map((l) => `${l.quantity} × ${l.name}${l.variantLabel ? ` (${l.variantLabel})` : ''} — ${gbp(l.unitPence * l.quantity)}`);

export function orderConfirmation(to: string, orderId: number, items: OrderLine[], totalPence: number) {
  return send(to, `Your Film My Run order #${orderId}`, [
    `Thanks for your order. It's printed to order in the UK and usually dispatched in 2 to 5 working days.`,
    '',
    ...itemLines(items),
    '',
    `Total paid: ${gbp(totalPence)} (including postage)`,
    '',
    `You'll get another email with tracking when it ships. Reply to this one if anything's wrong.`,
    '',
    'Stephen',
  ]);
}

export function orderShipped(to: string, orderId: number, items: OrderLine[], carrier: string, tracking: string, url: string) {
  return send(to, `Your Film My Run order #${orderId} is on its way`, [
    `Your order has shipped${carrier ? ` with ${carrier}` : ''}.`,
    tracking ? `Tracking: ${tracking}` : '',
    url ? url : '',
    '',
    ...itemLines(items),
    '',
    'Stephen',
  ].filter((l, i, a) => l !== '' || a[i - 1] !== ''));
}
