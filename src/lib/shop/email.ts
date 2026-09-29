/** Order emails via Resend. Plain text plus a minimal HTML twin, same as the contact form. */
import { Resend } from 'resend';
import { gbp, type OrderLine } from './orders';

const from = () => process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function send(to: string, subject: string, lines: string[], images: Preview[] = []) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn('RESEND_API_KEY not set; skipping', subject); return; }
  const text = lines.join('\n');
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:20px;line-height:1.5">
    <div style="border-bottom:3px solid #f88c00;padding-bottom:12px;margin-bottom:20px;font-weight:700">Film My Run</div>
    ${lines.map((l) => (l ? `<p style="margin:0 0 8px">${esc(l)}</p>` : '<br>')).join('')}
    ${images.map((p) => `<img src="${esc(p.src)}" alt="The back of your shirt" width="280" style="display:block;margin:16px 0;max-width:100%;height:auto;background:${esc(p.background)};border-radius:8px">`).join('')}
  </div>`;
  const { error } = await new Resend(key).emails.send({ from: from(), to, bcc: 'stephen@filmmyrun.com', subject, text, html });
  if (error) throw new Error(error.message);
}

const itemLines = (items: OrderLine[]) =>
  items.map((l) => `${l.quantity} × ${l.name}${l.variantLabel ? ` (${l.variantLabel})` : ''} — ${gbp(l.unitPence * l.quantity)}`);

/** A transparent print file, shown on its shirt colour. */
export interface Preview {
  src: string;
  background: string;
}

/** `previews`: the back print of each Runner Type Tee in the order. */
export function orderConfirmation(to: string, orderId: number, items: OrderLine[], totalPence: number, previews: Preview[] = []) {
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
  ], previews);
}

type Ids = Record<string, string | undefined>;
const list = (ids: Ids) => Object.entries(ids).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ');

/** To the owner, when an order was paid but placing it with a supplier failed. */
export function orderFailed(orderId: number, error: string, placed: Ids, drafts: Ids = {}) {
  return send('stephen@filmmyrun.com', `Shop order #${orderId} needs you: fulfilment failed`, orderFailedLines(orderId, error, placed, drafts));
}

export function orderFailedLines(orderId: number, error: string, placed: Ids, drafts: Ids = {}) {
  const draftLines = Object.entries(drafts)
    .filter(([, v]) => v)
    .map(([k, v]) => `Created at ${k === 'printify' ? 'Printify' : k} (draft) id ${v}, check before re-placing.`);
  return [
    draftLines.length
      ? `Order #${orderId} is paid but not fully placed. It is marked 'failed' in the orders table.`
      : `Order #${orderId} is paid but was not placed. It is marked 'failed' in the orders table.`,
    '',
    `Error: ${error}`,
    `Placed: ${list(placed) || 'nothing'}`,
    ...draftLines,
  ];
}

/** To the owner, when every supplier took the order but saving that to the database failed. */
export function orderNotSaved(orderId: number, error: string, placed: Ids) {
  return send('stephen@filmmyrun.com', `Shop order #${orderId}: placed, but the database update failed`, [
    `Order #${orderId} is paid and placed, but the database update failed, so the row still says 'paid'. Do not place it again.`,
    '',
    `Placed: ${list(placed) || 'nothing'}`,
    `Error: ${error}`,
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
