'use client';

import { useState } from 'react';
import { Loader2, CheckCircle, AlertCircle, Plus, Trash2, ExternalLink } from 'lucide-react';
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

export default function NewsletterEditForm({
  token,
  initialPayload,
  approveUrl,
}: {
  token: string;
  initialPayload: NewsletterPayload;
  approveUrl: string;
}) {
  const [payload, setPayload] = useState<NewsletterPayload>(initialPayload);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  function update<K extends keyof NewsletterPayload>(key: K, value: NewsletterPayload[K]) {
    setPayload((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    setStatus('saving');
    setErrorMessage('');

    // Strip empty optional string fields so they don't fail URL validation, and
    // drop sections whose required fields are blank rather than send invalid data.
    const clean = { ...payload };
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
    if (clean.news) {
      const filtered = clean.news.filter((n) => n.title.trim() && n.url.trim());
      if (filtered.length) clean.news = filtered;
      else delete clean.news;
    }
    for (const key of ['blogPost', 'videoOfTheWeek', 'fromTheArchives'] as const) {
      const section = clean[key];
      if (section && 'imageUrl' in section && !section.imageUrl?.trim()) {
        delete (section as { imageUrl?: string }).imageUrl;
      }
    }
    if (clean.news) {
      clean.news = clean.news.map((n) => (n.imageUrl?.trim() ? n : { ...n, imageUrl: undefined }));
    }

    try {
      const res = await fetch(`/api/newsletter/edit/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clean),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'Failed to save.');
      }
      setPreviewHtml(body.html);
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save.');
    }
  }

  return (
    <div className="space-y-6 pb-24">
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
          </div>
          <iframe srcDoc={previewHtml} className="w-full" style={{ height: '80vh', border: 0 }} title="Newsletter preview" />
        </div>
      )}

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            {status === 'saved' && (
              <span className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle className="w-4 h-4" /> Saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a href={approveUrl} className="btn-secondary text-sm">
              Approve &amp; Send <ExternalLink className="w-4 h-4" />
            </a>
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
