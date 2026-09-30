/** The live newsletter store (server only). */
import { prisma } from '@/lib/db';
import type { NewsletterStore } from './consent';

/** Prisma's unique-constraint error, P2002. */
export const isDuplicate = (e: unknown) => (e as { code?: string } | null)?.code === 'P2002';

const select = { email: true, status: true, token: true, basis: true, source: true, consented_at: true, unsubscribed_at: true } as const;

export const liveNewsletterStore: NewsletterStore = {
  // Case-insensitive: older rows were stored as typed, and "Bob@" who unsubscribed is "bob@".
  find: (email) => prisma.newsletter_subscribers.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select }),
  findByToken: (token) => prisma.newsletter_subscribers.findUnique({ where: { token }, select }),
  create: async (row) => {
    try {
      await prisma.newsletter_subscribers.create({ data: { ...row, subscribed_at: row.consented_at ?? new Date() } });
    } catch (e) {
      // Two requests for the same new address at once (a webhook retry, a double-click): the
      // other one created it, which is the outcome we wanted.
      if (isDuplicate(e)) return;
      throw e;
    }
  },
  update: async (email, patch) => {
    await prisma.newsletter_subscribers.updateMany({ where: { email: { equals: email, mode: 'insensitive' } }, data: patch });
  },
};
