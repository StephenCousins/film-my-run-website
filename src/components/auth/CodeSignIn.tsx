'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail } from 'lucide-react';

const MESSAGES: Record<string, string> = {
  wrong_code: "That code isn't right",
  expired: 'That code has expired, send a new one',
  too_many_codes: 'Too many tries, wait a few minutes',
  email_unavailable: "We couldn't send the code just now, try again in a minute",
  bad_email: 'That email address does not look right',
};

/** Email → six-digit code → NextAuth session, using the same routes as the app (spec §2.3). */
export default function CodeSignIn({ callbackUrl = '/' }: { callbackUrl?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = async (path: string, body: unknown) => {
    const res = await fetch(`/api/app/v1/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({ ok: false }))) as { ok: boolean; error?: string; token?: string };
    if (!res.ok || !data.ok) throw new Error(MESSAGES[data.error ?? ''] ?? 'Something went wrong. Please try again.');
    return data;
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await post('code', { email }); setStep('code'); setCode(''); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { token } = await post('verify', { email, code });
      const result = await signIn('code', { token, redirect: false });
      if (result?.error) throw new Error('Something went wrong. Please try again.');
      router.push(callbackUrl);
      router.refresh();
    } catch (err) { setError((err as Error).message); setBusy(false); }
  };

  const input = 'w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-surface-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-brand';
  const button = 'w-full py-3 rounded-lg bg-brand text-black font-semibold hover:bg-orange-400 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2';

  if (step === 'email') {
    return (
      <form onSubmit={sendCode} className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} aria-label="Email" />
        </div>
        <button type="submit" disabled={busy || !email} className={button}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          Email me a code
        </button>
        <p className="text-xs text-muted">No password needed. Members get 10% off in the shop.</p>
        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-3">
      <p className="text-sm text-secondary">We sent a six-digit code to <span className="text-foreground">{email}</span>.</p>
      <input inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="w-full px-4 py-3 rounded-lg border border-border bg-surface-secondary text-foreground font-mono text-2xl tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-brand" aria-label="Six-digit code" />
      <button type="submit" disabled={busy || code.length !== 6} className={button}>
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        Sign in
      </button>
      <div className="flex justify-between text-sm">
        <button type="button" onClick={() => { setStep('email'); setError(null); }} className="text-muted hover:text-foreground">Change email</button>
        <button type="button" onClick={(e) => sendCode(e as unknown as React.FormEvent)} disabled={busy} className="text-brand hover:underline">Send a new code</button>
      </div>
      {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
    </form>
  );
}
