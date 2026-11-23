import type { Metadata } from 'next';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: "It's Only 100 Miles: the book",
  alternates: { canonical: 'https://filmmyrun.com/book' },
  description:
    "Stephen Cousins's mid-pack guide to ultramarathons, from your first 50K to 100 miles. Real times, real races, every mistake included. Paperback and Kindle on Amazon.",
};

// Amazon links go here once the listings are live (KDP takes up to 72 hours).
// A button only shows when its link is set, so the page is safe to deploy before then.
const BUY: { label: string; note: string; href: string }[] = [
  { label: 'Paperback', note: 'Amazon UK, £13.99', href: '' },
  { label: 'Kindle', note: 'Amazon UK, £7.99', href: '' },
  { label: 'Paperback', note: 'Amazon.com, $16.99', href: '' },
  { label: 'Kindle', note: 'Amazon.com, $9.99', href: '' },
];

const chapters: [string, string][] = [
  ['What counts as an ultra', 'Anything past 26.2 miles. Which is the least interesting thing about it.'],
  ['Choosing your race', 'Some races are much harder than they look. Some are easier. We measured it.'],
  ['How long will it take me?', 'Start from your marathon. Then add more than you think.'],
  ['Training', "Mostly slow, mostly short, and a lot more boring than you'd think."],
  ['Pacing', 'Everyone slows down. The trick is how much.'],
  ['Eating and drinking', 'Milk, Marmite and the occasional technicolour yawn.'],
  ['Kit', 'Two head torches, one working pole and a very loud shirt.'],
  ['Feet, skin and chafing', 'The small stuff that ends big races.'],
  ['Hills, night, weather and getting lost', 'The course is only half the race.'],
  ['Aid stations, crew and drop bags', 'The race you run sitting down.'],
  ['The dark bit', "Every long race has one. Here's how I get through mine."],
  ['When it goes wrong', 'DNFs, cut-offs, injury, and knowing when to stop.'],
  ['Multi-day', 'Eight days, 400 km and a 19.7 kg dry bag.'],
  ['UTMB and racing abroad', 'Seven years from dream to start line.'],
  ['Recovery and what next', 'Coffee, a long bath, and a better plan than mine.'],
];

export default function BookPage() {
  const live = BUY.filter((b) => b.href);
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 lg:pt-24">
        <section className="relative border-b border-border overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/book/mont-blanc-trail.jpg"
              alt="Runners on a mountain trail below the Mont Blanc range"
              fill
              className="object-cover object-center"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-[rgb(var(--color-background))]" />
          </div>
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-14 lg:py-20 grid md:grid-cols-[1fr_280px] gap-10 items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">The book</p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-4 mb-4">
                It&apos;s Only 100 Miles
              </h1>
              <p className="text-xl text-zinc-200 mb-6">
                A mid-pack runner&apos;s guide to ultramarathons, from your first 50K to 100 miles
              </p>
              <p className="text-lg text-zinc-300 leading-relaxed max-w-2xl">
                I&apos;m not a coach. I&apos;m not an elite. I&apos;m a mid-pack runner who films himself running a long way.
                Since my first marathon in 2012 I&apos;ve run 181 marathons and ultras and 21 runs of 100 miles. This is
                everything I wish someone had told me before my first ultra.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {live.length ? (
                  live.map((b) => (
                    <a
                      key={b.label + b.note}
                      href={b.href}
                      target="_blank"
                      rel="noopener"
                      className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold"
                    >
                      {b.label} <span className="font-normal opacity-90">· {b.note}</span>
                    </a>
                  ))
                ) : (
                  <p className="text-orange-300 font-semibold">On Amazon this week, in paperback and Kindle.</p>
                )}
              </div>
            </div>
            <div className="relative aspect-[10/16] w-full max-w-[280px] mx-auto shadow-2xl rounded-md overflow-hidden">
              <Image
                src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/book/its-only-100-miles-cover.jpg"
                alt="Cover of It's Only 100 Miles by Stephen Cousins"
                fill
                className="object-cover"
                sizes="280px"
              />
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 lg:py-16">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">What&apos;s inside</h2>
          <ul className="space-y-3 text-secondary leading-relaxed max-w-3xl list-disc pl-5">
            <li>How long your race will REALLY take, from your marathon time, using tables built from hundreds of thousands of real UK race finishes</li>
            <li>Why I went out too fast at Race to the King, and what it cost me</li>
            <li>Training in hours, not miles, and why no run in a plan needs to go past 5 hours</li>
            <li>What to eat when your stomach has given up at mile 54</li>
            <li>Kit lists, drop bags, crew, and getting through the night</li>
            <li>When to keep going, and when to stop</li>
            <li>Stage races, the mountains, and the UTMB lottery</li>
          </ul>
          <p className="text-secondary mt-6 max-w-3xl">
            Every time in here is real, to the second. Every quote is what I said on camera at the time. The good days
            are in here, and so are the bad ones. 119 pages in full colour, with photos from the races.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 lg:pb-20">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">The chapters</h2>
          <ol className="grid sm:grid-cols-2 gap-4">
            {chapters.map(([title, sub], i) => (
              <li key={title} className="p-4 rounded-xl border border-border bg-surface-secondary">
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">Chapter {i + 1}</p>
                <p className="font-semibold text-foreground mt-1">{title}</p>
                <p className="text-sm text-secondary mt-1">{sub}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <Footer />
    </div>
  );
}
