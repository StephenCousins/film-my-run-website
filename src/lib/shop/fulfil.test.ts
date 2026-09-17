import { describe, it, expect, vi } from 'vitest';
import { fulfilPaidSession, toPrintifyAddress, type FulfilDeps, type PaidOrder } from './fulfil';

const addr = toPrintifyAddress('Jo Bloggs', 'jo@x.com', null, { line1: '1 St', city: 'Leeds', postal_code: 'LS1 1AA', country: 'GB' });

function deps(order: PaidOrder | null): FulfilDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    load: async () => order,
    markPaid: async () => { calls.push('paid'); },
    placeWithPrintify: async () => { calls.push('printify'); return 'PF1'; },
    markSubmitted: async () => { calls.push('submitted'); },
    emailConfirmation: async () => { calls.push('email'); },
  };
}

describe('fulfilPaidSession', () => {
  it('places a pending order once, in order', async () => {
    const d = deps({ id: 1, status: 'pending', items: [] });
    expect(await fulfilPaidSession('cs_1', 'jo@x.com', addr, d)).toBe('submitted');
    expect(d.calls).toEqual(['paid', 'printify', 'submitted', 'email']);
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
