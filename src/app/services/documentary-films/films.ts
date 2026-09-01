/**
 * Showcased documentary films.
 *
 * View counts are fetched live from YouTube (see `@/lib/youtube-stats`) and
 * refreshed weekly; `fallbackViews` is only used before the first successful
 * fetch, or if YouTube is unreachable. Watch time is not available from the
 * public Data API — it needs the YouTube Analytics API and OAuth — so those
 * figures stay hand-maintained.
 */

export interface ShowcaseFilm {
  id: string;
  title: string;
  description: string;
  fallbackViews: string;
  watchTime: string;
  award: string | null;
  featured: boolean;
}

export const pastWork: ShowcaseFilm[] = [
  {
    id: 'vcyl6WWKskg',
    title: "You've Got To Win UTMB",
    description: "Tom Evans tells the inside story of his 2025 UTMB victory — two DNFs, a knife attack that nearly ended his running career, and the night everything finally came together on the 100 miles around Mont Blanc.",
    fallbackViews: '21K+',
    watchTime: '-',
    award: null,
    featured: true,
  },
  {
    id: 'R2fhcCSvZj8',
    title: '81 Yards',
    description: 'John Stocker breaks the backyard ultra world record in this gripping documentary following every yard of his historic 81-yard journey.',
    fallbackViews: '80K+',
    watchTime: '45K hrs',
    award: 'Winner - Sheffield Adventure Film Festival',
    featured: false,
  },
  {
    id: '2VwS68uEg04',
    title: 'Making Marks',
    description: 'Mark Derbyshire attempts to break the South Downs Way 100 course record — a time that has stood for eleven years. A story of patience, obsession, and quiet competitive fire.',
    fallbackViews: '7K+',
    watchTime: '-',
    award: null,
    featured: false,
  },
  {
    id: 'p6ReCqvcvz8',
    title: 'Sub 40',
    description: 'Masters runner Tim Grose chases the sub-40 minute 10k. A story of dedication that resonated with runners of all ages.',
    fallbackViews: '4K+',
    watchTime: '12K hrs',
    award: null,
    featured: false,
  },
  {
    id: 'AovGq8SmhA4',
    title: "Martin Yelling's Long Run Home",
    description: "Marathon Talk co-host Martin Yelling takes on an epic long run home. A film about the joy of simply running.",
    fallbackViews: '4.5K+',
    watchTime: '8K hrs',
    award: null,
    featured: false,
  },
  {
    id: 'sdA-qO1_MP8',
    title: "Victoria's Marathon",
    description: 'An intimate first marathon journey that connected with first-time runners worldwide.',
    fallbackViews: '2K+',
    watchTime: '8K hrs',
    award: null,
    featured: false,
  },
  {
    id: 'lSPQsEUNN2A',
    title: 'The 401 Challenge',
    description: '401 marathons in 401 days. The extraordinary story of one man\'s mission to raise awareness for bullying and mental health.',
    fallbackViews: '5K+',
    watchTime: '10K hrs',
    award: null,
    featured: false,
  },
  {
    id: 'v8hYS6BWioo',
    title: 'The Road to 100',
    description: "James Bennett's Paris Marathon marks his hundredth. A celebration of the everyday marathon runner.",
    fallbackViews: '1.5K+',
    watchTime: '6K hrs',
    award: null,
    featured: false,
  },
];

/** Headline figures used until the channel stats have been fetched once. */
export const fallbackChannelStats = {
  subscribers: '61K+',
  totalViews: '7.5M+',
};
