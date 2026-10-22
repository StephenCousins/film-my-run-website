import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { chatAdminMetadata, isChatAdmin } from '@/lib/chat/admin';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Gated here as well as in the page: see chatAdminMetadata.
export async function generateMetadata(): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  return chatAdminMetadata(session, 'Site assistant: conversations');
}

/** What visitors asked the site assistant, newest conversation first, and what it cost. */
export default async function AssistantLogPage() {
  const session = await getServerSession(authOptions);
  if (!isChatAdmin(session)) notFound();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [rows, month] = await Promise.all([
    prisma.assistant_messages.findMany({ orderBy: { created_at: 'desc' }, take: 400 }),
    prisma.assistant_messages.aggregate({ _sum: { cost_usd: true }, where: { created_at: { gte: monthStart } } }),
  ]);

  const sessions = new Map<string, typeof rows>();
  for (const r of rows) sessions.set(r.session_id, [r, ...(sessions.get(r.session_id) ?? [])]);

  return (
    <main className="min-h-screen bg-background py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-2">Site assistant</p>
        <h1 className="font-display text-3xl font-semibold text-foreground">Conversations</h1>
        <p className="text-secondary mt-2 mb-8">
          {sessions.size} recent conversations. This month: ${(month._sum.cost_usd ?? 0).toFixed(3)}.
        </p>
        <div className="space-y-6">
          {[...sessions].map(([id, msgs]) => (
            <div key={id} className="card p-4 space-y-2 text-sm">
              <p className="text-xs text-muted">{msgs[0].created_at.toISOString().slice(0, 16).replace('T', ' ')} UTC</p>
              {msgs.map((m) => (
                <p key={m.id} className={m.role === 'user' ? 'font-semibold text-foreground' : 'text-secondary whitespace-pre-wrap'}>
                  {m.role === 'user' ? 'Q: ' : ''}
                  {m.text}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
