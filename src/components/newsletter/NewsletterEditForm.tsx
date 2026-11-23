'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle, AlertCircle, Plus, Trash2, Send } from 'lucide-react';
import type { NewsletterPayload } from '@/lib/newsletter-template';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type NewsItem = NonNullable<NewsletterPayload['news']>[number];

function Field({
  label,
  value,
  onChange,
  placeholder,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        {label} {optional && <span className="text-muted">(optional)</span>}
      </label>
      <input
        type="text"
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <textarea
        className="input resize-none"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SectionCard({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <label className="flex items-center gap-3 mb-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-4 h-4 accent-brand"
        />
        <span className="font-display text-lg font-semibold text-foreground">{title}</span>
      </label>
      {enabled && <div className="space-y-4 pl-7">{children}</div>}
    </div>
  );
}

const emptyNewsItem: NewsItem = { title: '', url: '', source: '', description: '', imageUrl: '' };

/** Drops blank optional sections and fields, as the save route's schema wants. */
export function cleanPayload(payload: NewsletterPayload): NewsletterPayload {
  const clean = structuredClone(payload);
  if (clean.blogPost && !clean.blogPost.title.trim()) delete clean.blogPost;
  if (clean.videoOfTheWeek && !clean.videoOfTheWeek.title.trim()) delete clean.videoOfTheWeek;
  if (clean.appOfTheWeek && !clean.appOfTheWeek.name.trim()) delete clean.appOfTheWeek;
  if (clean.sessionOfTheWeek && !clean.sessionOfTheWeek.title.trim()) delete clean.sessionOfTheWeek;
  if (clean.trainingTip && !clean.trainingTip.text.trim()) delete clean.trainingTip;
  if (clean.scienceSection && !clean.scienceSection.text.trim()) delete clean.scienceSection;
  if (clean.nutritionTip && !clean.nutritionTip.text.trim()) delete clean.nutritionTip;
  if (clean.fromTheArchives && !clean.fromTheArchives.title.trim()) delete clean.fromTheArchives;
  if (clean.whatsNew && !clean.whatsNew.text.trim()) delete clean.whatsNew;
  if (clean.parkrun && !clean.parkrun.text.trim()) delete clean.parkrun;
  if (clean.promo && !clean.promo.title.trim()) delete clean.promo;
  if (clean.news) {
    const filtered = clean.news.filter((n) => n.title.trim() && n.url.trim());
    if (filtered.length) clean.news = filtered;
    else delete clean.news;
  }
  for (const key of ['blogPost', 'videoOfTheWeek', 'fromTheArchives', 'promo'] as const) {
    const section = clean[key];
    if (section && 'imageUrl' in section && !section.imageUrl?.trim()) {
      delete (section as { imageUrl?: string }).imageUrl;
    }
  }
  if (clean.news) {
    clean.news = clean.news.map((n) => (n.imageUrl?.trim() ? n : { ...n, imageUrl: undefined }));
  }
  return clean;
}

/** Autosave this long after typing stops. */
export const AUTOSAVE_MS = 1_500;
/** After a failed autosave, try again after these waits (the last one repeats). */
export const RETRY_MS = [5_000, 10_000, 20_000, 30_000];
const backupKey = (token: string) => `fmr-newsletter-draft:${token}`;

export default function NewsletterEditForm({
  token,
  initialPayload,
}: {
  token: string;
  initialPayload: NewsletterPayload;
  /** Unused: sending goes through the in-page confirmation now. Kept for callers. */
  approveUrl?: string;
}) {
  const [payload, setPayload] = useState<NewsletterPayload>(initialPayload);
  // The latest form, for saves that start after a timer or an event.
  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  const payloadJson = JSON.stringify(payload);
  // What the server holds, as JSON: anything different is unsaved. Kept in state too, so the
  // "Unsaved changes" / "Saved" line updates as soon as a quiet autosave lands.
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initialPayload));
  const savedRef = useRef(savedJson);
  const dirty = payloadJson !== savedJson;
  // Autosaves that have failed in a row (0 = fine). Drives the retry wait and the status line.
  const [autosaveFailures, setAutosaveFailures] = useState(0);
  // Saves run one at a time, in order, so an older copy can never land on the server after a newer one.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [restore, setRestore] = useState<NewsletterPayload | null>(null);
  const [confirm, setConfirm] = useState<{ recipients: number; warnings: string[] } | null>(null);
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [sendMessage, setSendMessage] = useState('');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewHeight, setPreviewHeight] = useState(800);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);

  function handlePreviewLoad() {
    const doc = previewFrameRef.current?.contentWindow?.document;
    if (doc) {
      setPreviewHeight(doc.documentElement.scrollHeight);
    }
  }

  function update<K extends keyof NewsletterPayload>(key: K, value: NewsletterPayload[K]) {
    setPayload((p) => ({ ...p, [key]: value }));
  }

  /**
   * Saves the latest form to the server. `quiet`: the autosave, which leaves the preview alone and
   * shows a failure only as a small note (it tries again by itself). `keepalive`: the tab is closing or
   * being hidden, so ask the browser to finish the request even if the page goes away.
   * Returns whether the server now holds the form as it was when this save started.
   */
  const save = useCallback(
    (quiet = false, keepalive = false): Promise<boolean> => {
      const run = async (): Promise<boolean> => {
        const snapshot = payloadRef.current;
        const snapJson = JSON.stringify(snapshot);
        if (quiet && snapJson === savedRef.current) return true; // nothing new to save
        if (!quiet) {
          setStatus('saving');
          setErrorMessage('');
        }
        try {
          const res = await fetch(`/api/newsletter/edit/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanPayload(snapshot)),
            ...(keepalive && { keepalive: true }),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || 'Failed to save.');
          savedRef.current = snapJson;
          setSavedJson(snapJson);
          setAutosaveFailures(0);
          // Only drop the browser copy if nothing has been typed since this save started.
          if (JSON.stringify(payloadRef.current) === snapJson) {
            try {
              localStorage.removeItem(backupKey(token));
            } catch {}
          }
          if (!quiet) setPreviewHtml(body.html);
          setStatus('saved');
          return true;
        } catch (err) {
          if (quiet) {
            setAutosaveFailures((n) => n + 1);
          } else {
            setStatus('error');
            setErrorMessage(err instanceof Error ? err.message : 'Failed to save.');
          }
          return false;
        }
      };
      const result = queueRef.current.then(run);
      queueRef.current = result;
      return result;
    },
    [token]
  );

  const handleSave = () => save(false);

  // A copy in this browser on every change, so nothing typed is ever lost with the tab.
  useEffect(() => {
    if (!dirty) return;
    try {
      localStorage.setItem(backupKey(token), JSON.stringify(payload));
    } catch {}
  }, [payload, dirty, token]);

  // Offer back a backup that differs from what the server has.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(backupKey(token));
      if (raw && raw !== savedRef.current) setRestore(JSON.parse(raw));
    } catch {}
  }, [token]);

  // Quiet autosave: shortly after typing stops, and again (waiting longer each time) if it fails.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!dirty) return;
    const wait = autosaveFailures === 0 ? AUTOSAVE_MS : RETRY_MS[Math.min(autosaveFailures, RETRY_MS.length) - 1];
    const t = setTimeout(() => void saveRef.current(true), wait);
    return () => clearTimeout(t);
  }, [dirty, payloadJson, savedJson, autosaveFailures]);

  // Save straight away when a field loses focus, or when the tab is hidden or closed.
  const flush = useCallback((keepalive = false) => {
    if (JSON.stringify(payloadRef.current) !== savedRef.current) void saveRef.current(true, keepalive);
  }, []);
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush(true);
    };
    const onPageHide = () => flush(true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flush]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  /** Save first; only if that worked, ask how many it will go to and confirm. */
  async function handleApprove() {
    setSendState('idle');
    setSendMessage('');
    if (!(await save(false))) return; // nothing is sent if the save fails
    try {
      const r = await fetch(`/api/newsletter/edit/${token}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not count subscribers.');
      setConfirm({ recipients: d.recipients, warnings: d.warnings ?? [] });
      // Show the refreshed preview while they decide.
      setTimeout(() => previewFrameRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e) {
      setSendState('error');
      setSendMessage((e as Error).message);
    }
  }

  async function handleSendNow() {
    setSendState('sending');
    try {
      const r = await fetch(`/api/newsletter/approve?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { Accept: 'application/json' } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error === 'already_sent' ? 'This newsletter was already sent.' : d.error || 'Sending failed.');
      setConfirm(null);
      setSendState('sent');
      setSendMessage(`Sent to ${d.sent} subscriber${d.sent === 1 ? '' : 's'}.`);
    } catch (e) {
      setSendState('error');
      setSendMessage((e as Error).message);
    }
  }

  return (
    <div className="space-y-6 pb-24" onBlur={() => flush()}>
      {restore && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-brand/10 border border-brand/30 rounded-xl text-sm">
          <span className="text-foreground">
            <strong>Restore your unsaved text?</strong> This browser has a newer version of this draft than the saved one.
          </span>
          <span className="flex gap-2 shrink-0">
            <button type="button" className="btn-primary text-sm py-2" onClick={() => { setPayload(restore); setRestore(null); }}>
              Restore
            </button>
            <button
              type="button"
              className="btn-ghost text-sm py-2"
              onClick={() => {
                setRestore(null);
                try { localStorage.removeItem(backupKey(token)); } catch {}
              }}
            >
              Discard
            </button>
          </span>
        </div>
      )}

      {sendState === 'sent' && (
        <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-600" role="status">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{sendMessage}</span>
        </div>
      )}
      {sendState === 'error' && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400" role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{sendMessage}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="card p-6">
        <Field label="Subject line" value={payload.subject} onChange={(v) => update('subject', v)} />
      </div>

      <div className="card p-6">
        <TextArea
          label="Your intro"
          value={payload.intro ?? ''}
          onChange={(v) => update('intro', v)}
          rows={5}
        />
      </div>

      <SectionCard
        title="Latest Post"
        enabled={!!payload.blogPost}
        onToggle={(on) => update('blogPost', on ? (payload.blogPost ?? { title: '', url: '', snippet: '', imageUrl: '' }) : undefined)}
      >
        <Field label="Title" value={payload.blogPost?.title ?? ''} onChange={(v) => update('blogPost', { ...payload.blogPost!, title: v })} />
        <Field label="URL" value={payload.blogPost?.url ?? ''} onChange={(v) => update('blogPost', { ...payload.blogPost!, url: v })} />
        <TextArea label="Snippet" value={payload.blogPost?.snippet ?? ''} onChange={(v) => update('blogPost', { ...payload.blogPost!, snippet: v })} rows={3} />
        <Field label="Image URL" value={payload.blogPost?.imageUrl ?? ''} onChange={(v) => update('blogPost', { ...payload.blogPost!, imageUrl: v })} optional />
      </SectionCard>

      <SectionCard
        title="Shop / Club / App plug"
        enabled={!!payload.promo}
        onToggle={(on) => update('promo', on ? (payload.promo ?? { kind: 'shop', label: '', title: '', text: '', url: '', cta: '', imageUrl: '' }) : undefined)}
      >
        <Field label="Small label" value={payload.promo?.label ?? ''} onChange={(v) => update('promo', { ...payload.promo!, label: v })} />
        <Field label="Headline" value={payload.promo?.title ?? ''} onChange={(v) => update('promo', { ...payload.promo!, title: v })} />
        <TextArea label="Text" value={payload.promo?.text ?? ''} onChange={(v) => update('promo', { ...payload.promo!, text: v })} rows={3} />
        <Field label="Link" value={payload.promo?.url ?? ''} onChange={(v) => update('promo', { ...payload.promo!, url: v })} />
        <Field label="Button text" value={payload.promo?.cta ?? ''} onChange={(v) => update('promo', { ...payload.promo!, cta: v })} />
        <Field label="Image URL" value={payload.promo?.imageUrl ?? ''} onChange={(v) => update('promo', { ...payload.promo!, imageUrl: v })} optional />
      </SectionCard>

      <SectionCard
        title="Video of the Week"
        enabled={!!payload.videoOfTheWeek}
        onToggle={(on) => update('videoOfTheWeek', on ? (payload.videoOfTheWeek ?? { title: '', url: '', description: '', thumbnailUrl: '' }) : undefined)}
      >
        <Field label="Title" value={payload.videoOfTheWeek?.title ?? ''} onChange={(v) => update('videoOfTheWeek', { ...payload.videoOfTheWeek!, title: v })} />
        <Field label="URL" value={payload.videoOfTheWeek?.url ?? ''} onChange={(v) => update('videoOfTheWeek', { ...payload.videoOfTheWeek!, url: v })} />
        <Field label="Description" value={payload.videoOfTheWeek?.description ?? ''} onChange={(v) => update('videoOfTheWeek', { ...payload.videoOfTheWeek!, description: v })} />
        <Field label="Thumbnail URL" value={payload.videoOfTheWeek?.thumbnailUrl ?? ''} onChange={(v) => update('videoOfTheWeek', { ...payload.videoOfTheWeek!, thumbnailUrl: v })} />
      </SectionCard>

      <SectionCard
        title="Trail & Ultra News"
        enabled={!!payload.news?.length}
        onToggle={(on) => update('news', on ? (payload.news?.length ? payload.news : [emptyNewsItem]) : undefined)}
      >
        {(payload.news ?? []).map((item, i) => (
          <div key={i} className="border border-border rounded-xl p-4 space-y-3 relative">
            <button
              type="button"
              onClick={() => update('news', (payload.news ?? []).filter((_, idx) => idx !== i))}
              className="absolute top-3 right-3 text-muted hover:text-red-500"
              aria-label="Remove story"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <Field
              label="Title"
              value={item.title}
              onChange={(v) => update('news', (payload.news ?? []).map((n, idx) => (idx === i ? { ...n, title: v } : n)))}
            />
            <Field
              label="URL"
              value={item.url}
              onChange={(v) => update('news', (payload.news ?? []).map((n, idx) => (idx === i ? { ...n, url: v } : n)))}
            />
            <Field
              label="Source"
              value={item.source}
              onChange={(v) => update('news', (payload.news ?? []).map((n, idx) => (idx === i ? { ...n, source: v } : n)))}
            />
            <Field
              label="Description"
              value={item.description ?? ''}
              onChange={(v) => update('news', (payload.news ?? []).map((n, idx) => (idx === i ? { ...n, description: v } : n)))}
              optional
            />
            <Field
              label="Image URL"
              value={item.imageUrl ?? ''}
              onChange={(v) => update('news', (payload.news ?? []).map((n, idx) => (idx === i ? { ...n, imageUrl: v } : n)))}
              optional
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => update('news', [...(payload.news ?? []), emptyNewsItem])}
          className="btn-secondary text-sm"
        >
          <Plus className="w-4 h-4" /> Add story
        </button>
      </SectionCard>

      <SectionCard
        title="parkrun"
        enabled={!!payload.parkrun}
        onToggle={(on) => update('parkrun', on ? (payload.parkrun ?? { text: '' }) : undefined)}
      >
        <TextArea label="This week's note" value={payload.parkrun?.text ?? ''} onChange={(v) => update('parkrun', { ...payload.parkrun!, text: v })} rows={3} />
        <div className="grid grid-cols-3 gap-4">
          <Field label="Total runs" value={payload.parkrun?.totalRuns?.toString() ?? ''} onChange={(v) => update('parkrun', { ...payload.parkrun!, totalRuns: v ? Number(v) : undefined })} optional />
          <Field label="Venues" value={payload.parkrun?.venues?.toString() ?? ''} onChange={(v) => update('parkrun', { ...payload.parkrun!, venues: v ? Number(v) : undefined })} optional />
          <Field label="Avg time" value={payload.parkrun?.avgTime ?? ''} onChange={(v) => update('parkrun', { ...payload.parkrun!, avgTime: v })} optional />
        </div>
      </SectionCard>

      <SectionCard
        title="App / Tool of the Week"
        enabled={!!payload.appOfTheWeek}
        onToggle={(on) => update('appOfTheWeek', on ? (payload.appOfTheWeek ?? { name: '', url: '', description: '' }) : undefined)}
      >
        <Field label="Name" value={payload.appOfTheWeek?.name ?? ''} onChange={(v) => update('appOfTheWeek', { ...payload.appOfTheWeek!, name: v })} />
        <Field label="URL" value={payload.appOfTheWeek?.url ?? ''} onChange={(v) => update('appOfTheWeek', { ...payload.appOfTheWeek!, url: v })} />
        <TextArea label="Description" value={payload.appOfTheWeek?.description ?? ''} onChange={(v) => update('appOfTheWeek', { ...payload.appOfTheWeek!, description: v })} rows={2} />
      </SectionCard>

      <SectionCard
        title="Session of the Week"
        enabled={!!payload.sessionOfTheWeek}
        onToggle={(on) => update('sessionOfTheWeek', on ? (payload.sessionOfTheWeek ?? { title: '', description: '' }) : undefined)}
      >
        <Field label="Title" value={payload.sessionOfTheWeek?.title ?? ''} onChange={(v) => update('sessionOfTheWeek', { ...payload.sessionOfTheWeek!, title: v })} />
        <TextArea label="Description" value={payload.sessionOfTheWeek?.description ?? ''} onChange={(v) => update('sessionOfTheWeek', { ...payload.sessionOfTheWeek!, description: v })} rows={2} />
      </SectionCard>

      {(['trainingTip', 'scienceSection', 'nutritionTip'] as const).map((key) => {
        const labels = { trainingTip: 'Training Tip', scienceSection: 'Science Says', nutritionTip: 'Nutrition' };
        const tip = payload[key];
        return (
          <SectionCard
            key={key}
            title={labels[key]}
            enabled={!!tip}
            onToggle={(on) => update(key, on ? (tip ?? { text: '', citation: '' }) : undefined)}
          >
            <TextArea label="Text" value={tip?.text ?? ''} onChange={(v) => update(key, { ...tip!, text: v })} rows={3} />
            <Field label="Citation" value={tip?.citation ?? ''} onChange={(v) => update(key, { ...tip!, citation: v })} optional />
          </SectionCard>
        );
      })}

      <SectionCard
        title="From the Archives"
        enabled={!!payload.fromTheArchives}
        onToggle={(on) => update('fromTheArchives', on ? (payload.fromTheArchives ?? { title: '', url: '', description: '', imageUrl: '' }) : undefined)}
      >
        <Field label="Title" value={payload.fromTheArchives?.title ?? ''} onChange={(v) => update('fromTheArchives', { ...payload.fromTheArchives!, title: v })} />
        <Field label="URL" value={payload.fromTheArchives?.url ?? ''} onChange={(v) => update('fromTheArchives', { ...payload.fromTheArchives!, url: v })} />
        <TextArea label="Description" value={payload.fromTheArchives?.description ?? ''} onChange={(v) => update('fromTheArchives', { ...payload.fromTheArchives!, description: v })} rows={2} />
        <Field label="Image URL" value={payload.fromTheArchives?.imageUrl ?? ''} onChange={(v) => update('fromTheArchives', { ...payload.fromTheArchives!, imageUrl: v })} optional />
      </SectionCard>

      <SectionCard
        title="What's New"
        enabled={!!payload.whatsNew}
        onToggle={(on) => update('whatsNew', on ? (payload.whatsNew ?? { text: '' }) : undefined)}
      >
        <TextArea label="Text" value={payload.whatsNew?.text ?? ''} onChange={(v) => update('whatsNew', { text: v })} rows={3} />
      </SectionCard>

      {previewHtml && (
        <div className="card overflow-hidden">
          <div className="px-6 py-3 border-b border-border">
            <span className="font-display text-lg font-semibold text-foreground">Preview</span>
            <span className="text-xs text-muted ml-2">(this is the full email, scroll the page to see it all)</span>
          </div>
          <iframe
            ref={previewFrameRef}
            srcDoc={previewHtml}
            onLoad={handlePreviewLoad}
            className="w-full"
            style={{ height: previewHeight, border: 0 }}
            title="Newsletter preview"
          />
        </div>
      )}

      {confirm && (
        // Anchored above the action bar, not over the page, so the refreshed preview stays in view.
        <div className="fixed bottom-24 left-0 right-0 z-[60] flex justify-center px-4" role="dialog" aria-modal="false" aria-labelledby="send-confirm-title">
          <div className="w-full max-w-md rounded-2xl bg-surface border border-brand p-6 shadow-2xl">
            <p id="send-confirm-title" className="font-display text-xl font-semibold text-foreground">
              Send this to {confirm.recipients} subscriber{confirm.recipients === 1 ? '' : 's'}?
            </p>
            <p className="text-sm text-secondary mt-2">It was just saved: the preview on this page is exactly what goes out.</p>
            {confirm.warnings.length > 0 && (
              <div className="mt-4 rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm text-foreground">
                <p className="font-semibold text-red-500">Check before sending</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  {confirm.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </div>
            )}
            <div className="mt-5 flex gap-3 justify-end">
              <button type="button" className="btn-ghost text-sm" onClick={() => setConfirm(null)} disabled={sendState === 'sending'}>
                Cancel
              </button>
              <button type="button" className="btn-primary text-sm" onClick={handleSendNow} disabled={sendState === 'sending'}>
                {sendState === 'sending' ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div aria-live="polite">
            {dirty ? (
              <span className="flex items-center gap-2 text-sm text-amber-500">
                <AlertCircle className="w-4 h-4" />
                {autosaveFailures > 0 ? 'Unsaved changes: couldn’t save, trying again' : 'Unsaved changes'}
              </span>
            ) : status === 'saved' ? (
              <span className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle className="w-4 h-4" /> Saved
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleApprove}
              disabled={status === 'saving' || sendState === 'sending' || sendState === 'sent'}
              className="btn-secondary text-sm disabled:opacity-60"
            >
              Approve &amp; Send <Send className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={status === 'saving'}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === 'saving' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Saving...
                </>
              ) : (
                'Save & Preview'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
