'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  Link2,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Cloud,
  Footprints,
  Camera,
  PenLine,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

// ---- Types ----------------------------------------------------------------

interface ActivitySummary {
  name: string;
  sportType: string;
  distanceKm: number;
  movingTimeSec: number;
  elevationGainM: number;
  startLocalIso: string;
  gearName: string | null;
  photoUrls: string[];
  hasDescription: boolean;
  athleteName: string;
}

interface Weather {
  tempC: number | null;
  feelsLikeC: number | null;
  windKph: number | null;
  description: string;
}

type Format = 'race-report' | 'blog' | 'instagram' | 'facebook';

const FORMATS: { value: Format; label: string }[] = [
  { value: 'race-report', label: 'Race report' },
  { value: 'blog', label: 'Blog post' },
  { value: 'instagram', label: 'Instagram caption' },
  { value: 'facebook', label: 'Facebook post' },
];

const QUESTIONS = [
  'How did it go — did you hit your goal, or did the day have other plans?',
  'What is the one moment you will remember — a high point or a low point?',
  'How did you feel out there, physically and mentally?',
  'Anything about the conditions, the terrain, or your fuelling worth a mention?',
  'Anyone or anything to give a shout-out to — crew, kit, a cause, the event?',
];

const ERROR_MESSAGES: Record<string, string> = {
  strava_not_configured: 'Strava sign-in isn’t configured yet. Please check back soon.',
  bad_activity: 'That doesn’t look like a Strava activity link. Paste the URL of one of your runs.',
  denied: 'Strava access was declined, so there’s nothing to read. Try again when you’re ready.',
  expired: 'That took too long and the request expired. Please start again.',
};

// ---- Helpers --------------------------------------------------------------

function fmtDistance(km: number) {
  return `${km.toFixed(2)} km`;
}
function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}
function fmtDate(iso: string) {
  return new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
function looksLikeStrava(input: string) {
  return /strava\.com\/activities\/\d+/i.test(input) || /^\d{6,}$/.test(input.trim());
}

// ---- Page -----------------------------------------------------------------

export default function RaceScriptPage() {
  const [url, setUrl] = useState('');
  const [connecting, setConnecting] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [paramError, setParamError] = useState('');

  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState('');

  const [format, setFormat] = useState<Format>('race-report');
  const [answers, setAnswers] = useState<string[]>(() => QUESTIONS.map(() => ''));

  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [genError, setGenError] = useState('');
  const [copied, setCopied] = useState(false);

  // Read ?session / ?error from the OAuth redirect (window, not useSearchParams,
  // to avoid a Suspense boundary requirement).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    const session = params.get('session');
    if (err) {
      setParamError(ERROR_MESSAGES[err] || 'Something went wrong reading that activity from Strava.');
    } else if (session) {
      setSessionId(session);
    }
  }, []);

  // Once we have a session, load the activity summary.
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    setLoadingActivity(true);
    fetch(`/api/racescript/activity?session=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json().then((b) => ({ ok: r.ok, b })))
      .then(({ ok, b }) => {
        if (!active) return;
        if (!ok) throw new Error(b.error || 'Could not load activity');
        setActivity(b.activity);
        setWeather(b.weather);
      })
      .catch((e) => active && setActivityError(e instanceof Error ? e.message : 'Could not load activity'))
      .finally(() => active && setLoadingActivity(false));
    return () => {
      active = false;
    };
  }, [sessionId]);

  function connect() {
    if (!looksLikeStrava(url)) return;
    setConnecting(true);
    window.location.href = `/api/racescript/authorize?activity=${encodeURIComponent(url.trim())}`;
  }

  async function generate() {
    if (!sessionId) return;
    setGenerating(true);
    setGenError('');
    setOutput('');
    try {
      const res = await fetch('/api/racescript/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          session: sessionId,
          format,
          answers: QUESTIONS.map((question, i) => ({ question, answer: answers[i] })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Generation failed');
      setOutput(body.text);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  function copyOutput() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const inReview = !!sessionId && !paramError;

  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="relative py-12 lg:py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-purple-500/10" />
          <div className="container relative">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-full mb-5">
                <FileText className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-500">RaceScript</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Turn your run into a <span className="text-orange-500">race report</span>
              </h1>
              <p className="text-lg text-secondary">
                Paste a Strava activity, answer a few quick questions, and RaceScript writes it up —
                using your real data, photos, gear and race-day weather. Pick a race report, blog
                post, or a social caption.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="container">
            <div className="max-w-2xl">
              {paramError && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-500">{paramError}</p>
                </div>
              )}

              {/* Step 1 — connect */}
              {!inReview && (
                <div className="bg-surface rounded-2xl border border-border p-6">
                  <label htmlFor="strava-url" className="block font-medium text-foreground mb-2">
                    Your Strava activity link
                  </label>
                  <div className="relative mb-3">
                    <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input
                      id="strava-url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.strava.com/activities/1234567890"
                      className="w-full pl-12 pr-4 py-3 bg-surface-tertiary border border-border rounded-full text-foreground placeholder:text-muted focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                  <button
                    onClick={connect}
                    disabled={connecting || !looksLikeStrava(url)}
                    className="w-full py-3 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    Connect Strava & continue
                  </button>
                  <p className="text-xs text-muted mt-3">
                    You’ll authorise read access on Strava so we can pull that one activity. We don’t
                    store your Strava login — the connection is used once and discarded.
                  </p>
                </div>
              )}

              {/* Step 2 — review + questions + generate */}
              {inReview && (
                <div className="space-y-6">
                  {loadingActivity && (
                    <div className="flex items-center gap-3 text-secondary">
                      <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                      Reading your activity from Strava…
                    </div>
                  )}

                  {activityError && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-500">{activityError}</p>
                    </div>
                  )}

                  {activity && (
                    <>
                      {/* Activity summary */}
                      <div className="bg-surface rounded-2xl border border-border p-6">
                        <h2 className="font-display text-xl font-bold text-foreground mb-1">
                          {activity.name}
                        </h2>
                        <p className="text-sm text-muted mb-4">{fmtDate(activity.startLocalIso)}</p>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <Stat label="Distance" value={fmtDistance(activity.distanceKm)} />
                          <Stat label="Time" value={fmtDuration(activity.movingTimeSec)} />
                          <Stat label="Climb" value={`${Math.round(activity.elevationGainM)} m`} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {activity.gearName && (
                            <Chip icon={<Footprints className="w-3.5 h-3.5" />} text={activity.gearName} />
                          )}
                          {weather && (
                            <Chip
                              icon={<Cloud className="w-3.5 h-3.5" />}
                              text={`${weather.description}${weather.tempC != null ? `, ${Math.round(weather.tempC)}°C` : ''}`}
                            />
                          )}
                          {activity.photoUrls.length > 0 && (
                            <Chip
                              icon={<Camera className="w-3.5 h-3.5" />}
                              text={`${activity.photoUrls.length} photo${activity.photoUrls.length === 1 ? '' : 's'}`}
                            />
                          )}
                          {activity.hasDescription && (
                            <Chip icon={<PenLine className="w-3.5 h-3.5" />} text="Your notes" />
                          )}
                        </div>
                        {activity.photoUrls.length > 0 && (
                          <div className="flex gap-2 mt-4 overflow-x-auto">
                            {activity.photoUrls.map((u) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={u}
                                src={u}
                                alt=""
                                loading="lazy"
                                className="h-20 w-20 object-cover rounded-lg flex-shrink-0"
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Format + questions */}
                      <div className="bg-surface rounded-2xl border border-border p-6 space-y-5">
                        <div>
                          <label htmlFor="rs-format" className="block font-medium text-foreground mb-2">
                            What do you want to write?
                          </label>
                          <select
                            id="rs-format"
                            value={format}
                            onChange={(e) => setFormat(e.target.value as Format)}
                            className="w-full px-4 py-3 bg-surface-tertiary border border-border rounded-lg text-foreground focus:outline-none focus:border-orange-500"
                          >
                            {FORMATS.map((f) => (
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-4">
                          <p className="text-sm text-muted">
                            A few questions (all optional) — this is the human bit the data can’t
                            capture.
                          </p>
                          {QUESTIONS.map((q, i) => (
                            <div key={i}>
                              <label className="block text-sm text-secondary mb-1">{q}</label>
                              <textarea
                                value={answers[i]}
                                onChange={(e) =>
                                  setAnswers((prev) => prev.map((a, j) => (j === i ? e.target.value : a)))
                                }
                                rows={2}
                                className="w-full px-3 py-2 bg-surface-tertiary border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:border-orange-500 resize-y"
                              />
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={generate}
                          disabled={generating}
                          className="w-full py-3 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {generating ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Writing…
                            </>
                          ) : output ? (
                            <>
                              <RefreshCw className="w-5 h-5" />
                              Rewrite
                            </>
                          ) : (
                            'Write it'
                          )}
                        </button>
                        {genError && <p className="text-sm text-red-500">{genError}</p>}
                      </div>

                      {/* Output */}
                      {output && (
                        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                          <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="font-display font-semibold text-foreground">
                              {FORMATS.find((f) => f.value === format)?.label}
                            </h3>
                            <button
                              onClick={copyOutput}
                              className="inline-flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600"
                            >
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              {copied ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <div className="p-5 whitespace-pre-wrap text-secondary leading-relaxed">
                            {output}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-lg font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs',
        'bg-orange-500/10 text-orange-600 dark:text-orange-400'
      )}
    >
      {icon}
      {text}
    </span>
  );
}
