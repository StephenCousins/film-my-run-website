export type ItemType = 'news' | 'preview' | 'personal_race_report' | 'review' | 'training' | 'opinion' | 'media' | 'sponsored' | 'other';
export type Topic = 'trail_ultra' | 'road' | 'track';

export interface Candidate {
  articleId: number;
  url: string;
  source: string;
  title: string;
  pubDate: Date;
  summary: string;
  text: string | null;
  imageUrl: string | null;
  photoCredit: string | null;
}

export interface Verdict {
  type: ItemType;
  confidence: number;
  isRunning: boolean;
  topic: Topic;
  isUk: boolean;
  importance: number;
}

export interface Bundle {
  key: string;
  headline: string;
  items: Candidate[];
  verdicts: Verdict[];
  alreadyCovered: boolean;
}

export interface Draft {
  title: string;
  excerpt: string;
  paragraphs: string[];
}

export interface SourceRef {
  site: string;
  url: string;
}

export interface StoryToPublish extends Draft {
  slug: string;
  topic: Topic;
  isUk: boolean;
  importance: number;
  sources: SourceRef[];
  imageUrl: string | null;
  photoCredit: string | null;
  bundleKey: string;
  articleIds: number[];
}

export interface RunLog {
  dryRun: boolean;
  itemsSeen: number;
  sortedOut: { url: string; type: ItemType; confidence: number }[];
  borderline: { url: string; confidence: number }[];
  /** Passed the sort but the grouper put them in no bundle; left unseen so the next run retries them. */
  ungrouped: { url: string; title: string }[];
  /** Bundles not written this run (already covered, over the cap, or the ceiling); the last two stay unseen. */
  skipped: { headline: string; reason: string }[];
  held: { headline: string; reason: string; storyId?: number }[];
  published: { slug: string; title: string }[];
  costUsd: number;
  stoppedByCeiling: boolean;
}
