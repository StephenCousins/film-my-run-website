import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ prisma: {} }));
import { usedOwnType } from './own-type';

const fell = { type: 'fell', scores: [1, 2, 3, 4] };

describe('usedOwnType', () => {
  it('counts a flagged line, and an own-type tee from before the flag existed', () => {
    expect(usedOwnType([{ items: [{ design: 'lab', ownTypeOff: true }] }])).toBe(true);
    expect(usedOwnType([{ items: [{ design: 'fell', personal: fell }] }])).toBe(true);
  });
  it('another type, a plain tee or other products leave it unused', () => {
    expect(usedOwnType([{ items: [{ design: 'lab', personal: fell }, { design: 'track' }, { slug: 'bonus-miles' }] }])).toBe(false);
    expect(usedOwnType([])).toBe(false);
  });
});
