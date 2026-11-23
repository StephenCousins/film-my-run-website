import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const R2 = 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/book';
const FILM = 'https://youtu.be/vcyl6WWKskg';

export const metadata: Metadata = {
  title: "First, You've Got to Finish: Tom Evans and UTMB",
  alternates: { canonical: 'https://filmmyrun.com/book/first-youve-got-to-finish' },
  description:
    'One night, one hundred miles and the British runner who finally won UTMB. Stephen Cousins on Tom Evans at UTMB 2025. Paperback and Kindle on Amazon.',
};

// Amazon links go here once the listings are live. A button only shows when its link is set.
const BUY: { label: string; note: string; href: string }[] = [
  { label: 'Paperback', note: 'Amazon UK, £8.99', href: '' },
  { label: 'Kindle', note: 'Amazon UK, £4.99', href: '' },
  { label: 'Paperback', note: 'Amazon.com, $10.99', href: '' },
  { label: 'Kindle', note: 'Amazon.com, $5.99', href: '' },
];

export default function TomEvansBookPage() {
  const live = BUY.filter((b) => b.href);
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 lg:pt-24">
        <section className="relative border-b border-border overflow-hidden">
          <div className="absolute inset-0">
            <Image src={`${R2}/fygtf-finish.jpg`} alt="Tom Evans at the UTMB finish in Chamonix" fill
              className="object-cover object-center" priority sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-[rgb(var(--color-background))]" />
          </div>
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-14 lg:py-20 grid md:grid-cols-[1fr_280px] gap-10 items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">The book</p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-4 mb-4">
                First, You&apos;ve Got to Finish
              </h1>
              <p className="text-xl text-zinc-200 mb-6">One night, one hundred miles and the British runner who finally won UTMB</p>
              <p className="text-lg text-zinc-300 leading-relaxed max-w-2xl">
                Tom Evans had failed at UTMB twice. In August 2025 he lined up again, at the back of the elite pen, with a storm
                coming and a three-month-old daughter at home. I was there with a camera. Nineteen hours, eighteen minutes and
                fifty-eight seconds later, he held Phoebe over his head at the finish in Chamonix.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {live.length ? (
                  live.map((b) => (
                    <a key={b.label + b.note} href={b.href} target="_blank" rel="noopener"
                      className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold">
                      {b.label} <span className="font-normal opacity-90">· {b.note}</span>
                    </a>
                  ))
                ) : (
                  <p className="text-orange-300 font-semibold">On Amazon this week, in paperback and Kindle.</p>
                )}
              </div>
            </div>
            <div className="relative aspect-[10/16] w-full max-w-[280px] mx-auto shadow-2xl rounded-md overflow-hidden">
              <Image src={`${R2}/fygtf-cover.jpg`} alt="Cover of First, You've Got to Finish by Stephen Cousins" fill
                className="object-cover" sizes="280px" />
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 lg:py-16 max-w-3xl">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">The story</h2>
          <div className="space-y-4 text-secondary leading-relaxed">
            <p>
              In 2023 he chased Jim Walmsley and blew up past Courmayeur. In 2024 he stopped at La Fouly with his stomach in
              pieces. Signing up for a third go, he said, honestly made him feel sick. His coach had given him one line to carry
              round: in order to finish first, first you&apos;ve got to finish.
            </p>
            <p>
              This is the story of that night, told checkpoint by checkpoint. Along the way it covers the army officer who won
              his first ultra in shoes bought the day before, a knife on Table Mountain, a stress fracture, and the
              neuroscientist who taught him to enjoy it again.
            </p>
            <p>A short read. About two hours. With stills from the film.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-4 text-sm">
            <a href={FILM} target="_blank" rel="noopener" className="text-orange-400 font-semibold hover:underline">
              Watch the film of the race
            </a>
            <Link href="/book" className="text-orange-400 font-semibold hover:underline">
              Also by Stephen: It&apos;s Only 100 Miles
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
