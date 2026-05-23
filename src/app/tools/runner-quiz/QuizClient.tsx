'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, RotateCcw, Download, Compass, Link2, Check } from 'lucide-react';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { type Axis, type Ideology, IDEOLOGIES, findClosestIdeology } from './quiz-data';

// ============================================================
// DATA
// ============================================================

interface Question { axis: Axis; dir: number; text: string }

const QUESTIONS: Question[] = [
  { axis: 'sur', dir: +1, text: 'Tarmac is honest — the clock doesn’t lie.' },
  { axis: 'sur', dir: -1, text: 'The best runs are the ones with mud on the shoes.' },
  { axis: 'sur', dir: +1, text: 'A precisely measured route matters to me.' },
  { axis: 'sur', dir: -1, text: 'Climbing 1,000m of elevation is half the fun.' },
  { axis: 'sur', dir: +1, text: 'Lining up for the London Marathon appeals more to me than lining up for UTMB.' },
  { axis: 'sur', dir: -1, text: 'Roots, rocks and stream crossings make a run come alive.' },
  { axis: 'sur', dir: +1, text: 'The roar of the Boston Marathon crowd is what running is all about.' },
  { axis: 'sur', dir: -1, text: 'Solitude in the hills beats a packed start line.' },
  { axis: 'met', dir: +1, text: 'I plan every session by pace, heart rate or power.' },
  { axis: 'met', dir: -1, text: 'Some of my best runs happened without a watch.' },
  { axis: 'met', dir: +1, text: 'I check my Strava as soon as I finish.' },
  { axis: 'met', dir: -1, text: 'Effort is the only metric that really matters.' },
  { axis: 'met', dir: +1, text: 'I follow a structured plan with named workouts.' },
  { axis: 'met', dir: -1, text: 'I run by how my legs feel that morning, not the schedule.' },
  { axis: 'met', dir: +1, text: 'VO₂ max and lactate threshold are useful concepts to me.' },
  { axis: 'met', dir: -1, text: 'The body knows things that no wearable can measure.' },
  { axis: 'dis', dir: +1, text: 'Setting a parkrun PB excites me more than negative-splitting a marathon.' },
  { axis: 'dis', dir: -1, text: 'Anything under 30km feels like a warm-up.' },
  { axis: 'dis', dir: +1, text: 'I’d rather chase a fast mile than complete an ultra.' },
  { axis: 'dis', dir: -1, text: 'Western States or the Spine Race interest me more than the Diamond League.' },
  { axis: 'dis', dir: +1, text: 'Intervals and tempo work are my favourite sessions.' },
  { axis: 'dis', dir: -1, text: 'Long, slow miles are where the magic lives.' },
  { axis: 'dis', dir: +1, text: 'Track and 5K–10K racing pull me more than anything.' },
  { axis: 'dis', dir: -1, text: 'Finishing UTMB is a greater achievement than running a 14-minute 5K.' },
  { axis: 'spi', dir: +1, text: 'A race without a finishing time written down barely counts.' },
  { axis: 'spi', dir: -1, text: 'A Saturday parkrun, barcode in hand, is the perfect running event.' },
  { axis: 'spi', dir: +1, text: 'PBs are what I train for.' },
  { axis: 'spi', dir: -1, text: 'Running is, first and foremost, about being part of a community.' },
  { axis: 'spi', dir: +1, text: 'Collecting all six Abbott World Marathon Majors stars would be a worthy life goal.' },
  { axis: 'spi', dir: -1, text: 'Volunteering at parkrun gives me as much as running it does.' },
  { axis: 'spi', dir: +1, text: 'I’ll check the live leaderboard mid-race if I can.' },
  { axis: 'spi', dir: -1, text: 'The best part of a marathon is strangers cheering your name.' },
];

const AXIS_LABELS: Record<Axis, string> = { sur: 'Surface', met: 'Method', dis: 'Distance', spi: 'Spirit' };

const OPTIONS = [
  { label: 'Strongly Agree', value: 1.0 },
  { label: 'Agree', value: 0.5 },
  { label: 'Neutral', value: 0.0 },
  { label: 'Disagree', value: -0.5 },
  { label: 'Strongly Disagree', value: -1.0 },
];

const AXIS_COLORS = {
  sur: { left: 'rgb(var(--color-text))', right: 'rgb(var(--color-brand))' },
  met: { left: '#3b82f6', right: '#f59e0b' },
  dis: { left: '#ef4444', right: '#8b5cf6' },
  spi: { left: '#eab308', right: '#14b8a6' },
};

const AXIS_POLES: Record<Axis, [string, string]> = {
  sur: ['Road', 'Trail'],
  met: ['Numbers', 'Feel'],
  dis: ['Speed', 'Ultra'],
  spi: ['Compete', 'Connect'],
};

const AXIS_BACKGROUNDS: Record<Axis, string> = {
  sur: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/hero/hero-trail.jpg',
  met: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/hero/running-tools-bg.jpg',
  dis: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/films/utmb.jpg',
  spi: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/about-hero.jpg',
};

// ============================================================
// COMPONENTS
// ============================================================

function AxisBar({ axis, leftPct }: { axis: Axis; leftPct: number }) {
  const rightPct = 100 - leftPct;
  const [left, right] = AXIS_POLES[axis];
  const colors = AXIS_COLORS[axis];
  const dominant = leftPct >= 50 ? 'left' : 'right';

  return (
    <div className="mb-5">
      <div className="flex justify-between mb-1.5">
        <span
          className="text-[11px] font-bold uppercase tracking-widest transition-opacity"
          style={{ color: colors.left, opacity: dominant === 'left' ? 1 : 0.35 }}
        >
          {left}
        </span>
        <span
          className="text-[11px] font-bold uppercase tracking-widest transition-opacity"
          style={{ color: colors.right, opacity: dominant === 'right' ? 1 : 0.35 }}
        >
          {right}
        </span>
      </div>
      <div className="h-7 flex border border-border-secondary rounded-sm overflow-hidden">
        <motion.div
          className="h-full"
          style={{ backgroundColor: colors.left }}
          initial={{ width: '50%' }}
          animate={{ width: `${leftPct}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
        <motion.div
          className="h-full"
          style={{ backgroundColor: colors.right }}
          initial={{ width: '50%' }}
          animate={{ width: `${rightPct}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
      <div className="flex justify-between mt-1 font-mono text-sm font-bold text-secondary">
        <span>{leftPct.toFixed(0)}%</span>
        <span>{rightPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function PlotSVG({ surL, disL }: { surL: number; disL: number }) {
  const dotX = 50 + (100 - surL) / 100 * 300;
  const dotY = 40 + disL / 100 * 300;

  return (
    <svg className="w-full h-auto" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-label="Your position on the runner map">
      <defs>
        <linearGradient id="q-tl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0.06" /></linearGradient>
        <linearGradient id="q-tr" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.18" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0.06" /></linearGradient>
        <linearGradient id="q-bl" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.06" /></linearGradient>
        <linearGradient id="q-br" x1="1" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.18" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.06" /></linearGradient>
      </defs>

      {/* Colored quadrants */}
      <rect x="50" y="40" width="150" height="150" fill="url(#q-tl)" />
      <rect x="200" y="40" width="150" height="150" fill="url(#q-tr)" />
      <rect x="50" y="190" width="150" height="150" fill="url(#q-bl)" />
      <rect x="200" y="190" width="150" height="150" fill="url(#q-br)" />

      <rect x="50" y="40" width="300" height="300" fill="none" className="stroke-foreground" strokeWidth="1.5" />

      <line x1="200" y1="40" x2="200" y2="340" className="stroke-foreground" strokeWidth="0.6" strokeDasharray="2 4" opacity="0.3" />
      <line x1="50" y1="190" x2="350" y2="190" className="stroke-foreground" strokeWidth="0.6" strokeDasharray="2 4" opacity="0.3" />

      {/* Quadrant labels */}
      <text x="125" y="108" textAnchor="middle" fill="#f59e0b" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="9" fontWeight="800" letterSpacing="1.2" opacity="0.5">MARATHON</text>
      <text x="125" y="120" textAnchor="middle" fill="#f59e0b" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="7" fontWeight="600" letterSpacing="1" opacity="0.35">TERRITORY</text>

      <text x="275" y="108" textAnchor="middle" fill="#22c55e" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="9" fontWeight="800" letterSpacing="1.2" opacity="0.5">TRAIL ULTRA</text>
      <text x="275" y="120" textAnchor="middle" fill="#22c55e" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="7" fontWeight="600" letterSpacing="1" opacity="0.35">TERRITORY</text>

      <text x="125" y="268" textAnchor="middle" fill="#3b82f6" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="9" fontWeight="800" letterSpacing="1.2" opacity="0.5">TRACK &amp; 5K</text>
      <text x="125" y="280" textAnchor="middle" fill="#3b82f6" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="7" fontWeight="600" letterSpacing="1" opacity="0.35">TERRITORY</text>

      <text x="275" y="268" textAnchor="middle" fill="#8b5cf6" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="9" fontWeight="800" letterSpacing="1.2" opacity="0.5">SKY &amp; FELL</text>
      <text x="275" y="280" textAnchor="middle" fill="#8b5cf6" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="7" fontWeight="600" letterSpacing="1" opacity="0.35">TERRITORY</text>

      {/* Ghost dots */}
      <g opacity="0.2">
        <circle cx="95" cy="325" r="3" className="fill-foreground" />
        <circle cx="110" cy="145" r="3" className="fill-foreground" />
        <circle cx="305" cy="70" r="3" className="fill-foreground" />
        <circle cx="290" cy="85" r="3" className="fill-foreground" />
        <circle cx="305" cy="205" r="3" className="fill-foreground" />
        <circle cx="200" cy="190" r="3" className="fill-foreground" />
      </g>

      {/* You marker */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}>
        <text x={dotX} y={dotY < 75 ? dotY + 26 : dotY - 16} textAnchor="middle" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="14" fontWeight="900" className="fill-foreground" letterSpacing="1.5">YOU</text>
        <circle cx={dotX} cy={dotY} r="9" className="fill-brand stroke-foreground" strokeWidth="2.5" />
      </motion.g>

      {/* Axis labels */}
      <text x="200" y="22" textAnchor="middle" className="fill-foreground" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="11" fontWeight="700" letterSpacing="3">ULTRA</text>
      <text x="200" y="360" textAnchor="middle" className="fill-foreground" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="11" fontWeight="700" letterSpacing="3">SPEED</text>
      <text x="28" y="194" textAnchor="middle" className="fill-foreground" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="11" fontWeight="700" letterSpacing="3" transform="rotate(-90 28 194)">ROAD</text>
      <text x="372" y="194" textAnchor="middle" className="fill-foreground" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="11" fontWeight="700" letterSpacing="3" transform="rotate(90 372 194)">TRAIL</text>
    </svg>
  );
}

// ============================================================
// SHARE CARD (canvas-based PNG generation)
// ============================================================

function generateShareImage(
  name: string,
  desc: string,
  scores: { surfaceL: number; methodL: number; distanceL: number; spiritL: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const W = 1080, H = 1080;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.textBaseline = 'top';

      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, W, H);

      const M = 60;
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 2;
      ctx.strokeRect(M, M, W - 2 * M, H - 2 * M);

      ctx.fillStyle = '#f88c00';
      ctx.fillRect(M, M, W - 2 * M, 6);

      const PAD_L = 95;
      const PAD_R = W - 95;
      const innerW = PAD_R - PAD_L;

      ctx.fillStyle = '#f88c00';
      ctx.font = '700 20px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('MY RUNNING TRIBE', PAD_L, 120);

      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_L, 155);
      ctx.lineTo(PAD_R, 155);
      ctx.stroke();

      ctx.fillStyle = '#f88c00';
      ctx.font = 'italic 500 48px "Inter", sans-serif';
      ctx.fillText('The', PAD_L, 175);

      ctx.fillStyle = '#fafafa';
      const nameUpper = name.toUpperCase();
      let fontSize = 120;
      ctx.font = `900 ${fontSize}px "Inter", sans-serif`;
      while (ctx.measureText(nameUpper).width > innerW && fontSize > 60) {
        fontSize -= 4;
        ctx.font = `900 ${fontSize}px "Inter", sans-serif`;
      }
      ctx.fillText(nameUpper, PAD_L, 235);
      const nameBottom = 235 + fontSize + 20;

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '400 24px "Inter", sans-serif';
      const words = desc.split(/\s+/);
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > innerW) {
          if (line) lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      lines.slice(0, 3).forEach((l, i) => {
        ctx.fillText(l, PAD_L, nameBottom + i * 36);
      });
      const descBottom = nameBottom + Math.min(lines.length, 3) * 36 + 30;

      const axisData = [
        { left: 'ROAD', right: 'TRAIL', pct: scores.surfaceL, leftCol: '#fafafa', rightCol: '#f88c00' },
        { left: 'NUMBERS', right: 'FEEL', pct: scores.methodL, leftCol: '#3b82f6', rightCol: '#f59e0b' },
        { left: 'SPEED', right: 'ULTRA', pct: scores.distanceL, leftCol: '#ef4444', rightCol: '#8b5cf6' },
        { left: 'COMPETE', right: 'CONNECT', pct: scores.spiritL, leftCol: '#eab308', rightCol: '#14b8a6' },
      ];

      const barH = 28;
      const gap = 50;
      let axisY = Math.max(descBottom + 10, 580);

      axisData.forEach(a => {
        ctx.font = '700 18px "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = a.pct >= 50 ? a.leftCol : '#71717a';
        ctx.fillText(a.left, PAD_L, axisY);
        ctx.textAlign = 'right';
        ctx.fillStyle = a.pct < 50 ? a.rightCol : '#71717a';
        ctx.fillText(a.right, PAD_R, axisY);
        ctx.textAlign = 'left';

        const bY = axisY + 28;
        const leftW = innerW * a.pct / 100;
        ctx.fillStyle = a.leftCol;
        ctx.fillRect(PAD_L, bY, leftW, barH);
        ctx.fillStyle = a.rightCol;
        ctx.fillRect(PAD_L + leftW, bY, innerW - leftW, barH);
        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 1;
        ctx.strokeRect(PAD_L, bY, innerW, barH);

        axisY = bY + barH + gap;
      });

      ctx.fillStyle = '#f88c00';
      ctx.font = '700 22px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('filmmyrun.co.uk/tools/runner-quiz', PAD_L, H - 110);

      ctx.fillStyle = '#71717a';
      ctx.font = '400 16px "Inter", sans-serif';
      ctx.fillText('Take the quiz → What kind of runner are you?', PAD_L, H - 80);

      resolve(canvas.toDataURL('image/png'));
    } catch (err) {
      reject(err);
    }
  });
}

// ============================================================
// SHARE HELPERS
// ============================================================

function getShareUrl(scores: { surfaceL: number; methodL: number; distanceL: number; spiritL: number }) {
  const r = `${Math.round(scores.surfaceL)}-${Math.round(scores.methodL)}-${Math.round(scores.distanceL)}-${Math.round(scores.spiritL)}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://filmmyrun.co.uk';
  return `${origin}/tools/runner-quiz?r=${r}`;
}

function getShareText(name: string) {
  return `I'm "The ${name}" — what kind of runner are you? Find your tribe:`;
}

// ============================================================
// MAIN PAGE
// ============================================================

type Phase = 'welcome' | 'quiz' | 'results';

interface Result {
  ideology: Ideology;
  scores: { surfaceL: number; methodL: number; distanceL: number; spiritL: number };
}

function parseSharedResult(r: string): Result | null {
  const parts = r.split('-').map(Number);
  if (parts.length === 4 && parts.every(n => !isNaN(n) && n >= 0 && n <= 100)) {
    const [surfaceL, methodL, distanceL, spiritL] = parts;
    return {
      ideology: findClosestIdeology(surfaceL, methodL, distanceL, spiritL),
      scores: { surfaceL, methodL, distanceL, spiritL },
    };
  }
  return null;
}

interface QuizClientProps {
  sharedResult?: string;
}

export default function QuizClient({ sharedResult }: QuizClientProps) {
  const [phase, setPhase] = useState<Phase>(() => {
    if (sharedResult && parseSharedResult(sharedResult)) return 'results';
    return 'welcome';
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(QUESTIONS.length).fill(null));
  const [result, setResult] = useState<Result | null>(() => {
    if (sharedResult) return parseSharedResult(sharedResult);
    return null;
  });
  const [isSharedView, setIsSharedView] = useState(() => !!(sharedResult && parseSharedResult(sharedResult)));
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const scrollToTop = useCallback(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const startQuiz = () => {
    setPhase('quiz');
    setCurrentIdx(0);
    setAnswers(new Array(QUESTIONS.length).fill(null));
    setIsSharedView(false);
    setTimeout(scrollToTop, 50);
  };

  const selectOption = (value: number) => {
    const next = [...answers];
    next[currentIdx] = value;
    setAnswers(next);

    setTimeout(() => {
      if (currentIdx < QUESTIONS.length - 1) {
        setCurrentIdx(currentIdx + 1);
      } else {
        computeResults(next);
      }
    }, 200);
  };

  const goBack = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const restart = () => {
    setPhase('welcome');
    setCurrentIdx(0);
    setAnswers(new Array(QUESTIONS.length).fill(null));
    setResult(null);
    setShareUrl(null);
    setIsSharedView(false);
    setTimeout(scrollToTop, 50);
  };

  const computeResults = (ans: (number | null)[]) => {
    const sums: Record<Axis, number> = { sur: 0, met: 0, dis: 0, spi: 0 };
    const counts: Record<Axis, number> = { sur: 0, met: 0, dis: 0, spi: 0 };

    QUESTIONS.forEach((q, i) => {
      const a = ans[i] ?? 0;
      sums[q.axis] += a * q.dir;
      counts[q.axis] += 1;
    });

    const surL = (sums.sur / counts.sur + 1) / 2 * 100;
    const metL = (sums.met / counts.met + 1) / 2 * 100;
    const disL = (sums.dis / counts.dis + 1) / 2 * 100;
    const spiL = (sums.spi / counts.spi + 1) / 2 * 100;

    const ideology = findClosestIdeology(surL, metL, disL, spiL);

    setResult({
      ideology,
      scores: { surfaceL: surL, methodL: metL, distanceL: disL, spiritL: spiL },
    });
    setPhase('results');
    setTimeout(scrollToTop, 50);
  };

  const handleShare = async () => {
    if (!result || isGenerating) return;
    setIsGenerating(true);
    try {
      const url = await generateShareImage(result.ideology.name, result.ideology.desc, result.scores);
      setShareUrl(url);
    } catch (err) {
      console.error('Share card error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!result) return;
    const url = getShareUrl(result.scores);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const q = QUESTIONS[currentIdx];
  const progressPct = phase === 'results' ? 100 : (currentIdx / QUESTIONS.length) * 100;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 lg:pt-24">
        <div ref={topRef} />

        {/* ==================== WELCOME ==================== */}
        {phase === 'welcome' && (
          <>
            {/* Hero with background image */}
            <section className="relative py-24 lg:py-36 overflow-hidden">
              <div className="absolute inset-0">
                <Image
                  src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/hero/hero-trail.jpg"
                  alt="Runners on a trail"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[rgb(var(--color-background))]" />
              </div>

              <div className="container relative">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
                    <Compass className="w-4 h-4 text-orange-500" />
                    <span className="text-orange-400 text-sm font-medium">Runner Ideology Quiz</span>
                  </div>

                  <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[0.95]">
                    What kind of runner are{' '}
                    <span className="text-brand italic font-normal">you</span>?
                  </h1>

                  <p className="text-lg text-zinc-300 max-w-xl">
                    Where you run, how you train, what distance pulls you, and why you lace up at all. Find your running tribe in five minutes.
                  </p>
                </motion.div>
              </div>
            </section>

            {/* Stats grid + CTA */}
            <section className="py-12 lg:py-16">
              <div className="container-narrow">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border mb-8">
                    {[
                      ['Questions', '32'],
                      ['Time', '≈ 5 min'],
                      ['Tribes', '21'],
                      ['Entry Fee', '£0.00'],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-surface p-4 sm:p-5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">{label}</p>
                        <p className="font-display text-2xl sm:text-3xl font-bold">{value}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-secondary text-center mb-8 max-w-md mx-auto">
                    32 statements across four axes — <strong className="text-foreground">surface</strong>, <strong className="text-foreground">method</strong>, <strong className="text-foreground">distance</strong>, and <strong className="text-foreground">spirit</strong>. Rate each one and we&apos;ll find your tribe.
                  </p>

                  <button
                    onClick={startQuiz}
                    className="btn-primary w-full text-sm tracking-widest uppercase"
                  >
                    On Your Marks <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Axis preview cards */}
                  <div className="grid grid-cols-2 gap-3 mt-10">
                    {([
                      { label: 'Surface', left: 'Road', right: 'Trail', icon: '🛣️ ↔ 🌲' },
                      { label: 'Method', left: 'Numbers', right: 'Feel', icon: '📊 ↔ 🧘' },
                      { label: 'Distance', left: 'Speed', right: 'Ultra', icon: '⚡ ↔ 🏔️' },
                      { label: 'Spirit', left: 'Compete', right: 'Connect', icon: '🏆 ↔ 🤝' },
                    ]).map((axis) => (
                      <div key={axis.label} className="card p-4 text-center">
                        <p className="text-2xl mb-2">{axis.icon}</p>
                        <p className="font-display font-bold text-sm uppercase tracking-wide mb-0.5">{axis.label}</p>
                        <p className="text-xs text-muted">{axis.left} vs {axis.right}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </section>
          </>
        )}

          {/* ==================== QUIZ ==================== */}
          {phase === 'quiz' && (
            <section className="relative py-8 lg:py-12 min-h-[80vh] overflow-hidden">
              {/* Axis-themed background image */}
              <AnimatePresence>
                <motion.div
                  key={q.axis}
                  className="absolute inset-0 z-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${AXIS_BACKGROUNDS[q.axis]})` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="absolute inset-0 bg-white/85 dark:bg-zinc-950/90" />
                </motion.div>
              </AnimatePresence>

              <div className="container-narrow relative z-10">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {/* Progress header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10">
                        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-surface-secondary" strokeWidth="3" />
                          <motion.circle
                            cx="18" cy="18" r="15.5" fill="none"
                            className="stroke-brand"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={97.4}
                            animate={{ strokeDashoffset: 97.4 - (progressPct / 100) * 97.4 }}
                            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
                          {currentIdx + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted">
                          Question {currentIdx + 1} of {QUESTIONS.length}
                        </p>
                        <p className="text-sm font-semibold text-brand">{AXIS_LABELS[q.axis]}</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-0.5 bg-surface-secondary rounded-full mb-8 overflow-hidden">
                    <motion.div
                      className="h-full bg-brand"
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>

                  {/* Question card */}
                  <div className="card-elevated p-6 sm:p-8 mb-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentIdx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                      >
                        <p className="text-xl sm:text-2xl font-semibold leading-snug mb-8 min-h-[60px]">
                          &ldquo;{q.text}&rdquo;
                        </p>

                        <div className="flex flex-col gap-2.5">
                          {OPTIONS.map((opt) => {
                            const isSelected = answers[currentIdx] === opt.value;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => selectOption(opt.value)}
                                className={`
                                  flex items-center gap-3.5 w-full text-left px-4 py-3.5
                                  border rounded-xl text-[15px] font-medium
                                  transition-all duration-150
                                  ${isSelected
                                    ? 'bg-brand text-white border-brand'
                                    : 'bg-transparent border-border hover:border-brand hover:bg-brand/5'
                                  }
                                `}
                              >
                                <span
                                  className={`
                                    w-3 h-3 rounded-full border-[1.5px] flex-shrink-0 transition-all
                                    ${isSelected
                                      ? 'bg-white border-white/50'
                                      : 'border-current'
                                    }
                                  `}
                                />
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={goBack}
                      disabled={currentIdx === 0}
                      className="btn-ghost text-xs uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <button
                      onClick={restart}
                      className="btn-ghost text-xs uppercase tracking-widest"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restart
                    </button>
                  </div>
                </motion.div>
              </div>
            </section>
          )}

          {/* ==================== RESULTS ==================== */}
          {phase === 'results' && result && (
            <>
              {/* Shared view banner */}
              {isSharedView && (
                <section className="py-6">
                  <div className="container-narrow">
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-brand/10 border border-brand/20 rounded-xl p-4 text-center"
                    >
                      <p className="text-sm text-secondary">
                        A friend shared their result with you.{' '}
                        <button onClick={startQuiz} className="text-brand font-bold hover:underline">
                          Take the quiz yourself
                        </button>
                      </p>
                    </motion.div>
                  </div>
                </section>
              )}

              {/* Results hero */}
              <section className="relative py-16 lg:py-24 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-brand/10 via-brand/5 to-transparent" />
                <div className="container-narrow relative">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="card-elevated p-6 sm:p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mt-2 mb-2">
                        {isSharedView ? 'Their tribe' : 'Your tribe'}
                      </p>
                      <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[0.95] mb-4">
                        <span className="block text-brand italic font-normal text-lg sm:text-xl mb-1">The</span>
                        {result.ideology.name}
                      </h2>
                      <p className="text-secondary text-lg leading-relaxed">{result.ideology.desc}</p>
                    </div>
                  </motion.div>
                </div>
              </section>

              {/* Extended profile */}
              <section className="py-8 lg:py-12">
                <div className="container-narrow">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <p className="text-foreground text-lg leading-relaxed mb-8">
                      {result.ideology.profile}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4 mb-8">
                      <div className="card p-5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Tell-tale signs</p>
                        <ul className="space-y-2">
                          {result.ideology.traits.map((trait) => (
                            <li key={trait} className="flex items-start gap-2 text-sm text-secondary">
                              <span className="text-brand mt-0.5 font-bold">&#x2022;</span>
                              {trait}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-4">
                        <div className="card p-5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Runners you&apos;d admire</p>
                          <p className="text-sm font-medium">{result.ideology.famous}</p>
                        </div>
                        <div className="card p-5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Your ideal race</p>
                          <p className="text-sm font-medium">{result.ideology.idealRace}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-l-4 border-brand pl-5 py-3 mb-4">
                      <p className="font-display text-xl sm:text-2xl font-bold italic text-foreground">
                        &ldquo;{result.ideology.mantra}&rdquo;
                      </p>
                    </div>
                  </motion.div>
                </div>
              </section>

              {/* Map + axes */}
              <section className="py-8 lg:py-12">
                <div className="container-narrow">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <h3 className="font-display text-2xl font-bold mb-1">
                      {isSharedView ? 'Their map' : 'Your map'}
                    </h3>
                    <p className="text-sm text-muted mb-5">Where {isSharedView ? 'they sit' : 'you sit'} on the two most tribal axes — surface and distance.</p>

                    <div className="card-elevated p-3 sm:p-4 mb-12">
                      <PlotSVG surL={result.scores.surfaceL} disL={result.scores.distanceL} />
                    </div>

                    <h3 className="font-display text-2xl font-bold mb-1">
                      {isSharedView ? 'Their four axes' : 'Your four axes'}
                    </h3>
                    <p className="text-sm text-muted mb-6">Where {isSharedView ? 'their' : 'your'} answers placed {isSharedView ? 'them' : 'you'} on each dimension.</p>

                    <div className="card-elevated p-5 sm:p-6 mb-8">
                      <AxisBar axis="sur" leftPct={result.scores.surfaceL} />
                      <AxisBar axis="met" leftPct={result.scores.methodL} />
                      <AxisBar axis="dis" leftPct={result.scores.distanceL} />
                      <AxisBar axis="spi" leftPct={result.scores.spiritL} />
                    </div>

                    {/* Share buttons — shown when viewing OWN results */}
                    {!isSharedView && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-6"
                      >
                        <p className="text-xs font-bold uppercase tracking-widest text-muted text-center mb-4">Share your tribe</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          <a
                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareText(result.ideology.name))}&url=${encodeURIComponent(getShareUrl(result.scores))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity"
                          >
                            Share on X
                          </a>
                          <a
                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl(result.scores))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1877F2] text-white rounded-full text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity"
                          >
                            Share on Facebook
                          </a>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(getShareText(result.ideology.name) + ' ' + getShareUrl(result.scores))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-full text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity"
                          >
                            WhatsApp
                          </a>
                          <button
                            onClick={handleCopyLink}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-secondary text-foreground rounded-full text-xs font-bold uppercase tracking-wider border border-border hover:bg-surface transition-colors"
                          >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                            {copied ? 'Copied!' : 'Copy Link'}
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                      {isSharedView ? (
                        <button onClick={startQuiz} className="btn-primary w-full text-sm tracking-widest uppercase">
                          Find Your Tribe <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <>
                          <button onClick={handleShare} disabled={isGenerating} className="btn-primary w-full text-sm tracking-widest uppercase">
                            {isGenerating ? 'Building image…' : 'Save Result as Image'}
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={restart} className="btn-secondary w-full text-sm tracking-widest uppercase">
                            <RotateCcw className="w-4 h-4" /> Run It Again
                          </button>
                        </>
                      )}
                    </div>

                    {/* Share image preview */}
                    <AnimatePresence>
                      {shareUrl && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-6 p-4 border border-dashed border-border rounded-xl text-center"
                        >
                          <p className="text-sm text-muted mb-3">
                            <strong className="text-foreground">Long-press on mobile</strong> or right-click on desktop to save.
                          </p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={shareUrl}
                            alt="Your runner tribe result card"
                            className="w-full max-w-sm mx-auto border border-border rounded-lg mb-3"
                          />
                          <a
                            href={shareUrl}
                            download={`running-tribe-${result.ideology.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
                            className="inline-block bg-brand text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-brand-hover transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 inline mr-2" />
                            Download PNG
                          </a>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <p className="text-xs text-muted leading-relaxed mt-8 pt-5 border-t border-border">
                      Adapted from the four-axis 8values framework — swapped politics for running tribes. The axes are intentionally playful; most runners drift across them depending on the day, the season, and what&apos;s coming up in the calendar. A starting point for a conversation, not a verdict.
                    </p>
                  </motion.div>
                </div>
              </section>
            </>
          )}
      </main>
      <Footer />
    </>
  );
}
