'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check, ChevronRight, ShoppingBag } from 'lucide-react';
import { QUIZ, typeById, type QuizType, type Scores } from '@/lib/runner-quiz';
import { chooserPhoto, modelPhotos } from '@/lib/runner-quiz/models';
import { SHIRT_COLOURS, frontArt, teeBackArt, teeMock, type ShirtColour } from '@/lib/runner-quiz/shirt-art';
import { useStoredResult, type StoredResult } from '@/lib/runner-quiz/stored';
import { RUNNER_TEE_SLUG, runnerTee } from '@/lib/shop/runner-tee';
import { OWN_TYPE_OFF_PENCE, teeListPence, teePayPence } from '@/lib/shop/tee-pricing';
import { MEMBER_DISCOUNT } from '@/lib/members/price';
import { useShopRate } from '@/lib/shop/use-rate';
import { addToBasket } from '@/lib/shop/basket';
import { arrives } from '@/lib/shop/delivery';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/runner-quiz-fonts.css';

const LOGO: Record<'light' | 'dark', string> = {
  light: '/images/logo/fmr-logo-light.png', // dark runners, for the White shirt
  dark: '/images/logo/fmr-logo-dark.png',
};

const gbp = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const OWN_OFF = gbp(OWN_TYPE_OFF_PENCE).replace('.00', '');

/** The shirt page's link: design, plus the buyer's result when there is one. */
export const teeHref = (design: string, r: { type: { id: string }; scores: Scores } | null) =>
  `/shop/${RUNNER_TEE_SLUG}?design=${design}${r ? `&type=${r.type.id}&s=${r.scores.join('-')}` : ''}`;

const Breadcrumb = ({ name, chooser }: { name: string; chooser?: boolean }) => (
  <nav className="flex items-center gap-2 text-sm text-muted mb-8" aria-label="Breadcrumb">
    <Link href="/shop" className="hover:text-foreground">Shop</Link>
    <ChevronRight className="w-4 h-4" />
    {chooser ? (
      <span className="text-foreground truncate">{name}</span>
    ) : (
      <>
        <Link href={`/shop/${RUNNER_TEE_SLUG}`} className="hover:text-foreground">{runnerTee.name}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground truncate">{name}</span>
      </>
    )}
  </nav>
);

/**
 * Any of the 12 phrase shirts. `designId` picks the shirt (none: the chooser); the buyer's quiz
 * result comes from the URL, or else from this browser, and puts their Runner DNA on the back.
 */
export default function RunnerTee({
  designId,
  personal: urlPersonal,
  colour,
}: {
  designId: string | null;
  personal: StoredResult | null;
  colour?: ShirtColour;
}) {
  const stored = useStoredResult();
  const personal = urlPersonal ?? stored;
  const design = typeById(designId);
  if (!design) return <Chooser personal={personal} />;
  return <Product key={design.id} design={design} personal={personal} urlColour={colour} />;
}

function Product({ design, personal, urlColour }: { design: QuizType; personal: StoredResult | null; urlColour?: ShirtColour }) {
  // A colour in the URL wins; otherwise the design's own shirt colour.
  const [colour, setColour] = useState<ShirtColour>(urlColour ?? (design.shirtColour as ShirtColour));
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const { isAuthenticated } = useAuth();
  // The server's answer (same rule as checkout); list price until it arrives.
  const serverRate = useShopRate();
  const rate = serverRate ?? 0;
  const own = personal?.type.id === design.id;

  const sizes = runnerTee.variants.filter((v) => v.colour === colour).map((v) => v.size!);
  const chosen = size && sizes.includes(size) ? size : null;
  const variant = runnerTee.variants.find((v) => v.colour === colour && v.size === chosen);
  const variantPence = Math.round((variant ?? runnerTee.variants.find((v) => v.colour === colour)!).price * 100);
  const list = teeListPence(variantPence, own);
  const pay = teePayPence(variantPence, own, rate);
  const memberPay = teePayPence(variantPence, own, MEMBER_DISCOUNT);

  // The print date is the day the order is paid; the preview shows today.
  const front = useMemo(() => teeMock(SHIRT_COLOURS[colour], frontArt(design, colour)), [design, colour]);
  const backPrint = useMemo(
    () => teeBackArt(design, personal, new Date(), colour, colour === 'White' ? LOGO.light : LOGO.dark),
    [design, personal, colour]
  );
  const back = useMemo(() => teeMock(SHIRT_COLOURS[colour], backPrint), [colour, backPrint]);

  const add = () => {
    if (!variant) return;
    addToBasket(RUNNER_TEE_SLUG, variant.id, 1, personal ? { type: personal.type.id, scores: personal.scores } : undefined, design.id);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="container py-8 lg:py-12">
      <Breadcrumb name={design.name} />
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
        <div className="grid grid-cols-2 gap-3 self-start">
          {[
            ['Front', front],
            [personal ? 'Back, with your Runner DNA' : 'Back', back],
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
            {/* Follows the colour picker. The back photo carries sample scores, so it shows only with a result. */}
            <p className="text-xs text-muted mb-2">Shown in {colour}{personal ? ' with sample scores' : ''}</p>
            <div className={`grid gap-2 ${personal ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
              {modelPhotos(design.id, colour)
                .slice(0, personal ? 4 : 3)
                .map((src, i) => (
                  <div key={src} className="relative aspect-square rounded-xl overflow-hidden bg-white border border-border">
                    <Image src={src} alt={i === 0 ? `A ${design.name} tee in ${colour} on a model` : ''} fill sizes="(max-width: 1024px) 33vw, 16vw" className="object-cover" />
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand mb-3">
            {own ? `Your type · ${OWN_OFF} off` : personal ? 'With your Runner DNA on the back' : 'Runner Type Tee'}
          </p>
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground leading-tight uppercase">
            {design.shirtLines.map((l) => (
              <span key={l} className="block">{l}</span>
            ))}
          </h1>
          <p className="text-secondary mt-2">
            {design.name} tee.{' '}
            {personal
              ? own
                ? 'Your own type, with your Runner DNA on the back.'
                : `Your Runner DNA on the back, marked "My type: ${personal.type.name}".`
              : `On the back: "${design.mantra}"`}{' '}
            Bella+Canvas 3001 cotton.
          </p>

          {/* The price the buyer will pay, worked out exactly as checkout does (tee-pricing.ts). */}
          <div className="mt-5">
            <p className="font-mono text-2xl text-foreground">
              {gbp(pay)}
              {pay < variantPence && <span className="ml-3 text-base text-muted line-through">{gbp(variantPence)}</span>}
            </p>
            {serverRate !== null && (
              <p className="text-sm text-secondary mt-1">
                {[own && `Your type: ${OWN_OFF} off`, rate > 0 && (rate > MEMBER_DISCOUNT ? 'FMR Club price' : 'Member price')]
                  .filter(Boolean)
                  .join(' · ')}
                {!isAuthenticated && rate === 0 && (
                  <>
                    {own ? ' · ' : ''}Members pay {gbp(memberPay)}.{' '}
                    <Link href={`/login?callbackUrl=${encodeURIComponent(teeHref(design.id, personal))}`} className="text-brand hover:underline">
                      Sign in free
                    </Link>
                  </>
                )}
              </p>
            )}
            {!personal && (
              <p className="text-sm text-secondary mt-1">
                <Link href="/tools/runner-quiz" className="text-brand hover:underline">Take the 2-minute quiz</Link> for your own Runner DNA on the
                back, and {OWN_OFF} off the shirt of your type.
              </p>
            )}
            {list !== pay && pay === variantPence - 500 && (
              <p className="text-xs text-muted mt-1">Our lowest price for this shirt.</p>
            )}
          </div>

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
            <p>
              {personal ? 'The date on the back is the day you order. ' : ''}
              {arrives()}, printed to order in the UK and sent tracked.
            </p>
            <p>
              <Link href={`/shop/${RUNNER_TEE_SLUG}`} className="text-brand hover:underline">See all 12 shirts</Link>
              {personal && (
                <>
                  {' · '}
                  <Link href="/tools/runner-quiz" className="text-brand hover:underline">Take the quiz again</Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** All 12 shirts; the buyer's own type first, with its £3 off. */
function Chooser({ personal }: { personal: StoredResult | null }) {
  const types = personal ? [personal.type, ...QUIZ.types.filter((t) => t.id !== personal.type.id)] : QUIZ.types;
  return (
    <div className="container py-8 lg:py-12">
      <Breadcrumb name={runnerTee.name} chooser />
      <div className="max-w-2xl mb-10">
        <h1 className="font-display text-3xl lg:text-5xl font-bold text-foreground leading-tight">Runner Type Tee</h1>
        <p className="text-lg text-secondary mt-3">Twelve runner types, twelve phrases. Pick any of them.</p>
        {personal ? (
          <p className="text-secondary mt-2">
            Your Runner DNA goes on the back of whichever you choose, and your own type, {personal.type.name}, is {OWN_OFF} off.
          </p>
        ) : (
          <p className="text-secondary mt-2">
            <Link href="/tools/runner-quiz" className="text-brand font-semibold hover:underline">Take the 2-minute quiz</Link> to put your own Runner DNA
            on the back, and get {OWN_OFF} off the shirt of your type.
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {types.map((t) => {
          const own = personal?.type.id === t.id;
          return (
            <Link
              key={t.id}
              href={teeHref(t.id, personal)}
              className={`group rounded-2xl bg-surface-secondary border overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 ${own ? 'border-brand' : 'border-border'}`}
            >
              <div className="relative aspect-square bg-white">
                <Image src={chooserPhoto(t.id)} alt={`${t.name} tee: ${t.shirt}`} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover" />
                {own && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-brand text-[11px] font-semibold uppercase tracking-wider text-black">
                    Your type · {OWN_OFF} off
                  </span>
                )}
              </div>
              <p className="text-sm text-center py-2 text-secondary group-hover:text-brand transition-colors">
                {t.name} <ArrowRight className="inline w-3.5 h-3.5" />
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
