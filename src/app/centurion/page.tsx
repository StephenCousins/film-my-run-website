/* eslint-disable @next/next/no-img-element -- app screenshots on R2, shown at fixed phone sizes */
import { Metadata } from 'next';
import type { ReactNode } from 'react';

// A pitch page for James Elson and the Centurion Running team. Unlisted: not linked from the site, not indexed.
export const metadata: Metadata = {
  title: 'Centurion, in your pocket',
  description: 'An iPhone app for Centurion Running, built on Centurion’s own results, races and podcast.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://filmmyrun.com/centurion' },
};

const IMG = 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/centurion/pitch-v2';
const NAV = '#325BB6';
const SWORD = '#1C75BC';
const TESTFLIGHT = 'https://testflight.apple.com/join/c855NStD';
const EMAIL = 'stephen@filmmyrun.com';

function Phone({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`shrink-0 rounded-[2.6rem] bg-zinc-900 p-2 shadow-2xl shadow-black/30 ring-1 ring-black/10 ${className}`}>
      <img src={`${IMG}/${src}.jpg`} alt={alt} width={750} height={1631} loading="lazy" className="block w-full rounded-[2.1rem]" />
    </div>
  );
}

function Feature({ eyebrow, title, children, shots, flip = false }: {
  eyebrow: string; title: string; children: ReactNode; shots: { src: string; alt: string }[]; flip?: boolean;
}) {
  return (
    <section className="py-16 lg:py-24 border-t border-zinc-200">
      <div className={`mx-auto max-w-6xl px-5 grid gap-12 lg:grid-cols-2 lg:items-center ${flip ? 'lg:[&>*:first-child]:order-2' : ''}`}>
        <div>
          <p className="text-xs font-black tracking-[0.2em] uppercase" style={{ color: SWORD }}>{eyebrow}</p>
          <h2 className="mt-3 text-3xl lg:text-4xl font-black uppercase tracking-wide text-zinc-900">{title}</h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-zinc-600">{children}</div>
        </div>
        <div className="flex justify-center gap-4 sm:gap-6">
          {shots.map((s, i) => (
            <Phone key={s.src} src={s.src} alt={s.alt} className={`w-[46%] max-w-[260px] ${shots.length > 1 && i === 1 ? 'mt-12' : ''}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

const Stat = ({ n, label }: { n: string; label: string }) => (
  <div>
    <div className="text-4xl lg:text-5xl font-black text-white tabular-nums">{n}</div>
    <div className="mt-1 text-sm font-semibold text-white/75">{label}</div>
  </div>
);

const Idea = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="rounded-2xl bg-white p-6 ring-1 ring-zinc-200">
    <h3 className="font-black uppercase tracking-wide text-zinc-900">{title}</h3>
    <p className="mt-2 text-zinc-600 leading-relaxed">{children}</p>
  </div>
);

export default function CenturionPitchPage() {
  return (
    <main className="bg-[#F2F3F5] text-zinc-900">
      {/* Centurion's blue bar, as on centurionrunning.com and in the app */}
      <div style={{ background: NAV }}>
        <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between">
          <img src={`${IMG}/logo-white.svg`} alt="Centurion Running" className="h-7 sm:h-9 w-auto" />
          <span className="hidden sm:inline text-sm font-semibold text-white/80">For James and the Centurion team</span>
        </div>
      </div>

      {/* Hero */}
      <section className="overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pt-14 pb-10 lg:pt-20 grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <img src={`${IMG}/icon-cr.png`} alt="" className="h-14 w-14 rounded-2xl shadow-md" />
              <span className="text-sm font-bold text-zinc-500">An iPhone app for Centurion Running</span>
            </div>
            <h1 className="mt-6 text-5xl lg:text-7xl font-black uppercase tracking-wide leading-[0.95]">
              Centurion,<br />in your pocket
            </h1>
            <p className="mt-6 text-xl leading-relaxed text-zinc-700 max-w-xl">
              I&apos;ve built an app for Centurion. It runs on your own results, races and podcast, and it&apos;s ready to try.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-zinc-600 max-w-xl">
              The website is the library. The app is for the runner&apos;s year. Entering, training, race day, and every
              Centurion race they&apos;ve ever finished.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {TESTFLIGHT ? (
                <a href={TESTFLIGHT} className="rounded-xl px-6 py-3.5 font-bold text-white shadow-lg" style={{ background: SWORD }}>
                  Try it on TestFlight
                </a>
              ) : (
                <span className="rounded-xl px-6 py-3.5 font-bold text-white shadow-lg" style={{ background: SWORD }}>
                  Your TestFlight invite is on its way
                </span>
              )}
              <a href={`mailto:${EMAIL}`} className="font-bold underline underline-offset-4" style={{ color: SWORD }}>{EMAIL}</a>
            </div>
          </div>
          <div className="flex justify-center gap-5">
            <Phone src="season" alt="The Season screen: a countdown to the Thames Path 100 and both Grand Slams" className="w-[48%] max-w-[270px]" />
            <Phone src="live" alt="Race Live replaying the South Downs Way 100 at 21:22 on Saturday night" className="w-[48%] max-w-[270px] mt-16" />
          </div>
        </div>
      </section>

      {/* The numbers */}
      <section style={{ background: `linear-gradient(135deg, ${NAV}, ${SWORD})` }}>
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-xl font-black uppercase tracking-widest text-white/90">Built on what you already publish</h2>
          <div className="mt-8 grid grid-cols-2 gap-8 lg:grid-cols-5">
            <Stat n="129" label="race results, 2012 to 2026" />
            <Stat n="25,089" label="finishes, every split" />
            <Stat n="9,856" label="Centurion finishers" />
            <Stat n="14" label="races, with course maps" />
            <Stat n="192" label="podcast episodes" />
          </div>
          <p className="mt-8 max-w-3xl text-lg text-white/85 leading-relaxed">
            No extra work for your team. Results, aid stations, cut-offs, crew notes, kit lists, course records, race
            photos and badges all come from centurionrunning.com.
          </p>
        </div>
      </section>

      <Feature eyebrow="Season" title="Your season, not just the calendar"
        shots={[{ src: 'season', alt: 'Season screen' }, { src: 'calendar', alt: 'Race calendar grouped by month' }]}>
        <p>
          Runners tick the races they&apos;re entered in and the app is built around them. A countdown to the next one,
          the other entries underneath, and both Grand Slams filling in as they go. A badge gets a tick when you&apos;re
          entered and goes full colour once you&apos;ve finished.
        </p>
        <p>
          The race calendar has every event from the SDW 5km to the Winter Downs 200, with the entry status straight off
          your entrants pages. Full, limited places, last places or open.
        </p>
        <p>
          It nudges them too. A week out to start packing, two days out to send the crew plan, and good luck the night
          before. When the results go up it tells them their time and place, and a new podcast episode gets a
          notification of its own. All of it runs on the phone, no server needed.
        </p>
      </Feature>

      <Feature flip eyebrow="Race pages" title="Everything for race day, in one place"
        shots={[{ src: 'crew', alt: 'SDW100 crew plan' }, { src: 'pacing', alt: 'Race the archive pacing chart' }]}>
        <p>
          Every race has its course map and elevation, its course records, and the podcast episode about it. Then four
          things the website can&apos;t really do.
        </p>
        <p>
          <strong className="text-zinc-900">Crew plan.</strong> Each crew point with your runner&apos;s expected arrival, the
          cut-off, your own crew notes and a button for directions. Pick a target time and the arrivals change. Crew and
          pacing share the one target, so set sub-24 once and both follow it.
        </p>
        <p>
          <strong className="text-zinc-900">Race the archive.</strong> Pick sub-24 at the SDW100 and the app shows where 264
          past finishers on that time were at every mile. It puts your own past run over the top. Mine is the red line, 25 hours 17 in 2024.
        </p>
      </Feature>

      <Feature eyebrow="Kit" title="The kit list as a checklist"
        shots={[{ src: 'kit', alt: 'Winter Downs 100 mandatory kit checklist' }]}>
        <p>
          Your mandatory kit lists, read from each race&apos;s rules, as a checklist runners tick off as they pack. All 22
          items for the Winter Downs 100, with the recommended extras kept separate. Tap the bag and it opens that item
          in the Ultrarunning Store.
        </p>
      </Feature>

      <Feature flip eyebrow="History and stats" title="Numbers the website doesn't have"
        shots={[{ src: 'history', alt: 'Thames Path 100 history by year' }, { src: 'stats', alt: 'SDW100 race stats: slowest stretch, last-hour finishers, usual finish time and most races in a row' }]}>
        <p>
          History has every year of every race. The finishers per year and both winners, then tap a year for the full
          results and every runner&apos;s splits with their place at each checkpoint. Tap a past finish anywhere in the
          app, on Season or a passport, and it opens that year.
        </p>
        <p>
          Each race also gets its own stats, worked out from all your results. The slowest stretch of the course, how
          many get in during the last hour, the usual finish time year by year, and who has finished it the most times
          in a row. On the SDW100 that&apos;s Washington to Botolphs at about 21 minutes a mile, and Elaine Battson with
          ten in a row from 2012 to 2022.
        </p>
        <p>
          Passports get the same treatment. Mine says I&apos;ve passed 328 runners after halfway, the best being the
          TP100 in 2020, 150th at halfway and 59th at the finish.
        </p>
      </Feature>

      <Feature eyebrow="Race Live" title="Follow the race, checkpoint by checkpoint"
        shots={[{ src: 'live', alt: 'Following runners in Race Live' }, { src: 'leaders', alt: 'Leaders and the course record watch' }]}>
        <p>
          This is race day in the app. Follow runners and see where they are, their place, their ETA at the next
          checkpoint and how far ahead of the cut-off they are. Leaders, a course record watch, the map and a feed. The
          clock card goes dark at night and lightens at dawn, because that&apos;s what a 100 does. Checkpoint
          notifications and a lock screen Live Activity are built in.
        </p>
        <p>
          On the TestFlight build it&apos;s a replay. There&apos;s no live feed yet, so the app plays back real races
          from your published splits, up to 600 times faster. David Green&apos;s 13:27:13 at the SDW100 is a good one to
          watch.
        </p>
      </Feature>

      <Feature flip eyebrow="Going live" title="The same screens, actually live"
        shots={[{ src: 'raceday', alt: 'A Live Now card for the Wendover Woods 50, linking to OpenTracking' }]}>
        <p>
          Everything in Race Live works the same with live data. It just needs OpenTracking&apos;s feed in place of the
          splits. Then followers get the checkpoint notifications as their runner goes through, not after the results
          go up, and nobody has to leave the app.
        </p>
        <p>
          That&apos;s a small server and push notifications. About one to two weeks of work once Centurion has agreed a
          feed with OpenTracking and there&apos;s something to build against.
        </p>
        <p>
          Until then, a Live Now card at the top of Race Live links to OpenTracking&apos;s own page on race day, and
          counts down the day before. You&apos;ll see it at Wendover Woods on 14 November.
        </p>
      </Feature>

      <Feature eyebrow="Passport" title="Every finish, in one place"
        shots={[{ src: 'passport', alt: 'Stephen Cousins passport' }, { src: 'claim', alt: 'Confirming a passport by picking a race' }]}>
        <p>
          Runners find their name and confirm it by picking the one race of theirs from four. Then their passport fills
          itself in: finishes, miles, hours on course, a stamp for each of the 12 Centurion events, and the medals. Grand Slams,
          Downs Doubles, One Day buckles.
        </p>
        <p>
          Mine says 13 finishes, 1,152 miles and 287 hours, and #163 of 9,856 in the all-time table, which is in there
          too. Kenneth Fancett is top with 72. James, you&apos;ve got three to claim.
        </p>
      </Feature>

      <Feature flip eyebrow="Listen" title="The podcast, race by race"
        shots={[{ src: 'listen', alt: 'The Centurion Running Podcast' }]}>
        <p>
          All 192 episodes, filtered by races, Weekly News and coaching. Episodes about a race pick up its colours and
          badge, and show up on that race&apos;s page. It keeps playing with the phone locked, which matters on a long run.
        </p>
        <p>
          It&apos;s light by default, like your website, with dark or match the phone in Settings. Settings also has
          your links, the privacy policy and where all the data comes from.
        </p>
      </Feature>

      {/* Future */}
      <section className="py-16 lg:py-24 border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-black tracking-[0.2em] uppercase" style={{ color: SWORD }}>What could come next</p>
          <h2 className="mt-3 text-3xl lg:text-4xl font-black uppercase tracking-wide">Community, without replacing Facebook</h2>
          <p className="mt-5 max-w-3xl text-lg text-zinc-600 leading-relaxed">
            Your Facebook group is where people talk, and it should stay that way. These are the things it can&apos;t do,
            because they hang off results, race day and entries. None of them are in the build yet. Tell me which ones
            you&apos;d want.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Idea title="Cheers">Followers tap to cheer a runner through a checkpoint. At the finish they see &quot;212 people cheered you through Washington&quot;.</Idea>
            <Idea title="Predictions league">Pick the podium, the winning time and the finish rate before the start, and play in leagues with your club.</Idea>
            <Idea title="Pacers and crew">&quot;Looking for a pacer from Washington.&quot; &quot;Can crew at QECP.&quot; Attached to the race and the aid station, not buried in a feed.</Idea>
            <Idea title="Who else is going">Runners who opt in can see who else is entered, for car shares, accommodation and recce runs.</Idea>
            <Idea title="Finish stories">One photo and one line added to your own result. Over the years each race&apos;s history fills with them.</Idea>
            <Idea title="Watch and sign-in">Aid station distance and cut-offs on Apple Watch. Sign in with your Centurion entry account so entries fill themselves in.</Idea>
          </div>
        </div>
      </section>

      {/* Sign-off */}
      <section className="py-16 lg:py-20 bg-zinc-900 text-white">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-3xl font-black uppercase tracking-wide">Over to you</h2>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-white/80">
            <p>
              Nothing a runner puts in the app leaves their phone. There&apos;s no account and no tracking. If you take it
              on, it moves to Centurion&apos;s own Apple account, under your name and your privacy policy.
            </p>
            <p>
              Have a play with it and tell me what you think. The good, the bad and the daft.
            </p>
            <p className="font-bold text-white">Stephen</p>
          </div>
          <a href={`mailto:${EMAIL}`} className="mt-8 inline-block rounded-xl px-6 py-3.5 font-bold text-white" style={{ background: SWORD }}>{EMAIL}</a>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-zinc-500">
        Made by Stephen Cousins, Film My Run, as a proposal for Centurion Running. Race data, photos and badges belong to Centurion Running.
      </footer>
    </main>
  );
}
