import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isChatAdmin } from '@/lib/chat/admin';
import { listThreads } from '@/lib/chat/store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ask Stephen — Inbox',
  robots: { index: false, follow: false },
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default async function ChatInboxPage() {
  const session = await getServerSession(authOptions);
  if (!isChatAdmin(session)) notFound();

  const threads = await listThreads();

  return (
    <main className="min-h-screen bg-background py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-2">Ask Stephen</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Inbox</h1>
          <p className="text-secondary mt-2">
            {threads.length === 0
              ? 'No conversations yet.'
              : `${threads.filter((t) => t.unanswered).length} unanswered of ${threads.length}.`}
          </p>
        </div>

        <div className="card divide-y divide-border">
          {threads.length === 0 && <p className="p-6 text-secondary">Nothing here yet.</p>}
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`/admin/inbox/${t.id}`}
              className="flex items-start justify-between gap-4 p-4 hover:bg-surface-secondary transition-colors"
            >
              <div className="min-w-0">
                <p className={`truncate ${t.unanswered ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                  {t.name} <span className="font-normal text-muted">&lt;{t.email}&gt;</span>
                </p>
                <p className="text-secondary text-sm truncate mt-1">{t.preview}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {t.unanswered && (
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand">Unanswered</span>
                )}
                <span className="text-xs text-muted">{relativeTime(t.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
