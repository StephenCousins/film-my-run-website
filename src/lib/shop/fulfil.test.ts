import { describe, it, expect, vi } from 'vitest';
import { fulfilPaidSession, shippingOf, toPrintifyAddress, type FulfilDeps, type PaidOrder } from './fulfil';
import type { OrderLine } from './orders';
import { PrintifyDraftError, createOrder } from './printify';
import { orderFailedLines } from './email';

const addr = toPrintifyAddress('Jo Bloggs', 'jo@x.com', null, { line1: '1 St', city: 'Leeds', postal_code: 'LS1 1AA', country: 'GB' });

const pf = { supplier: 'printify' } as OrderLine;
const ct = { supplier: 'contrado' } as OrderLine;

function deps(order: PaidOrder | null): FulfilDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    load: async () => order,
    markPaid: async () => { calls.push('paid'); },
    place: async (supplier, lines) => { calls.push(`${supplier}:${lines.length}`); return supplier === 'printify' ? 'PF1' : 'CT1'; },
    markSubmitted: async (_id, ids) => { calls.push('submitted ' + JSON.stringify(ids)); },
    flagFailed: async (_id, e, ids, drafts) => { calls.push(`failed ${e.message} ${JSON.stringify(ids)} drafts ${JSON.stringify(drafts)}`); },
    alertNotSaved: async (_id, e, ids) => { calls.push(`not-saved ${e.message} ${JSON.stringify(ids)}`); },
    emailConfirmation: async () => { calls.push('email'); },
  };
}

describe('fulfilPaidSession', () => {
  it('places a pending order once, per supplier, in order', async () => {
    const d = deps({ id: 1, status: 'pending', items: [pf, ct, pf] });
    expect(await fulfilPaidSession('cs_1', 'jo@x.com', addr, d)).toBe('submitted');
    expect(d.calls).toEqual(['paid', 'printify:2', 'contrado:1', 'submitted {"printify":"PF1","contrado":"CT1"}', 'email']);
  });
  it('skips suppliers with nothing in the basket', async () => {
    const d = deps({ id: 1, status: 'pending', items: [ct] });
    await fulfilPaidSession('cs_1', 'jo@x.com', addr, d);
    expect(d.calls).toEqual(['paid', 'contrado:1', 'submitted {"contrado":"CT1"}', 'email']);
  });
  it('does nothing for a replayed webhook', async () => {
    const d = deps({ id: 1, status: 'submitted', items: [] });
    expect(await fulfilPaidSession('cs_1', 'jo@x.com', addr, d)).toBe('already-submitted');
    expect(d.calls).toEqual([]);
  });
  it('flags the order and keeps what was placed when a supplier fails', async () => {
    const d = deps({ id: 1, status: 'pending', items: [pf, ct] });
    d.place = async (supplier) => {
      if (supplier === 'contrado') throw new Error('Contrado down');
      d.calls.push('printify:1');
      return 'PF1';
    };
    await expect(fulfilPaidSession('cs_1', 'jo@x.com', addr, d)).rejects.toThrow('Contrado down');
    expect(d.calls).toEqual(['paid', 'printify:1', 'failed Contrado down {"printify":"PF1"} drafts {}']);
  });
  it('passes on a Printify draft, so nobody places it again blind', async () => {
    const d = deps({ id: 1, status: 'pending', items: [pf] });
    d.place = async () => { throw new PrintifyDraftError('PFD9', 'timeout'); };
    await expect(fulfilPaidSession('cs_1', 'jo@x.com', addr, d)).rejects.toThrow(/draft/);
    expect(d.calls[1]).toBe('failed Printify order PFD9 created as a draft, send to production failed: timeout {} drafts {"printify":"PFD9"}');
    const lines = orderFailedLines(1, 'x', {}, { printify: 'PFD9' });
    expect(lines.join('\n')).toContain('Created at Printify (draft) id PFD9, check before re-placing.');
    expect(lines.join('\n')).not.toContain('was not placed');
    expect(orderFailedLines(1, 'x', {}).join('\n')).toContain('was not placed');
  });
  it('a database failure after every supplier accepted is not a failed order', async () => {
    const d = deps({ id: 1, status: 'pending', items: [pf, ct] });
    d.markSubmitted = async () => { throw new Error('db down'); };
    expect(await fulfilPaidSession('cs_1', 'jo@x.com', addr, d)).toBe('submitted-not-saved');
    expect(d.calls).toEqual(['paid', 'printify:1', 'contrado:1', 'not-saved db down {"printify":"PF1","contrado":"CT1"}', 'email']);
  });
  it('ignores sessions it never created', async () => {
    const d = deps(null);
    expect(await fulfilPaidSession('cs_x', 'jo@x.com', addr, d)).toBe('unknown-session');
  });
  it('splits the name Printify-style', () => {
    expect(addr.first_name).toBe('Jo');
    expect(addr.last_name).toBe('Bloggs');
    expect(toPrintifyAddress('Cher', 'c@x.com', null, {}).last_name).toBe('');
    vi.restoreAllMocks();
  });
});

import { createHmac } from 'crypto';
import { verifyPrintifySignature } from './printify';
describe('verifyPrintifySignature', () => {
  const body = '{"type":"order:shipment:created"}';
  const good = `sha256=${createHmac('sha256', 's3cret').update(body).digest('hex')}`;
  it('accepts the right HMAC and rejects everything else', () => {
    expect(verifyPrintifySignature(body, good, 's3cret')).toBe(true);
    expect(verifyPrintifySignature(body + ' ', good, 's3cret')).toBe(false);
    expect(verifyPrintifySignature(body, null, 's3cret')).toBe(false);
    expect(verifyPrintifySignature(body, 'sha256=00', 's3cret')).toBe(false);
  });
});

describe('createOrder', () => {
  it('reports the draft id when send to production fails', async () => {
    vi.stubEnv('PRINTIFY_API_TOKEN', 't');
    vi.stubEnv('PRINTIFY_SHOP_ID', 's');
    const fetchMock = vi.fn(async (url: string) =>
      String(url).endsWith('/orders.json')
        ? new Response(JSON.stringify({ id: 'PFD1' }), { status: 200 })
        : new Response('nope', { status: 500 })
    );
    vi.stubGlobal('fetch', fetchMock);
    const err = await createOrder('1', [], addr).catch((e) => e);
    expect(err).toBeInstanceOf(PrintifyDraftError);
    expect(err.draftId).toBe('PFD1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});

describe('shippingOf', () => {
  const a = { name: 'Jo', address: { line1: '1 St', country: 'GB' } };
  it('reads the 2025+ webhook shape', () => expect(shippingOf({ collected_information: { shipping_details: a } })).toBe(a));
  it('reads the old shape', () => expect(shippingOf({ shipping_details: a })).toBe(a));
  it('null when neither', () => expect(shippingOf({})).toBeNull());
});
