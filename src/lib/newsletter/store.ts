/** The live newsletter store (server only). */
import { prisma } from '@/lib/db';
import type { NewsletterStore } from './consent';

const select = { email: true, status: true, token: true, basis: true, source: true, consented_at: true, unsubscribed_at: true } as const;

export const liveNewsletterStore: NewsletterStore = {
  // Case-insensitive: older rows were stored as typed, and "Bob@" who unsubscribed is "bob@".
  find: (email) => prisma.newsletter_subscribers.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select }),
  findByToken: (token) => prisma.newsletter_subscribers.findUnique({ where: { token }, select }),
  create: async (row) => {
    await prisma.newsletter_subscribers.create({ data: { ...row, subscribed_at: row.consented_at ?? new Date() } });
  },
  update: async (email, patch) => {
    await prisma.newsletter_subscribers.updateMany({ where: { email: { equals: email, mode: 'insensitive' } }, data: patch });
  },
};
