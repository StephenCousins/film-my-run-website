'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { modelPhotos } from '@/lib/runner-quiz/models';
import { ArrowRight, Check, ChevronRight, ShoppingBag } from 'lucide-react';
import { QUIZ, rankTypes, typeById, type Scores } from '@/lib/runner-quiz';
import { SHIRT_COLOURS, backArt, frontArt, teeMock, type ShirtColour } from '@/lib/runner-quiz/shirt-art';
import { RUNNER_TEE_SLUG, runnerTee } from '@/lib/shop/runner-tee';
import { addToBasket } from '@/lib/shop/basket';
import { arrives } from '@/lib/shop/delivery';
import MemberLine from './MemberLine';
import '@/styles/runner-quiz-fonts.css';

const LOGO: Record<'light' | 'dark', string> = {
  light: '/images/logo/fmr-logo-light.png', // dark runners, for the White shirt
  dark: '/images/logo/fmr-logo-dark.png',
};

const Breadcrumb = ({ name }: { name: string }) => (
  <nav className="flex items-center gap-2 text-sm text-muted mb-8" aria-label="Breadcrumb">
    <Link href="/shop" className="hover:text-foreground">Shop</Link>
    <ChevronRight className="w-4 h-4" />
    <span className="text-foreground truncate">{name}</span>
  </nav>
);

/** The personalised shirt for one quiz result, or all twelve fronts when there is no result. */
export default function RunnerTee({ typeId, scores, colour }: { typeId: string | null; scores: Scores | null; colour?: ShirtColour }) {
  const type = typeById(typeId);
  if (!type || !scores) return <AllTypes />;
  return <Personalised typeId={type.id} scores={scores} colour={colour} />;
}

function Personalised({ typeId, scores, colour: urlColour }: { typeId: string; scores: Scores; colour?: ShirtColour }) {
  const type = typeById(typeId)!;
  const second = useMemo(() => rankTypes(scores).find((t) => t.id !== type.id)!, [scores, type.id]);
  // A colour in the URL wins; otherwise the type's own shirt colour.
  const [colour, setColour] = useState<ShirtColour>(urlColour ?? (type.shirtColour as ShirtColour));
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const sizes = runnerTee.variants.filter((v) => v.colour === colour).map((v) => v.size!);
  const chosen = size && sizes.includes(size) ? size : null;
  const variant = runnerTee.variants.find((v) => v.colour === colour && v.size === chosen);
  const price = (variant ?? runnerTee.variants.find((v) => v.colour === colour)!).price;

  // The print date is the day the order is paid; the preview shows today.
  const front = useMemo(() => teeMock(SHIRT_COLOURS[colour], frontArt(type, colour)), [type, colour]);
  const backPrint = useMemo(
    () => backArt(type, second, scores, new Date(), colour, colour === 'White' ? LOGO.light : LOGO.dark),
    [type, second, scores, colour]
  );
  const back = useMemo(() => teeMock(SHIRT_COLOURS[colour], backPrint), [colour, backPrint]);
  const here = `/shop/${RUNNER_TEE_SLUG}?type=${type.id}&s=${scores.join('-')}`;

  const add = () => {
    if (!variant) return;
    addToBasket(RUNNER_TEE_SLUG, variant.id, 1, { type: type.id, scores });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="container py-8 lg:py-12">
      <Breadcrumb name={runnerTee.name} />
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
        <div className="grid grid-cols-2 gap-3 self-start">
          {[
            ['Front', front],
            ['Back, with your Runner DNA', back],
          ].map(([label, svg]) => (
            <figure key={label} className="rounded-2xl bg-surface-secondary border border-border p-2 sm:p-4">
              <div dangerouslySetInnerHTML={{ __html: svg }} />
              <figcaption className="text-xs text-muted text-center mt-1">{label}</figcaption>
            </figure>
          ))}
          <figure className="col-span-2 rounded-2xl border border-border p-6" style={{ backgroundColor: SHIRT_COLOURS[colour] }}>
            <div className="max-w-xs mx-auto [&>svg]:w-full [&>svg]:h-auto" dangerouslySetInnerHTML={{ __html: backPrint }} />
            <figcaption className={`text-xs text-center mt-2 ${colour === 'White' ? 'text-zinc-500' : 'text-zinc-400'}`}>
              The back print, close up
            </figcaption>
          </figure>
          <div className="col-span-2 mt-2">
            <p className="text-sm font-semibold text-foreground">On a model</p>
            <p className="text-xs text-muted mb-2">Shown in {type.shirtColour} with sample scores</p>
            <div className="grid grid-cols-3 gap-2">
              {modelPhotos(type.id).slice(0, 3).map((src, i) => (
                <div key={src} className="relative aspect-square rounded-xl overflow-hidden bg-white border border-border">
                  <Image src={src} alt={i === 0 ? `A ${type.name} tee on a model` : ''} fill sizes="(max-width: 1024px) 33vw, 16vw" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand mb-3">Personalised with your Runner DNA</p>
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground leading-tight uppercase">
            {type.shirtLines.map((l) => (
              <span key={l} className="block">{l}</span>
            ))}
          </h1>
          <p className="text-secondary mt-2">
            {type.name} tee, with a streak of {second.name}. Bella+Canvas 3001 cotton.
          </p>

          <p className="font-mono text-2xl text-foreground mt-5">£{price.toFixed(2)}</p>
          <MemberLine pounds={price} returnTo={here} />

          <div className="mt-6">
            <p className="text-sm text-secondary mb-2">Colour: <span className="text-foreground">{colour}</span></p>
            <div className="flex flex-wrap gap-2">
              {(runnerTee.colours as ShirtColour[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColour(c)}
                  aria-pressed={c === colour}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${c === colour ? 'border-brand bg-brand/10 text-foreground' : 'border-border bg-surface-secondary text-secondary hover:text-foreground'}`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: SHIRT_COLOURS[c] }} />
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm text-secondary mb-2">Size{chosen ? '' : ': choose one'}</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  aria-pressed={s === chosen}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-mono transition-colors ${s === chosen ? 'border-brand bg-brand/10 text-foreground' : 'border-border bg-surface-secondary text-secondary hover:text-foreground'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={add}
            disabled={!variant}
            className="mt-8 inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-xl bg-brand text-black font-semibold text-lg hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {added ? <Check className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
            {added ? 'Added to basket' : 'Add to basket'}
          </button>
          <p className="text-xs text-muted mt-3">
            {added ? (
              <Link href="/shop/basket" className="text-brand hover:underline">Go to basket →</Link>
            ) : (
              'Free UK delivery over £45. Paid securely with Stripe.'
            )}
          </p>

          <div className="mt-8 space-y-3 text-secondary leading-relaxed">
            <p className="text-foreground">{runnerTee.description}</p>
            <p>
              The date on the back is the day you order. {arrives()}, printed to order in the UK and sent tracked.
            </p>
            <p>
              Not you?{' '}
              <Link href="/tools/runner-quiz" className="text-brand hover:underline">Take the quiz again</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AllTypes() {

  return (
    <div className="container py-8 lg:py-12">
      <Breadcrumb name={runnerTee.name} />
      <div className="max-w-2xl mb-10">
        <h1 className="font-display text-3xl lg:text-5xl font-bold text-foreground leading-tight">Runner Type Tee</h1>
        <p className="text-lg text-secondary mt-3">
          Twelve runner types, twelve phrases. The back carries your own Runner DNA from the quiz, so no two are the same.
        </p>
        <Link href="/tools/runner-quiz" className="btn-primary mt-6 text-sm tracking-widest uppercase">
          Take the quiz to get yours <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {QUIZ.types.map((t) => (
          <figure key={t.id} className="rounded-2xl bg-surface-secondary border border-border overflow-hidden">
            <div className="relative aspect-square bg-white">
              <Image src={modelPhotos(t.id)[0]} alt={`${t.name} tee: ${t.shirt}`} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover" />
            </div>
            <figcaption className="text-sm text-center py-2 text-secondary">{t.name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
