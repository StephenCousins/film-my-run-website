'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ShoeResult {
  id: number;
  brand: string;
  model: string;
  slug: string;
  terrain: string;
  category: string;
  imageUrl: string | null;
  avgScore: number | null;
  reviewCount: number;
}

interface ProgressStep {
  step: string;
  message: string;
  shoe?: ShoeResult;
  slug?: string;
  brand?: string;
  model?: string;
}

interface AddShoeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShoeAdded: () => void;
}

export default function AddShoeModal({ isOpen, onClose, onShoeAdded }: AddShoeModalProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>('idle');
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [result, setResult] = useState<ShoeResult | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const stepsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  const handleClose = () => {
    if (status === 'success') onShoeAdded();
    setQuery('');
    setStatus('idle');
    setSteps([]);
    setResult(null);
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || status === 'loading') return;

    setStatus('loading');
    setSteps([]);
    setResult(null);
    setError('');

    try {
      const res = await fetch('/api/shoes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Something went wrong' }));
        setError(data.error || `Error ${res.status}`);
        setStatus('error');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setError('No response stream'); setStatus('error'); return; }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const step = JSON.parse(line) as ProgressStep;
            setSteps(prev => {
              const last = prev[prev.length - 1];
              if (last && last.step === step.step && step.step !== 'complete' && step.step !== 'error' && step.step !== 'duplicate') {
                return [...prev.slice(0, -1), step];
              }
              return [...prev, step];
            });

            if (step.step === 'complete' && step.shoe) {
              setResult(step.shoe);
              setStatus('success');
            } else if (step.step === 'duplicate') {
              setStatus('duplicate');
            } else if (step.step === 'error') {
              setError(step.message);
              setStatus('error');
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch {
      setError('Network error — please try again');
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-md bg-white dark:bg-[#18181b] rounded-2xl border border-[#e4e4e7] dark:border-[#27272a] p-6 shadow-xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-[#a1a1aa] hover:text-[#18181b] dark:hover:text-[#fafafa] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="font-display text-lg font-bold text-[#18181b] dark:text-[#fafafa]">
            Suggest a Shoe
          </h2>
          <p className="text-sm text-[#71717a] mt-1">
            Enter a running shoe name and we&apos;ll add it with reviews and images.
          </p>
        </div>

        {status === 'idle' || status === 'error' ? (
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g., Hoka Tecton X3"
              className="w-full px-4 py-2.5 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#27272a] text-[#18181b] dark:text-[#fafafa] placeholder:text-[#a1a1aa] focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              maxLength={100}
            />
            {error && (
              <p className="mt-2 text-sm text-red-500 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={!query.trim()}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Shoe
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {step.step === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                ) : step.step === 'complete' || step.step === 'duplicate' ? (
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                ) : i === steps.length - 1 && status === 'loading' ? (
                  <Loader2 className="w-4 h-4 text-orange-500 mt-0.5 shrink-0 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-[#a1a1aa] mt-0.5 shrink-0" />
                )}
                <span className="text-sm text-[#52525b] dark:text-[#a1a1aa]">{step.message}</span>
              </div>
            ))}
            <div ref={stepsEndRef} />

            {status === 'success' && result && (
              <div className="mt-4 p-3 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] bg-[#f4f4f5] dark:bg-[#27272a]">
                <div className="flex items-center gap-3">
                  {result.imageUrl && (
                    <img
                      src={result.imageUrl}
                      alt={`${result.brand} ${result.model}`}
                      className="w-16 h-16 object-contain rounded-lg bg-white"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#18181b] dark:text-[#fafafa]">
                      {result.brand} {result.model}
                    </p>
                    <p className="text-xs text-[#71717a]">
                      {result.terrain} &middot; {(result.category ?? '').replace(/_/g, ' ')}
                      {result.avgScore !== null && ` · ${result.avgScore}/10`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {status === 'duplicate' && (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                This shoe already exists in the database.
              </p>
            )}

            {status !== 'loading' && steps.length > 0 && (
              <button
                onClick={handleClose}
                className="mt-3 w-full px-4 py-2.5 bg-[#f4f4f5] dark:bg-[#27272a] text-[#18181b] dark:text-[#fafafa] font-medium rounded-xl hover:bg-[#e4e4e7] dark:hover:bg-[#3f3f46] transition-colors text-sm"
              >
                {status === 'success' ? 'Done' : 'Close'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
