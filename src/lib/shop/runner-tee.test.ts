import { describe, it, expect, vi } from 'vitest';
import { buildOrderLines, type OrderLine } from './orders';
import { runnerTee, parsePersonal, teeColour, RUNNER_TEE_SLUG } from './runner-tee';
import { printifyLineItems, printKey, type PrintDeps } from './runner-tee-print';
import { fulfilPaidSession, toPrintifyAddress, type FulfilDeps, type PaidOrder } from './fulfil';
import type { PrintifyLine } from './printify';
import { cleanBasket } from './basket';

const personal = { type: 'fell', scores: [18, 29, 45, 64] as [number, number, number, number] };
const blackM = runnerTee.variants.find((v) => v.colour === 'Black' && v.size === 'M')!;
const whiteL = runnerTee.variants.find((v) => v.colour === 'White' && v.size === 'L')!;

describe('runner tee product', () => {
  it('offers the five quiz colours on the Bonus Miles garment, no Soft Pink', () => {
    expect(runnerTee.colours.sort()).toEqual(['Black', 'Dark Grey', 'Forest', 'Navy', 'White']);
    expect(runnerTee.variants.some((v) => v.colour === 'Soft Pink')).toBe(false);
    expect(runnerTee.priceFrom).toBe(29.99);
    expect(blackM.id).toBe(18101);
    expect(teeColour(18101)).toBe('Black');
    expect(() => teeColour(18467)).toThrow();
  });

  it('parsePersonal accepts a real type and four whole scores only', () => {
    expect(parsePersonal(personal)).toEqual(personal);
    for (const bad of [null, {}, { type: 'track', scores: [18, 29, 45, 64] }, { type: 'nope', scores: [1, 2, 3, 4] }, { type: 'fell', scores: [1, 2, 3] }, { type: 'fell', scores: [1, 2, 3, 101] }, { type: 'fell', scores: [1, 2, 3, 4.5] }, { type: 'fell', scores: '1-2-3-4' }])
      expect(parsePersonal(bad)).toBeNull();
  });
});

describe('cleanBasket', () => {
  it('drops runner tee lines whose quiz result no longer validates, keeps the rest', () => {
    const good = { slug: RUNNER_TEE_SLUG, variantId: 18101, quantity: 1, personal };
    const stale = { slug: RUNNER_TEE_SLUG, variantId: 18101, quantity: 1, personal: { type: 'track', scores: [18, 29, 45, 64] } };
    const missing = { slug: RUNNER_TEE_SLUG, variantId: 18101, quantity: 1 };
    const other = { slug: 'bonus-miles', variantId: 18100, quantity: 2 };
    expect(cleanBasket([good, stale, missing, other, null])).toEqual([good, other]);
    expect(cleanBasket('junk')).toEqual([]);
  });
});

describe('buildOrderLines with a runner tee', () => {
  it('carries the validated quiz result into the order line, priced from the catalogue', () => {
    const [line] = buildOrderLines([{ slug: RUNNER_TEE_SLUG, variantId: String(blackM.id), quantity: 1, personal, price: 1 } as never]);
    expect(line).toMatchObject({ slug: RUNNER_TEE_SLUG, name: 'Runner Type Tee: Fell Runner', variantLabel: 'Black / M', unitPence: 2999, supplier: 'printify', personal });
  });
  it('drops anything extra the client sends in personal', () => {
    const [line] = buildOrderLines([{ slug: RUNNER_TEE_SLUG, variantId: blackM.id, quantity: 1, personal: { ...personal, text: '<b>hi</b>' } as never }]);
    expect(line.personal).toEqual(personal);
  });
  it('rejects a runner tee without a valid result, and personal on anything else', () => {
    expect(() => buildOrderLines([{ slug: RUNNER_TEE_SLUG, variantId: blackM.id, quantity: 1 }])).toThrow(/quiz result/);
    expect(() => buildOrderLines([{ slug: RUNNER_TEE_SLUG, variantId: blackM.id, quantity: 1, personal: { type: 'fell', scores: [1, 2, 3, 999] } as never }])).toThrow(/quiz result/);
    // Scores that point at another type are refused, as in the results API.
    expect(() => buildOrderLines([{ slug: RUNNER_TEE_SLUG, variantId: blackM.id, quantity: 1, personal: { type: 'track', scores: [18, 29, 45, 64] } }])).toThrow(/quiz result/);
    expect(() => buildOrderLines([{ slug: 'bonus-miles', variantId: blackM.id, quantity: 1, personal }])).toThrow(/personalised/);
    expect(() => buildOrderLines([{ slug: RUNNER_TEE_SLUG, variantId: 18467, quantity: 1, personal }])).toThrow(/Unknown/);
  });
});

function printDeps() {
  const uploads: string[] = [];
  const d: PrintDeps = {
    render: vi.fn(async (svg: string, _width: number) => Buffer.from(svg.slice(0, 20))),
    upload: vi.fn(async (key: string) => {
      uploads.push(key);
      return `https://r2.example/${key}`;
    }),
    logo: () => 'data:logo',
    paidAt: new Date('2026-10-01T10:00:00Z'),
  };
  return { d, uploads };
}

describe('printifyLineItems', () => {
  it('puts a normal tee and a runner tee in one Printify order', async () => {
    const items = buildOrderLines([
      { slug: 'bonus-miles', variantId: 18100, quantity: 2 },
      { slug: RUNNER_TEE_SLUG, variantId: whiteL.id, quantity: 1, personal },
    ]);
    const { d, uploads } = printDeps();
    const out = await printifyLineItems(42, items, items, d);
    expect(out).toEqual<PrintifyLine[]>([
      { product_id: runnerTee.printifyId, variant_id: 18100, quantity: 2 },
      {
        blueprint_id: 12,
        print_provider_id: 72,
        variant_id: Number(whiteL.id),
        quantity: 1,
        print_areas: { front: 'https://r2.example/quiz-shirts/42-1-front.png', back: 'https://r2.example/quiz-shirts/42-1-back.png' },
      },
    ]);
    expect(uploads).toEqual([printKey(42, 1, 'front'), printKey(42, 1, 'back'), printKey(42, 1, 'preview')]);
    // Print files at 4500, the email preview at 800 on the shirt colour.
    const calls = (d.render as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.map((c) => c[1])).toEqual([4500, 4500, 800]);
    expect(calls[2][0]).toContain('fill="#f1f0ec"');
    // The back carries the paid date and the buyer's scores, in dark ink on the White shirt.
    const backSvg = (d.render as ReturnType<typeof vi.fn>).mock.calls[1][0] as string;
    expect(backSvg).toContain('01.10.2026');
    expect(backSvg).toContain('>64<');
    expect(backSvg).toContain('#18181b');
  });
});

describe('fulfilment with a runner tee', () => {
  const addr = toPrintifyAddress('Jo Bloggs', 'jo@x.com', null, { line1: '1 St', city: 'Leeds', postal_code: 'LS1 1AA', country: 'GB' });

  it('renders, uploads and orders once; a replayed webhook does nothing', async () => {
    const items: OrderLine[] = buildOrderLines([
      { slug: 'bonus-miles', variantId: 18100, quantity: 1 },
      { slug: RUNNER_TEE_SLUG, variantId: blackM.id, quantity: 1, personal },
    ]);
    const order: PaidOrder = { id: 7, status: 'pending', items };
    const { d: print, uploads } = printDeps();
    const createOrder = vi.fn(async (_id: string, _lines: PrintifyLine[]) => 'PF7');
    const deps: FulfilDeps = {
      load: async () => order,
      markPaid: async () => {
        order.status = 'paid';
      },
      place: async (_s, lines, o) => createOrder(String(o.id), await printifyLineItems(o.id, o.items, lines, print)),
      markSubmitted: async () => {
        order.status = 'submitted';
      },
      flagFailed: async () => {
        order.status = 'failed';
      },
      alertNotSaved: async () => {},
      emailConfirmation: async () => {},
    };
    expect(await fulfilPaidSession('cs_7', 'jo@x.com', addr, deps)).toBe('submitted');
    expect(await fulfilPaidSession('cs_7', 'jo@x.com', addr, deps)).toBe('already-submitted');
    expect(createOrder).toHaveBeenCalledTimes(1);
    expect(uploads).toEqual(['quiz-shirts/7-1-front.png', 'quiz-shirts/7-1-back.png', 'quiz-shirts/7-1-preview.png']);
    expect(createOrder.mock.calls[0][1]).toHaveLength(2);
  });

  it('a failed upload flags the order instead of dropping it, and a retry does not re-order', async () => {
    const items = buildOrderLines([{ slug: RUNNER_TEE_SLUG, variantId: blackM.id, quantity: 1, personal }]);
    const order: PaidOrder = { id: 8, status: 'pending', items };
    const { d: print } = printDeps();
    print.upload = async () => {
      throw new Error('R2 down');
    };
    const createOrder = vi.fn(async (_id: string, _lines: PrintifyLine[]) => 'PF8');
    const flagged: string[] = [];
    const deps: FulfilDeps = {
      load: async () => order,
      markPaid: async () => {
        order.status = 'paid';
      },
      place: async (_s, lines, o) => createOrder(String(o.id), await printifyLineItems(o.id, o.items, lines, print)),
      markSubmitted: async () => {
        order.status = 'submitted';
      },
      flagFailed: async (_id, e) => {
        order.status = 'failed';
        flagged.push(e.message);
      },
      alertNotSaved: async () => {},
      emailConfirmation: async () => {},
    };
    await expect(fulfilPaidSession('cs_8', 'jo@x.com', addr, deps)).rejects.toThrow('R2 down');
    expect(flagged).toEqual(['R2 down']);
    expect(await fulfilPaidSession('cs_8', 'jo@x.com', addr, deps)).toBe('already-failed');
    expect(createOrder).not.toHaveBeenCalled();
  });
});
