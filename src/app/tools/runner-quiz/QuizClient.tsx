'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Play, RotateCcw, Share2, Shirt } from 'lucide-react';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { QUIZ, filmTitle, result as scoreQuiz, sharedType, upperName, type QuizPhoto, type QuizType, type Scores } from '@/lib/runner-quiz';
import { modelPhotos } from '@/lib/runner-quiz/models';
import { saveResult } from '@/lib/runner-quiz/stored';
import '@/styles/runner-quiz-fonts.css';

type Phase = 'intro' | 'quiz' | 'checking' | 'result';
interface Outcome {
  type: QuizType;
  second?: QuizType;
  scores?: Scores; // absent when someone opens a shared link
}

/**
 * The whole quiz happens over one full-bleed photo that changes with each question: the
 * intro, every question, the checking beat and the top of the result. Photos are the
 * site's own (R2), crossfaded; with reduced motion they swap without the fade.
 */
function HeroPhoto({ photo, next }: { photo: QuizPhoto; next?: QuizPhoto }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="absolute inset-0 overflow-hidden bg-zinc-950" aria-hidden>
      <AnimatePresence initial={false}>
        <motion.div
          key={photo.image}
          className="absolute inset-0"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: { duration: 0.6, delay: 0.1 } }}
          transition={{ duration: reduceMotion ? 0 : 0.6 }}
        >
          <Image src={photo.image} alt="" fill priority sizes="100vw" className="object-cover" style={{ objectPosition: photo.focus ?? '50% 50%' }} />
        </motion.div>
      </AnimatePresence>
      {/* Preload the next photo so the crossfade never waits on the network. */}
      {next && <Image src={next.image} alt="" fill sizes="100vw" className="object-cover opacity-0" />}
      {/* Legibility: darker at the bottom and the left, where the text sits. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent" />
    </div>
  );
}

const Hero = ({ photo, next, children }: { photo: QuizPhoto; next?: QuizPhoto; children: ReactNode }) => (
  <section className="relative isolate flex items-center min-h-[calc(100svh-5rem)] lg:min-h-[85vh] py-10 lg:py-16 text-white">
    <HeroPhoto photo={photo} next={next} />
    <div className="container relative w-full">{children}</div>
  </section>
);

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
    // So the shop can offer your type's shirt at £3 off and put your DNA on any of them.
    saveResult(r.type.id, r.scores);
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

  // The photo behind whatever is showing, and the one to preload.
  const lastQuestion = QUIZ.questions[Math.min(idx, total - 1)];
  const photo: QuizPhoto =
    phase === 'intro' ? QUIZ.intro : phase === 'quiz' ? lastQuestion : phase === 'checking' ? QUIZ.questions[total - 1] : outcome!.type;
  const next: QuizPhoto | undefined =
    phase === 'intro' ? QUIZ.questions[0] : phase === 'quiz' && idx < total - 1 ? QUIZ.questions[idx + 1] : phase === 'checking' ? outcome?.type : undefined;

  const onShare = async () => {
    if (!outcome) return;
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
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 lg:pt-24">
        <Hero photo={photo} next={next}>
          {phase === 'intro' && (
            <div className="max-w-2xl">
              <p className="inline-flex px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/40 mb-6 text-orange-300 text-sm font-medium">
                Runner quiz
              </p>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-[0.95] [text-shadow:0_2px_24px_rgba(0,0,0,.45)]">
                What kind of runner are <span className="text-brand italic font-normal">you</span>?
              </h1>
              <p className="text-lg sm:text-xl text-zinc-100 mb-10 [text-shadow:0_1px_12px_rgba(0,0,0,.6)]">
                12 questions. 2 minutes. Then get your own shirt.
              </p>
              <button onClick={start} className="btn-primary text-base tracking-widest uppercase px-10 py-4">
                Start <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {phase === 'quiz' && idx < total && (
            <div className="max-w-2xl rounded-3xl bg-black/50 backdrop-blur-md border border-white/15 p-5 sm:p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-300">
                  Question {idx + 1} of {total}
                </p>
                <button
                  onClick={() => (idx === 0 ? setPhase('intro') : setAnswers(answers.slice(0, -1)))}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-300 hover:text-white px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              </div>
              <div
                className="h-1 bg-white/20 rounded-full mb-6 sm:mb-8 overflow-hidden"
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
                  <h2 ref={questionRef} tabIndex={-1} className="font-display text-2xl sm:text-3xl font-bold leading-snug mb-6 sm:mb-8 outline-none">
                    {QUIZ.questions[idx].q}
                  </h2>
                  <div className="grid gap-3">
                    {QUIZ.questions[idx].answers.map((a, i) => (
                      <button
                        key={i}
                        onClick={() => answer(i)}
                        className="text-left rounded-2xl border border-white/20 bg-white/10 p-4 sm:p-5 text-base sm:text-lg font-medium [@media(hover:hover)]:hover:bg-white/20 [@media(hover:hover)]:hover:border-brand active:border-brand active:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors"
                      >
                        {a.text}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {phase === 'checking' && (
            <div className="max-w-2xl rounded-3xl bg-black/50 backdrop-blur-md border border-white/15 p-10 text-center">
              <div className="w-10 h-10 mx-auto mb-6 rounded-full border-4 border-brand/30 border-t-brand animate-spin motion-reduce:animate-none" />
              <p className="font-display text-2xl sm:text-3xl font-bold">Checking your splits…</p>
            </div>
          )}

          {phase === 'result' && outcome && <ResultHero outcome={outcome} onRetake={start} />}
        </Hero>

        {/* Stays mounted so screen readers hear each change. */}
        <p role="status" className="sr-only">
          {phase === 'quiz' ? `Question ${idx + 1} of ${total}` : phase === 'checking' ? 'Checking your splits' : phase === 'result' && outcome ? `You are a ${outcome.type.name}` : ''}
        </p>

        {phase === 'result' && outcome && (
          <ResultDetails
            outcome={outcome}
            pct={stats?.total ? stats.types.find((t) => t.id === outcome.type.id)?.pct : undefined}
            copied={copied}
            onShare={onShare}
            onRetake={start}
          />
        )}
      </main>
      <Footer />
    </>
  );
}

/** The top of the result, over the type's photo: the phrase, the name and the two calls to action. */
function ResultHero({ outcome: { type, scores }, onRetake }: { outcome: Outcome; onRetake: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // Only after taking the quiz; a shared link opens normally.
    if (scores) headingRef.current?.focus({ preventScroll: true });
  }, [scores]);

  return (
    <div className="max-w-5xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300 mb-4">
        {scores ? 'Your runner type' : 'Someone shared their runner type'}
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] uppercase mb-4 outline-none [text-shadow:0_2px_24px_rgba(0,0,0,.5)]"
      >
        {type.shirtLines.map((l) => (
          <span key={l} className="block">
            {l}
          </span>
        ))}
      </h1>
      <p className="flex items-center gap-3 font-mono text-sm tracking-[0.2em] text-zinc-200 mb-8 sm:mb-10">
        <span className="inline-block w-8 h-1 rounded-full" style={{ backgroundColor: type.colour }} />
        {upperName(type.name)}
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {scores ? (
          <a
            href={`/shop/runner-type-tee?design=${type.id}&type=${type.id}&s=${scores.join('-')}`}
            className="group flex items-center gap-4 sm:gap-5 rounded-2xl bg-brand text-white p-4 sm:p-6 shadow-2xl hover:bg-brand-hover transition-colors"
          >
            <div className="relative w-28 sm:w-36 aspect-square flex-shrink-0 rounded-xl bg-white overflow-hidden">
              {/* Zoomed to the chest so the phrase reads at thumbnail size. */}
              <Image src={modelPhotos(type.id)[0]} alt="" fill sizes="288px" className="object-cover scale-[1.9] origin-[50%_42%]" />
            </div>
            <div>
              <p className="font-display text-xl sm:text-2xl font-bold leading-tight mb-1">Get the {type.name} shirt</p>
              <p className="text-sm text-white/90">Your phrase on the front, your Runner DNA on the back. £3 off, as it<p className="text-sm text-white/90">Your phrase on the front, your Runner DNA on the back.</p>apos;s your type.</p>
              <p className="mt-3 inline-flex items-center gap-1 text-sm font-bold uppercase tracking-widest">
                <Shirt className="w-4 h-4" /> Design yours <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </a>
        ) : (
          <button
            onClick={onRetake}
            className="flex flex-col justify-center text-left rounded-2xl bg-brand text-white p-6 shadow-2xl hover:bg-brand-hover transition-colors"
          >
            <p className="font-display text-2xl font-bold leading-tight mb-1">What kind of runner are you?</p>
            <p className="text-sm text-white/90 mb-3">Twelve questions, two minutes. Then get your own shirt.</p>
            <p className="inline-flex items-center gap-1 text-sm font-bold uppercase tracking-widest">
              Take the quiz <ArrowRight className="w-4 h-4" />
            </p>
          </button>
        )}
        <a
          href={`https://youtu.be/${type.film.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 sm:gap-5 rounded-2xl bg-black/50 backdrop-blur-md border border-white/15 p-4 sm:p-6 shadow-2xl hover:border-brand transition-colors"
        >
          <div className="relative w-32 sm:w-44 flex-shrink-0 aspect-video rounded-lg overflow-hidden bg-zinc-800">
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
    </div>
  );
}

/** The rest of the result, on the page below the photo. */
function ResultDetails({
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
  return (
    <section className="py-10 lg:py-16">
      <div className="container max-w-4xl">
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
