# Results desk: our own race stories, written from the official results (design)

10 Nov 2026. Agreed with Stephen in conversation; calls marked *(my call)* are Claude's and his to overrule.

## Why

The news desk (2026-09-26-running-news-design.md) rewrites other outlets' reporting, so it is never first and never
the source. Canadian Running leads more stories than any UK outlet because the UK has no daily running newsroom of
the same kind. Stephen: "How do WE become the UK daily running newsroom". The answer agreed here: after every major
race, fetch the official results ourselves and write the story from them, with context nobody else puts together.

## Goals

- Every race on the list gets a story after it finishes, even a short one: winners and their times at minimum.
- Each story gives a picture of **the race** (this year against past editions and the course record, previous
  winners, how competitive the field was compared with other races of its kind; is the race itself one to watch) and
  of **the runners** (winners, notable podium and age-group finishers: what they have done elsewhere, their ranking,
  their potential; one to watch).
- UK-heavy: the big UK marathons and halves, major UK track meets, UK cross-country, the UK's biggest fell, trail and
  ultra races, plus the major international races. Stephen: never more than about 5 major races a week worldwide.

## Anti-goals (a failure even if it runs)

- **The wrong race, the wrong year or the wrong results.** Stephen: "we have to be sure we are covering the correct
  race in the correct year and collecting the correct results from the correct place." This outranks coverage. A
  missed story is acceptable; wrong winners are not.
- Invented history. If a runner's past can't be found, the story leaves it out.
- "One to watch" as a guess. It is only said when the numbers back it.
- Scraping that needs bot-protection bypass, proxies or a login. If a results page blocks plain requests, that race
  has no automated results source.

## Non-goals

- parkrun (a Sunday parkrun round-up was considered and shelved 10 Nov: too many pages to read every weekend).
- Previews, start lists, live coverage. Results only.
- Full results tables on our site. We publish a story, not a results service.

## The race list

`docs/news/results-desk-races.md`: 150 races to add to the 61 in `src/lib/news/must-cover.json`, compiled 10 Nov by a
research agent. Stephen: "the list of races is very strong. We just need to make sure everything is accurate." It is a
draft: most dates are estimated, many results sources say "timing co. unverified", the Big Half is listed for
5 Sep 2027 instead of March (check), and "Lake District Mountain Trail" does not exist (remove). The 61 existing
must-cover races join the desk too.

## Accuracy: verified before race day, checked again on the day

**1. Each edition is verified once, ahead of time.** A race edition can only use the results desk when its entry is
*verified*: confirmed date (from the organiser's own site), edition number where the race uses one, the exact results
page or results-platform event id, the results platform, and the URL where each of those was confirmed, with the date
checked. Estimated or unverified editions keep today's behaviour (must-cover gap fill through web search) or, for new
races, are simply not covered. *(my call)*

**Verification is automated (Stephen, 10 Nov: "Automated definitely").** A scheduled job (`claude -p` with web
access, OpenRouter fallback) checks each edition from about 6 weeks before it, and re-checks a few days before. It
marks an edition verified only when the organiser's own site gives the date (and edition number where used) and the
results platform lists the event for that date; anything that disagrees, or only one source, stays unverified. It
records every URL it used and the date checked. Stephen does not review it; the Monday email lists editions that
failed verification and why. Because a confident mistake here goes straight to a published story, the day-of checks
below stay as a second, independent gate, and the verifier is tested against known wrong cases (last year's results
page, the half on the same weekend as the marathon, a moved date) before it goes live.

**2. The results are checked again on the day, before writing.** All of these must pass or no story is written and the
Monday email says why:
- the page names the race (one of its aliases) and its date matches the edition's date;
- it is not last year's page (date and, where present, edition number);
- the finisher count is plausible against previous editions (no half-loaded or provisional page; the builder sets
  the bound);
- the winning times are plausible against the course record and past winning times (a 2:05 at a hilly club marathon
  fails);
- results marked provisional are waited for, up to the retry window.

Results are retried daily for up to 7 days after the race (fell races often post 1-3 days late). *(my call)*

## Pipeline (added to the daily run)

1. **Due:** editions that finished yesterday or up to 7 days ago, verified, with no results story yet.
2. **Fetch** the results through an adapter for that platform (MikaTiming, RaceTimeUK, SiTiming, Opentrack,
   MyRaceResult, UltraSignup, World Athletics, an organiser's own HTML; PDF where a race only posts PDF). Build adapters
   for the platforms the verified list actually uses, most-used first.
3. **Check** (above).
4. **Store** what the story needs: top 10 per gender, age-group winners, finisher counts and depth counts (how many
   under set standards), per edition. Past editions are backfilled from the same platform the first time a race comes
   up, as far back as 3 editions. *(my call)*
5. **Context:**
   - The race: this year against past editions and the course record; repeat winners; how competitive it was
     (winning time against the course record, depth counts, field strength where the race publishes it, such as the
     average UTMB or ITRA index); how that compares with other races of the same kind on the list.
   - The runners: World Athletics profiles (elite road and track), UTMB index and ITRA (trail), DUV ultra statistics
     (ultra), FRA results (fell), our own stored past editions, and our own runner profiles (link
     when a winner has one). Every fact keeps its source URL for the fact-check.
6. **Results facts come from the stored data, not the model.** Winners, times, placings and age-group winners are
   put into the story by code from the stored results (a results line or table), and the writer is given them as
   fixed. If the fact-check still disputes a results fact after the fix rounds, the story is dropped and the Monday
   email says why. This is the one exception to "never held": for every other fact the asterisk rule stands.
   *(my call)*
7. **Write** with the existing writer (Opus via `claude -p`, OpenRouter fallback), a results-story brief: winners and
   times always; the race picture; the runner picture; "one to watch" only with numbers behind it (for example a big
   PB, a top-10 ranking for their age, a second win in a row). Short when there's little to say.
8. **Gates** as for every story: fact-check against the results and context sources, copy rules, never held (fix
   rounds, then asterisk note). Sources line credits the official results.
9. **Publish** outside the daily cap, like must-cover.

**One results story per race.** For a verified edition the desk owns the results story: the daily run does not write
a results story for that race from outlets' feeds or from the search-based gap fill, during the race's window. Other
news about it (a disqualification, a doping case, a course change) still goes through the normal desk. If an
outlet's results story was published before the edition was verified, the desk skips that race. Stories the desk
writes are tagged as such in `news_stories` so "no results story yet" means no desk story. *(my call)*

**Meets, championships, festivals and stage races.** *(my call)*
- Track meets and championships: running events only (sprints to 10,000m, hurdles, steeplechase, relays; no field
  events, as the sorter already rules). One story per meet; one per day for championships of more than 3 days. Course
  record and finisher-count checks don't apply; the checks are the meet name, date and that the events listed match
  the programme.
- Festivals (Edinburgh, Great Manchester, Lakeland 100 + 50): one story per festival, led by its headline race.
- Stage races (Dragon's Back, Cape Wrath): one story when it finishes.

**What counts as allowed fetching.** Plain requests to a page, or to the public JSON the site's own page calls
(MyRaceResult, Livetrail, World Athletics), are allowed. Not allowed: logins, proxies, anything that defeats bot
protection, headless browsers used to get past a block, and paths robots.txt disallows. A source that blocks the
GitHub Actions runner has no automated source; that race falls back to today's behaviour. *(my call)*

**Juniors.** Under-18s (U13 to U17 age groups, junior races at cross-country and relays) are named with their
result only: no profile, no history, no "one to watch". *(my call)*

## Weekly load

Counting the full list by the week each race finishes, 16 weeks go over 5 (the busiest, mid-June 2027, has 9). Each
race still gets its own story; the cap that matters is Stephen's attention, and a story per race is what he asked
for. Where several listed races are one event (Spine week, the UTMB week races, one Diamond League meet), they keep
their separate entries as today. *(my call: no merging)*

## Data notes

- The rankinglists dataset is **not** used in the first version. It holds over a million named club runners'
  performances collected through Stephen's login, lives only on his Mac, and ends in 2025; putting it in the
  production database is a data question to settle separately. Club runners' context in v1 comes from our own
  stored past editions. *(my call)*
- Names in results are public, but we store only what stories use (top 10, age-group winners, counts).

## Cost

Fetching is free; writing runs on Stephen's subscription (OpenRouter fallback inside the existing £10/month ceiling).
At up to ~5 stories a week the writing cost on fallback is a few pounds a month.

## Testing and rollout

- Adapters tested against saved results pages from past editions (fixtures in the repo).
- The day check tested with wrong-year, wrong-race, half-loaded and implausible-time fixtures.
- First live run as a dry run on one past race per platform, Stephen reads the stories, then on.

## Left to the builder

Data shape (extend must-cover.json or a new table), adapter design, plausibility bounds, depth standards per
distance, how the comparison with "other races of its kind" is computed, the results-story prompt wording, and the
order platforms are built in.
