'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';

/**
 * The "Ask about Film My Run" chat bubble (src/lib/assistant). Until ASSISTANT_PUBLIC is on, it only shows for
 * someone who has opened any page with ?assistant=1 in this browser, so Stephen can try it before visitors see it.
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: Message = {
  role: 'assistant',
  content: "Hi! I'm the Film My Run assistant. Ask me about Stephen's races, films, the tools on this site or his services.",
};
const STORE = 'fmr-assistant';

const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s)]+[^\s).,!?])/g;

/** Markdown links and bare URLs as anchors; everything else as plain text (bold markers dropped). */
function Rich({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    parts.push(text.slice(last, m.index));
    const href = m[2] ?? m[3];
    const internal = href.startsWith('https://filmmyrun.com');
    parts.push(
      <a key={m.index} href={href} className="text-brand underline" {...(internal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
        {m[1] ?? href}
      </a>,
    );
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts.map((p, i) => <Fragment key={i}>{typeof p === 'string' ? p.replace(/\*\*/g, '') : p}</Fragment>)}</>;
}

export default function SiteAssistant({ isPublic }: { isPublic: boolean }) {
  const [visible, setVisible] = useState(isPublic);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [sessionId, setSessionId] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (new URLSearchParams(location.search).get('assistant') === '1') localStorage.setItem(STORE, '1');
      if (localStorage.getItem(STORE) === '1') setVisible(true);
      const saved = JSON.parse(sessionStorage.getItem(STORE) ?? 'null');
      if (saved?.messages?.length) setMessages(saved.messages);
      setSessionId(saved?.sessionId ?? crypto.randomUUID());
    } catch {
      setSessionId(crypto.randomUUID());
    }
  }, []);

  useEffect(() => {
    try {
      if (sessionId) sessionStorage.setItem(STORE, JSON.stringify({ sessionId, messages }));
    } catch {}
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages, sessionId, open]);

  if (!visible) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The greeting is ours, not the model's: leave it out.
        body: JSON.stringify({ sessionId, messages: next.slice(1) }),
      });
      const data = await res.json().catch(() => ({}));
      setMessages([...next, { role: 'assistant', content: data.reply ?? data.error ?? 'Sorry, something went wrong.' }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Sorry, I couldn\'t connect. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed right-4 bottom-20 lg:bottom-6 z-50">
      {open ? (
        <div className="card shadow-2xl flex flex-col w-[calc(100vw-2rem)] max-w-sm h-[min(32rem,calc(100vh-8rem))]" role="dialog" aria-label="Film My Run assistant">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-display font-semibold text-foreground">Ask Film My Run</p>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
                <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${m.role === 'user' ? 'bg-brand text-white' : 'bg-surface-secondary text-foreground'}`}>
                  {m.role === 'user' ? m.content : <Rich text={m.content} />}
                </p>
              </div>
            ))}
            {busy && <p className="text-muted">Thinking…</p>}
            <div ref={end} />
          </div>
          <form onSubmit={send} className="flex gap-2 p-3 border-t border-border">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Ask a question"
              aria-label="Your question"
              className="input py-2 text-sm"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="btn-primary px-3 py-2 disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="px-3 pb-2 text-[11px] text-muted">An AI assistant. It can get things wrong; check anything important.</p>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} aria-label="Ask Film My Run" className="btn-primary rounded-full w-14 h-14 p-0 flex items-center justify-center shadow-lg">
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
