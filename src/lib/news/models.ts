/** Models for the news pipeline (spec 2026-09-26). Sorting and grouping are cheap; writing and checking are the product. */
export const SORT_MODEL = 'google/gemini-3.7-flash';
export const GROUP_MODEL = 'google/gemini-3.7-flash';
export const WRITE_MODEL = 'anthropic/claude-opus-5.5';
export const CHECK_MODEL = 'anthropic/claude-opus-5.5';
/** The live sorter since 1 Oct 2026 (sortItemJev); SORT_MODEL is its fallback and the reference it was scored against. */
export const JEV_SORT_MODEL = 'typesafe/jev-1.13';
