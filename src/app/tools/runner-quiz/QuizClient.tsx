'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Play, RotateCcw, Share2, Shirt } from 'lucide-react';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { QUIZ, filmTitle, result as scoreQuiz, sharedType, upperName, type QuizType, type Scores } from '@/lib/runner-quiz';
import { frontArt, teeMock, SHIRT_COLOURS } from '@/lib/runner-quiz/shirt-art';
import '@/styles/runner-quiz-fonts.css';

type Phase = 'intro' | 'quiz' | 'checking' | 'result';
interface Outcome {
  type: QuizType;
  second?: QuizType;
  scores?: Scores; // absent when someone opens a shared link
}

const PREVIEW_COLOUR = 'Black' as const;

export default function QuizClient({ sharedResult }: { sharedResult?: string }) {
  const shared = useMemo(() => sharedType(sharedResult), [sharedResult]);
  const [phase, setPhase] = useState<Phase>(shared ? 'result' : 'intro');
  const [outcome, setOutcome] = useState<Outcome | null>(shared ? { type: shared } : null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [stats, setStats] = useState<{ total: number; types: { id: string; pct: number }[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const reduceMotion = useReducedMotion();
  const questionRef = useRef<HTMLHeadingElement>(null);
  const submittedRef = useRef(false);

  const idx = answers.length;
  const total = QUIZ.questions.length;
  const scrollTop = () => window.scrollTo({ top: 0 });

  const start = () => {
    submittedRef.current = false;
    setAnswers([]);
    setOutcome(null);
    setPhase('quiz');
    scrollTop();
  };

  const answer = (i: number) => {
    // A second tap during the exit animation, or on the last question, must not count twice.
    if (submittedRef.current || answers.length >= total) return;
    const next = [...answers, i];
    setAnswers(next);
    scrollTop();
    if (next.length < total) return;
    submittedRef.current = true;
    const r = scoreQuiz(next);
    setOutcome(r);
    setPhase('checking');
    fetch('/api/runner-quiz/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: r.type.id, scores: r.scores }),
    })
      .then(() => fetch('/api/runner-quiz/results'))
      .then((res) => (res.ok ? res.json() : null))
      .then(setStats)
      .catch(() => {});
  };

  // Move focus to each new question, so keyboard and screen reader users start at the top.
  useEffect(() => {
    if (phase === 'quiz') questionRef.current?.focus({ preventScroll: true });
  }, [phase, answers.length]);

  // A short "checking your splits" beat before the reveal.
  useEffect(() => {
    if (phase !== 'checking') return;
    const t = setTimeout(() => {
      setPhase('result');
      scrollTop();
    }, reduceMotion ? 400 : 1400);
    return () => clearTimeout(t);
  }, [phase, reduceMotion]);

  const fade = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10, pointerEvents: 'none' as const }, transition: { duration: 0.2 } };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 lg:pt-24">

        {phase === 'intro' && (
          <section className="relative py-24 lg:py-36 overflow-hidden">
            <div className="absolute inset-0">
              <Image
                src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/hero/hero-trail.jpg"
                alt=""
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[rgb(var(--color-background))]" />
            </div>
            <div className="container relative max-w-2xl">
              <p className="inline-flex px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6 text-orange-400 text-sm font-medium">
                Runner quiz
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[0.95]">
                What kind of runner are <span className="text-brand italic font-normal">you</span>?
              </h1>
              <p className="text-lg text-zinc-300 mb-10">
                Twelve situations, four answers each, about two minutes. Find out which of twelve runner types you are,
                and what your Runner DNA looks like.
              </p>
              <button onClick={start} className="btn-primary text-sm tracking-widest uppercase px-8">
                Start <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {phase === 'quiz' && idx < total && (
          <section className="py-8 lg:py-14">
            <div className="container-narrow">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted">
                  Question {idx + 1} of {total}
                </p>
                <button
                  onClick={() => (idx === 0 ? setPhase('intro') : setAnswers(answers.slice(0, -1)))}
                  className="btn-ghost text-xs uppercase tracking-widest"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              </div>
              <div
                className="h-1 bg-surface-secondary rounded-full mb-8 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={idx}
                aria-label="Quiz progress"
              >
                <div className="h-full bg-brand transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(idx / total) * 100}%` }} />
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={idx} {...fade}>
                  <h2 ref={questionRef} tabIndex={-1} className="font-display text-2xl sm:text-3xl font-bold leading-snug mb-8 outline-none">
                    {QUIZ.questions[idx].q}
                  </h2>
                  <div className="grid gap-3">
                    {QUIZ.questions[idx].answers.map((a, i) => (
                      <button
                        key={i}
                        onClick={() => answer(i)}
                        className="card text-left p-5 sm:p-6 text-base sm:text-lg font-medium [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:bg-brand/5 active:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors"
                      >
                        {a.text}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Stays mounted so screen readers hear each change. */}
        <p role="status" className="sr-only">
          {phase === 'quiz' ? `Question ${idx + 1} of ${total}` : phase === 'checking' ? 'Checking your splits' : phase === 'result' && outcome ? `You are a ${outcome.type.name}` : ''}
        </p>

        {phase === 'checking' && (
          <section className="py-32 text-center">
            <div className="w-10 h-10 mx-auto mb-6 rounded-full border-4 border-brand/20 border-t-brand animate-spin motion-reduce:animate-none" />
            <p className="font-display text-2xl font-bold">Checking your splits…</p>
          </section>
        )}

        {phase === 'result' && outcome && (
          <Result
            outcome={outcome}
            pct={stats?.total ? stats.types.find((t) => t.id === outcome.type.id)?.pct : undefined}
            copied={copied}
            onShare={async () => {
              const url = `${window.location.origin}/tools/runner-quiz?r=${outcome.type.id}`;
              const text = `I'm a ${outcome.type.name}. What kind of runner are you?`;
              if (navigator.share) {
                try {
                  await navigator.share({ title: outcome.type.name, text, url });
                } catch {
                  // Cancelled.
                }
                return;
              }
              await navigator.clipboard?.writeText(url).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            onRetake={start}
          />
        )}
      </main>
      <Footer />
    </>
  );
}

function Result({
  outcome: { type, second, scores },
  pct,
  copied,
  onShare,
  onRetake,
}: {
  outcome: Outcome;
  pct?: number;
  copied: boolean;
  onShare: () => void;
  onRetake: () => void;
}) {
  const preview = useMemo(() => teeMock(SHIRT_COLOURS[PREVIEW_COLOUR], frontArt(type, PREVIEW_COLOUR)), [type]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // Only after taking the quiz; a shared link opens normally.
    if (scores) headingRef.current?.focus({ preventScroll: true });
  }, [scores]);

  return (
    <section className="py-10 lg:py-16">
      <div className="container max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted mb-4">
          {scores ? 'Your runner type' : 'Someone shared their runner type'}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] uppercase mb-4 outline-none">
          {type.shirtLines.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </h1>
        <p className="flex items-center gap-3 font-mono text-sm tracking-[0.2em] text-secondary mb-10">
          <span className="inline-block w-8 h-1 rounded-full" style={{ backgroundColor: type.colour }} />
          {upperName(type.name)}
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {scores ? (
            <a
              href={`/shop/runner-type-tee?type=${type.id}&s=${scores.join('-')}`}
              className="group flex items-center gap-4 sm:gap-5 rounded-2xl bg-brand text-white p-4 sm:p-6 hover:bg-brand-hover transition-colors"
            >
              <div
                className="w-32 sm:w-40 flex-shrink-0 rounded-xl bg-white/90 p-1"
                aria-hidden
                dangerouslySetInnerHTML={{ __html: preview }}
              />
              <div>
                <p className="font-display text-xl sm:text-2xl font-bold leading-tight mb-1">Get the {type.name} shirt</p>
                <p className="text-sm text-white/85">Your phrase on the front, your Runner DNA on the back.</p>
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-bold uppercase tracking-widest">
                  <Shirt className="w-4 h-4" /> Design yours <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </div>
            </a>
          ) : (
            <button
              onClick={onRetake}
              className="flex flex-col justify-center text-left rounded-2xl bg-brand text-white p-6 hover:bg-brand-hover transition-colors"
            >
              <p className="font-display text-2xl font-bold leading-tight mb-1">What kind of runner are you?</p>
              <p className="text-sm text-white/85 mb-3">Twelve questions, two minutes. Then get your own shirt.</p>
              <p className="inline-flex items-center gap-1 text-sm font-bold uppercase tracking-widest">
                Take the quiz <ArrowRight className="w-4 h-4" />
              </p>
            </button>
          )}
          <a
            href={`https://youtu.be/${type.film.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 sm:gap-5 rounded-2xl card p-4 sm:p-6 hover:border-brand transition-colors"
          >
            <div className="relative w-36 sm:w-44 flex-shrink-0 aspect-video rounded-lg overflow-hidden bg-surface-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${type.film.id}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" loading="lazy" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-10 h-10 rounded-full bg-black/70 flex items-center justify-center">
                  <Play className="w-5 h-5 text-white fill-white" />
                </span>
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-brand mb-1">Watch</p>
              <p className="font-display text-lg sm:text-xl font-bold leading-tight line-clamp-3">{filmTitle(type.film.title)}</p>
            </div>
          </a>
        </div>

        {scores && (
          <div className="card p-6 sm:p-8 mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted mb-6">Your Runner DNA</p>
            <div className="grid gap-6">
              {QUIZ.axes.map((a, k) => (
                <div key={a.id}>
                  <div className="flex justify-between font-mono text-xs uppercase tracking-widest text-muted mb-2">
                    <span>{a.low}</span>
                    <span>{a.high}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1 h-1.5 rounded-full bg-surface-secondary">
                      <span
                        className="absolute top-1/2 w-5 h-5 -mt-2.5 -ml-2.5 rounded-full border-2 border-[rgb(var(--color-background))] shadow"
                        style={{ left: `${scores[k]}%`, backgroundColor: type.colour }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono font-bold">{scores[k]}</span>
                  </div>
                </div>
              ))}
            </div>
            {second && (
              <p className="mt-8 text-lg">
                With a streak of <strong className="font-semibold">{second.name}</strong>.
              </p>
            )}
            {pct !== undefined && (
              <p className="mt-2 text-sm text-muted">
                {pct}% of runners who have taken the quiz are {type.name}s.
              </p>
            )}
          </div>
        )}

        <p className="text-lg leading-relaxed mb-8 max-w-2xl">{type.profile}</p>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="card p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Tell-tale signs</p>
            <ul className="space-y-2">
              {type.traits.map((t) => (
                <li key={t} className="flex gap-2 text-sm text-secondary">
                  <span className="text-brand font-bold">&#x2022;</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4">
            <div className="card p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Runners like you</p>
              <p className="text-sm font-medium">{type.famous}</p>
            </div>
            <div className="card p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Your ideal race</p>
              <p className="text-sm font-medium">{type.race}</p>
            </div>
          </div>
        </div>

        <div className="border-l-4 pl-5 py-2 mb-10" style={{ borderColor: type.colour }}>
          <p className="font-display text-2xl font-bold italic">&ldquo;{type.mantra}&rdquo;</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={onShare} className="btn-secondary text-sm tracking-widest uppercase">
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied ? 'Link copied' : 'Share your result'}
          </button>
          <button onClick={onRetake} className="btn-ghost text-sm tracking-widest uppercase">
            <RotateCcw className="w-4 h-4" /> {scores ? 'Take it again' : 'Take the quiz'}
          </button>
        </div>
      </div>
    </section>
  );
}
