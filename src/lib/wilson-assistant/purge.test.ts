import { describe, it, expect, vi } from 'vitest';

const deleteMany = vi.hoisted(() => vi.fn().mockResolvedValue({ count: 7 }));
vi.mock('@/lib/db', () => ({ prisma: { assistant_messages: { deleteMany } } }));

import { purgeWilsonLog } from './purge';

describe('purgeWilsonLog', () => {
  it('deletes only wilson rows older than 90 days', async () => {
    const now = new Date('2027-01-01T00:00:00Z');
    expect(await purgeWilsonLog(now)).toBe(7);
    expect(deleteMany).toHaveBeenCalledWith({ where: { source: 'wilson', created_at: { lt: new Date('2026-10-03T00:00:00Z') } } });
  });
});
