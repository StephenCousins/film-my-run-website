'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, RotateCcw, Download, ChevronDown } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// ============================================================
// DATA
// ============================================================

type Axis = 'sur' | 'met' | 'dis' | 'spi';
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

interface Ideology {
  name: string;
  target: [number, number, number, number];
  desc: string;
}

const IDEOLOGIES: Ideology[] = [
  { name: 'Track Purist', target: [85, 80, 95, 90], desc: 'You live for the sub-5 mile, the polished spike, the perfectly even 400s. Splits down to the tenth. The track is honest in a way the trail never is.' },
  { name: 'Marathon Hunter', target: [80, 80, 35, 90], desc: 'Sub-3 chaser, World Majors collector. Training blocks measured in weeks-to-race-day. The clock is the only judge that counts.' },
  { name: 'Parkrun Faithful', target: [65, 45, 78, 20], desc: 'Saturday at 9am, no matter the weather. A barcode-pinned shirt, a 50-venue tourist tally, and probably as many volunteer credits as runs. Running as ritual.' },
  { name: 'Charity Marathoner', target: [75, 30, 25, 25], desc: 'One big-city marathon, one big cause, sequins and tutus very much encouraged. The cause matters more than the finish time — and that’s the point.' },
  { name: 'Sky Racer', target: [15, 70, 55, 85], desc: 'Vertical kilometres, mountain marathons, the air at altitude. Lungs of a kestrel. Competitive, but the mountain is the real opponent.' },
  { name: 'Ultra Strategist', target: [20, 85, 15, 80], desc: 'UTMB spreadsheets. Gel-per-hour calculations. Drop-bag wizardry. The race is won in the planning long before the gun goes.' },
  { name: 'Fell Spirit', target: [10, 20, 50, 55], desc: 'Old-school British hill running. Boggy shoes, terse company, a vest and shorts in November. No fuss, no fanfare — just up, over, down.' },
  { name: 'Ultra Mystic', target: [15, 15, 10, 25], desc: 'Run through the night, watch the dawn arrive. The clock barely registers. Long-distance running as a form of meditation, or maybe pilgrimage.' },
  { name: 'Lab Rat', target: [55, 92, 50, 55], desc: 'Stryd pod, lactate testing, AI coach. Training is a data product. Every adaptation is logged, charted, and optimised toward the next number.' },
  { name: 'Pure Runner', target: [50, 8, 55, 40], desc: 'No watch, no app, no plan beyond the door. You knew you’d had a good one without needing to check. Running as it was for thousands of years.' },
  { name: 'Club Heart', target: [65, 40, 50, 18], desc: 'Tuesday intervals. Post-run pint. Club kit. The relay. The club championship. The handicap race. Running, for you, is mostly the people.' },
  { name: 'Trail Wanderer', target: [20, 35, 35, 25], desc: 'Happy in the woods. Pace doesn’t matter, views do. You go out for a 90-minute loop and come back four hours later, unbothered and entirely fine.' },
  { name: 'Speed Demon', target: [55, 60, 92, 70], desc: '5K and 10K racing. Anything that takes longer than an hour starts to feel like a chore. Sharp, fast, repeatable — and ideally on a Saturday morning.' },
  { name: 'Long Hauler', target: [40, 55, 8, 55], desc: 'Drawn always to the longer event. Anything under a marathon feels like a warm-up. Comfortable being uncomfortable for hours at a stretch.' },
  { name: 'All-Rounder', target: [50, 50, 50, 50], desc: 'Track Tuesday, club 10-mile Sunday, off-road relay next month, ultra in the autumn. The Swiss Army knife of runners — competent everywhere, dogmatic nowhere.' },
  { name: 'Joyful Plodder', target: [55, 20, 40, 15], desc: 'You run because it makes you feel good. Pace, distance, surface, time — none of it really matters. Out the door is the only metric that counts.' },
  { name: 'Streak Keeper', target: [55, 70, 55, 30], desc: 'Day one was years ago. The chain has not broken. Two miles in a thunderstorm, one lap around a hospital car park — doesn’t matter. The streak is sacred.' },
  { name: 'Race Tourist', target: [40, 35, 40, 28], desc: 'You collect races like other people collect stamps. Half marathons abroad, weird-format ultras, midnight runs, themed events. The medal wall has questions to answer.' },
  { name: 'Backyard Brawler', target: [50, 75, 8, 88], desc: 'One loop, every hour, until only one runner stands. You’d rather be eliminated at hour 36 than not be there at all. Mental warfare with a loop counter.' },
  { name: 'Mountain Goat', target: [10, 40, 50, 45], desc: 'Vertical metres are the only metric that really counts. Scree, scramble, ridge, summit. You’d rather a 12K with 1,500m of climb than a flat marathon.' },
  { name: 'Couch-to-5K Convert', target: [70, 25, 55, 22], desc: 'Six months ago, running for a bus was a struggle. Now you’re looking up local 5Ks. Running has just become part of your life, and you’re still slightly surprised by it.' },
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
      <rect x="50" y="40" width="150" height="150" className="fill-surface-secondary" opacity="0.6" />
      <rect x="200" y="40" width="150" height="150" className="fill-surface-secondary" opacity="0.4" />
      <rect x="50" y="190" width="150" height="150" className="fill-surface-secondary" opacity="0.4" />
      <rect x="200" y="190" width="150" height="150" className="fill-surface-secondary" opacity="0.6" />

      <rect x="50" y="40" width="300" height="300" fill="none" className="stroke-foreground" strokeWidth="1.5" />

      <line x1="200" y1="40" x2="200" y2="340" className="stroke-foreground" strokeWidth="0.6" strokeDasharray="2 4" opacity="0.3" />
      <line x1="50" y1="190" x2="350" y2="190" className="stroke-foreground" strokeWidth="0.6" strokeDasharray="2 4" opacity="0.3" />

      <text x="60" y="58" className="fill-muted" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="9" fontWeight="700" letterSpacing="1.5">MARATHON</text>
      <text x="340" y="58" textAnchor="end" className="fill-muted" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="9" fontWeight="700" letterSpacing="1.5">TRAIL ULTRA</text>
      <text x="60" y="333" className="fill-muted" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="9" fontWeight="700" letterSpacing="1.5">ROAD / TRACK</text>
      <text x="340" y="333" textAnchor="end" className="fill-muted" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="9" fontWeight="700" letterSpacing="1.5">SKY / FELL</text>

      <g opacity="0.25">
        <circle cx="95" cy="325" r="3" className="fill-foreground" />
        <circle cx="110" cy="145" r="3" className="fill-foreground" />
        <circle cx="305" cy="70" r="3" className="fill-foreground" />
        <circle cx="290" cy="85" r="3" className="fill-foreground" />
        <circle cx="305" cy="205" r="3" className="fill-foreground" />
        <circle cx="200" cy="190" r="3" className="fill-foreground" />
      </g>

      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}>
        <text x={dotX} y={dotY < 75 ? dotY + 26 : dotY - 16} textAnchor="middle" fontFamily="var(--font-space-grotesk), sans-serif" fontSize="14" fontWeight="900" className="fill-foreground" letterSpacing="1.5">YOU</text>
        <circle cx={dotX} cy={dotY} r="9" className="fill-brand stroke-foreground" strokeWidth="2.5" />
      </motion.g>

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

      // Background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, W, H);

      // Border frame
      const M = 60;
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 2;
      ctx.strokeRect(M, M, W - 2 * M, H - 2 * M);

      // Brand stripe at top
      ctx.fillStyle = '#f88c00';
      ctx.fillRect(M, M, W - 2 * M, 6);

      const PAD_L = 95;
      const PAD_R = W - 95;
      const innerW = PAD_R - PAD_L;

      // Eyebrow
      ctx.fillStyle = '#f88c00';
      ctx.font = '700 20px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('MY RUNNING TRIBE', PAD_L, 120);

      // Line
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_L, 155);
      ctx.lineTo(PAD_R, 155);
      ctx.stroke();

      // "THE" accent
      ctx.fillStyle = '#f88c00';
      ctx.font = 'italic 500 48px "Inter", sans-serif';
      ctx.fillText('The', PAD_L, 175);

      // Name
      ctx.fillStyle = '#fafafa';
      ctx.font = '900 120px "Inter", sans-serif';
      const nameUpper = name.toUpperCase();
      let fontSize = 120;
      ctx.font = `900 ${fontSize}px "Inter", sans-serif`;
      while (ctx.measureText(nameUpper).width > innerW && fontSize > 60) {
        fontSize -= 4;
        ctx.font = `900 ${fontSize}px "Inter", sans-serif`;
      }
      ctx.fillText(nameUpper, PAD_L, 235);
      const nameBottom = 235 + fontSize + 20;

      // Description
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

      // Axis bars
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

      // Footer
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
// MAIN PAGE
// ============================================================

type Phase = 'welcome' | 'quiz' | 'results';

interface Result {
  ideology: Ideology;
  scores: { surfaceL: number; methodL: number; distanceL: number; spiritL: number };
}

export default function RunnerQuizPage() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(QUESTIONS.length).fill(null));
  const [result, setResult] = useState<Result | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const scrollToTop = useCallback(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const startQuiz = () => {
    setPhase('quiz');
    setCurrentIdx(0);
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

    let best: Ideology = IDEOLOGIES[0];
    let bestDist = Infinity;
    IDEOLOGIES.forEach(id => {
      const d = Math.hypot(
        id.target[0] - surL,
        id.target[1] - metL,
        id.target[2] - disL,
        id.target[3] - spiL
      );
      if (d < bestDist) { bestDist = d; best = id; }
    });

    setResult({
      ideology: best,
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

  const q = QUESTIONS[currentIdx];
  const progressPct = phase === 'results' ? 100 : (currentIdx / QUESTIONS.length) * 100;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 pb-12 md:pt-24">
        <div ref={topRef} className="container-narrow">

          {/* ==================== WELCOME ==================== */}
          {phase === 'welcome' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-8 md:pt-12"
            >
              <p className="text-brand text-xs font-bold uppercase tracking-[0.2em] mb-4">
                A Runner&apos;s Ideology Quiz
              </p>

              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[0.92] mb-6">
                What kind of runner are{' '}
                <span className="text-brand italic font-normal">you</span>?
              </h1>

              <p className="text-lg text-secondary leading-relaxed mb-8 max-w-lg">
                Where you run, how you train, what distance pulls you, and why you lace up at all. Find your running tribe in five minutes.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border mb-8">
                {[
                  ['Questions', '32'],
                  ['Time', '≈ 5 min'],
                  ['Tribes', '16'],
                  ['Entry Fee', '£0.00'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-surface p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">{label}</p>
                    <p className="font-display text-2xl font-bold">{value}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={startQuiz}
                className="btn-primary w-full text-sm tracking-widest uppercase"
              >
                On Your Marks <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ==================== QUIZ ==================== */}
          {phase === 'quiz' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-4 md:pt-8"
            >
              <div className="flex justify-between items-baseline mb-2 text-xs font-bold uppercase tracking-widest text-secondary">
                <span>
                  <span className="text-foreground">{currentIdx + 1}</span> / {QUESTIONS.length}
                </span>
                <span className="text-brand">{AXIS_LABELS[q.axis]}</span>
              </div>

              <div className="h-0.5 bg-surface-secondary rounded-full mb-10 overflow-hidden">
                <motion.div
                  className="h-full bg-brand"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-xl sm:text-2xl font-semibold leading-snug mb-8 min-h-[80px]">
                    {q.text}
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
                              ? 'bg-foreground text-background border-foreground'
                              : 'bg-transparent border-border hover:bg-foreground hover:text-background hover:border-foreground'
                            }
                          `}
                        >
                          <span
                            className={`
                              w-3 h-3 rounded-full border-[1.5px] flex-shrink-0 transition-all
                              ${isSelected
                                ? 'bg-brand border-background'
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

              <div className="flex justify-between mt-8">
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
          )}

          {/* ==================== RESULTS ==================== */}
          {phase === 'results' && result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="pt-4 md:pt-8"
            >
              {/* Tribe card */}
              <div className="card-elevated p-6 sm:p-8 mb-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mt-2 mb-2">
                  Your tribe
                </p>
                <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[0.95] mb-4">
                  <span className="block text-brand italic font-normal text-lg sm:text-xl mb-1">The</span>
                  {result.ideology.name}
                </h2>
                <p className="text-secondary leading-relaxed">{result.ideology.desc}</p>
              </div>

              {/* 2D Plot */}
              <h3 className="font-display text-2xl font-bold mb-1">Your map</h3>
              <p className="text-sm text-muted mb-5">Where you sit on the two most tribal axes — surface and distance.</p>

              <div className="card-elevated p-3 sm:p-4 mb-10">
                <PlotSVG surL={result.scores.surfaceL} disL={result.scores.distanceL} />
              </div>

              {/* Axis bars */}
              <h3 className="font-display text-2xl font-bold mb-1">Your four axes</h3>
              <p className="text-sm text-muted mb-6">Where your answers placed you on each dimension.</p>

              <AxisBar axis="sur" leftPct={result.scores.surfaceL} />
              <AxisBar axis="met" leftPct={result.scores.methodL} />
              <AxisBar axis="dis" leftPct={result.scores.distanceL} />
              <AxisBar axis="spi" leftPct={result.scores.spiritL} />

              {/* Actions */}
              <div className="flex flex-col gap-3 mt-8">
                <button onClick={handleShare} disabled={isGenerating} className="btn-primary w-full text-sm tracking-widest uppercase">
                  {isGenerating ? 'Building image…' : 'Save Result as Image'}
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={restart} className="btn-secondary w-full text-sm tracking-widest uppercase">
                  <RotateCcw className="w-4 h-4" /> Run It Again
                </button>
              </div>

              {/* Share preview */}
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
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
