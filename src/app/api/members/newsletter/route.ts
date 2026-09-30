/** A member's newsletter status and answer: the app's bearer token or the website's session. */
import { prisma } from '@/lib/db';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { currentMember } from '@/lib/members/current';
import { isSubscribed, subscribe, unsubscribe } from '@/lib/newsletter/consent';
import { handleGetNewsletter, handlePostNewsletter, type MemberNewsletterDeps } from '@/lib/newsletter/member';
import { liveNewsletterStore } from '@/lib/newsletter/store';

export const dynamic = 'force-dynamic';

const deps: MemberNewsletterDeps = {
  member: async (req) => (await currentMember(req)).member,
  isSubscribed: (email) => isSubscribed(liveNewsletterStore, email),
  askedAt: async (id) => (await prisma.users.findUnique({ where: { id }, select: { newsletter_asked_at: true } }))?.newsletter_asked_at ?? null,
  setAsked: async (id, at) => {
    await prisma.users.update({ where: { id }, data: { newsletter_asked_at: at } });
  },
  subscribe: (email) => subscribe(liveNewsletterStore, email, 'consent', 'prompt'),
  unsubscribe: (email) => unsubscribe(liveNewsletterStore, email),
};

export const GET = withAppApi((req) => handleGetNewsletter(req, deps), { limit: 60 });
export const POST = withAppApi((req) => handlePostNewsletter(req, deps), { limit: 20 });
