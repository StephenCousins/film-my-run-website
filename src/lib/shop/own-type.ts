/**
 * Server only. The £3 own-type discount is once per member account (Stephen, 1 Oct 2026):
 * anyone can retake the quiz, so "your type" can't be checked, only counted. Guests never get it.
 */
import { prisma } from '@/lib/db';
import { isOwnTypeTee, type OrderLine } from './orders';

/** Orders that were paid for. A pending checkout doesn't use it up (abandoned ones would). */
const PAID = ['paid', 'submitted', 'shipped'];

/** Whether this account has already taken it. Orders from before 1 Oct carry no flag: every own-type tee then had the £3. */
export const usedOwnType = (orders: { items: unknown }[]) =>
  orders.some((o) => Array.isArray(o.items) && (o.items as OrderLine[]).some((l) => l.ownTypeOff || isOwnTypeTee(l)));

export async function ownTypeOffAvailable(userId: number | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const orders = await prisma.orders.findMany({ where: { user_id: userId, status: { in: PAID } }, select: { items: true } });
  return !usedOwnType(orders);
}
