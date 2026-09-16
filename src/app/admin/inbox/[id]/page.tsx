import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isChatAdmin } from '@/lib/chat/admin';
import { getThreadById } from '@/lib/chat/store';
import { replyToThread } from './actions';
import ReplyForm from './ReplyForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ask Stephen — Thread',
  robots: { index: false, follow: false },
};

export default async function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isChatAdmin(session)) notFound();

  const { id } = await params;
  const thread = await getThreadById(id);
  if (!thread) notFound();

  const reply = replyToThread.bind(null, thread.id);

  return (
    <main className="min-h-screen bg-background py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/inbox" className="text-sm text-secondary hover:text-brand">
            &larr; Inbox
          </Link>
          <h1 className="font-display text-2xl font-semibold text-foreground mt-2">{thread.name}</h1>
          <p className="text-secondary text-sm">{thread.email}</p>
        </div>

        <div className="space-y-4">
          {thread.messages.length === 0 && <p className="text-secondary">No messages yet.</p>}
          {thread.messages.map((m) => (
            <div key={m.id} className={`flex ${m.from === 'stephen' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  m.from === 'stephen'
                    ? 'bg-brand text-white'
                    : 'bg-surface border border-border text-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p className={`text-xs mt-1 ${m.from === 'stephen' ? 'text-white/70' : 'text-muted'}`}>
                  {new Date(m.createdAt).toLocaleString('en-GB')}
                </p>
              </div>
            </div>
          ))}
        </div>

        <ReplyForm action={reply} email={thread.email} />
      </div>
    </main>
  );
}
