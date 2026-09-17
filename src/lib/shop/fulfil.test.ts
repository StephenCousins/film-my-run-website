import { describe, it, expect, vi } from 'vitest';
import { fulfilPaidSession, toPrintifyAddress, type FulfilDeps, type PaidOrder } from './fulfil';
import type { OrderLine } from './orders';

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
