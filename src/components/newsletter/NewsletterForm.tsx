'use client';

import { useState, FormEvent } from 'react';
import { cn } from '@/lib/utils';

interface NewsletterFormProps {
  variant?: 'inline' | 'stacked';
  theme?: 'light' | 'dark' | 'glass';
  heading?: string;
  description?: string;
  className?: string;
}

export default function NewsletterForm({
  variant = 'inline',
  theme = 'light',
  heading,
  description,
  className,
}: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Subscribed!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className={cn('text-center', className)}>
        {heading && (
          <h3
            className={cn(
              'font-display text-lg font-semibold mb-2',
              theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-foreground'
            )}
          >
            {heading}
          </h3>
        )}
        <p
          className={cn(
            'text-sm font-medium',
            theme === 'dark' || theme === 'glass' ? 'text-green-400' : 'text-green-600'
          )}
        >
          {message}
        </p>
      </div>
    );
  }

  const inputClasses = cn(
    'px-4 py-2.5 rounded-full text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors',
    theme === 'light' &&
      'bg-surface border border-border text-foreground placeholder:text-muted',
    theme === 'dark' &&
      'bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500',
    theme === 'glass' &&
      'bg-white/10 border border-white/15 text-white placeholder:text-zinc-500 backdrop-blur-sm',
    variant === 'stacked' ? 'w-full' : 'flex-1'
  );

  const buttonClasses = cn(
    'px-6 py-2.5 bg-brand text-white font-semibold rounded-full hover:bg-brand-hover transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed',
    variant === 'stacked' && 'w-full',
    theme === 'glass' && 'shadow-lg shadow-brand/20'
  );

  return (
    <div className={className}>
      {heading && (
        <h3
          className={cn(
            'font-display text-lg font-semibold mb-2',
            theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-foreground'
          )}
        >
          {heading}
        </h3>
      )}
      {description && (
        <p
          className={cn(
            'text-sm mb-4',
            theme === 'dark' ? 'text-zinc-400' : theme === 'glass' ? 'text-zinc-400' : 'text-secondary'
          )}
        >
          {description}
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        className={cn(
          variant === 'inline' ? 'flex gap-2' : 'space-y-3'
        )}
      >
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === 'error') setStatus('idle');
          }}
          className={inputClasses}
          disabled={status === 'loading'}
        />
        <button type="submit" className={buttonClasses} disabled={status === 'loading'}>
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {status === 'error' && message && (
        <p
          className={cn(
            'text-xs mt-2',
            theme === 'dark' || theme === 'glass' ? 'text-red-400' : 'text-red-600'
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
