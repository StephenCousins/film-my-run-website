import { NEWS_CONFIG } from '@/lib/news/config';
import type { ItemType, Topic } from '@/lib/news/types';

/** The pill on a social card. */
export type SocialTag = 'BREAKING' | 'RESULTS' | 'RACE NEWS' | 'ULTRA';
export const SOCIAL_TAGS: readonly SocialTag[] = ['BREAKING', 'RESULTS', 'RACE NEWS', 'ULTRA'];

export interface TagInput {
  title: string;
  excerpt?: string | null;
  topic?: Topic | string | null;
  importance?: number | null;
  /** news_items.verdict.type of the story's feed items (none for a story found on the web). */
  verdictTypes?: (ItemType | string)[];
  publishedAt?: Date | null;
  now?: Date;
}

/**
 * Words that mean the story reports a race's outcome. The sorter has no "results" type
 * (a race report from a news site is type "news"), so the words decide.
 */
const RESULTS_WORDS =
  /\b(wins?|won|winners?|victory|victorious|results?|podium|champions?|crowned|takes? (the )?(title|win|crown)|records?|fastest known time|FKT|course record|first (woman|man|place)|finish(es|ed)? first|defends? (her|his|their) title|retains?)\b/i;

/**
 * Words that mean the story is about something other than a race's outcome, even when it
 * mentions a win or a record ("banned for EPO and loses Sydney Marathon title"): bans, doping,
 * suspensions, pull-outs, injuries, deaths, investigations, police, disqualifications, course
 * changes, cancellations. Any of these in the title or excerpt rules RESULTS out.
 */
const NOT_RESULTS_WORDS =
  /\b(ban|bans|banned|doping|dope|EPO|suspend(s|ed)?|suspension|AIU|pull(s|ed)? out|pulls?-out|withdr(aw|aws|awn|ew|awal)|injur(y|ies|ed)|die(s|d)?|death|investigat\w*|police|arrest(ed)?|disqualif\w*|DQ'?d|course changes?|re-?rout(e|ed|es|ing)|cancel(s|led|lation)?)\b/i;

/** Hard news within this long of publishing can be BREAKING. */
const BREAKING_WITHIN_MS = 24 * 3600_000;

/**
 * The card's tag, from what the pipeline already knows about the story. In order:
 *
 * 1. RESULTS: the TITLE reports an outcome (wins, won, results, record, podium, champion,
 *    ...) and neither title nor excerpt is about a ban, doping, a pull-out, an injury, a death,
 *    an investigation and the like (NOT_RESULTS_WORDS). Only the title counts for the
 *    outcome: an excerpt often mentions a past win for background. Results beat everything
 *    else, ULTRA included: "Walmsley wins Western States" is a result first.
 * 2. BREAKING: very important (importance >= NEWS_CONFIG.bigStory, the same bar that keeps a
 *    story from going stale), published within the last 24 hours, and hard news: at least one
 *    of its feed items was sorted as "news" (or it has no feed items, e.g. news:story from
 *    links, where Stephen has already decided it is news), and none was a "preview".
 * 3. ULTRA: a trail or ultra story (topic trail_ultra).
 * 4. RACE NEWS: everything else (road and track news, previews, announcements).
 */
export function storyTag(s: TagInput): SocialTag {
  if (RESULTS_WORDS.test(s.title) && !NOT_RESULTS_WORDS.test(`${s.title} ${s.excerpt ?? ''}`)) return 'RESULTS';
  const types = s.verdictTypes ?? [];
  const hardNews = !types.includes('preview') && (types.length === 0 || types.includes('news'));
  const now = s.now ?? new Date();
  const recent = !s.publishedAt || now.getTime() - s.publishedAt.getTime() <= BREAKING_WITHIN_MS;
  if ((s.importance ?? 0) >= NEWS_CONFIG.bigStory && hardNews && recent) return 'BREAKING';
  if (s.topic === 'trail_ultra') return 'ULTRA';
  return 'RACE NEWS';
}
