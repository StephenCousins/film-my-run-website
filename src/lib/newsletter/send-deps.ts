/** The live dependencies for sending an issue (server only). */
import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import type { SendDeps } from './send-issue';

export function liveSendDeps(): SendDeps | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const resend = new Resend(key);
  return {
    findIssue: (token) => prisma.newsletter_issues.findUnique({ where: { approve_token: token } }),
    claim: async (id) => (await prisma.newsletter_issues.updateMany({ where: { id, status: 'draft' }, data: { status: 'sending' } })).count === 1,
    release: async (id) => {
      await prisma.newsletter_issues.updateMany({ where: { id, status: 'sending' }, data: { status: 'draft' } });
    },
    markSent: async (id, count) => {
      await prisma.newsletter_issues.update({ where: { id }, data: { status: 'sent', recipient_count: count } });
    },
    subscribers: () => prisma.newsletter_subscribers.findMany({ where: { status: 'active' }, select: { email: true, token: true } }),
    sendBatch: async (emails) => {
      const { error } = await resend.batch.send(emails);
      if (error) throw new Error(error.message);
    },
    adminEmails: process.env.NEWSLETTER_ADMIN_EMAIL,
    from: process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>',
    baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.com',
  };
}

/** Who a send would go to right now, for the editor and the confirmation page. */
export async function liveRecipientCount(): Promise<number> {
  const active = await prisma.newsletter_subscribers.findMany({ where: { status: 'active' }, select: { email: true } });
  const admins = (process.env.NEWSLETTER_ADMIN_EMAIL ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  return active.length + admins.filter((a) => !active.some((s) => s.email === a)).length;
}
