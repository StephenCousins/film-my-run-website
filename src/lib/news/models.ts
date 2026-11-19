/**
 * Models for the news pipeline (spec 2026-09-26). Sorting and grouping are cheap; writing and checking are the product.
 * These are the OpenRouter model ids. Since 19 Nov 2026 sort and group try Claude first (Sonnet 5.5 and Opus 5.5 on the
 * API key, then Claude Code) and use these only as the backup; writing and checking go to Claude Code first (docs/llm.md).
 */
export const SORT_MODEL = 'google/gemini-3.7-flash';
export const GROUP_MODEL = 'google/gemini-3.7-flash';
export const WRITE_MODEL = 'anthropic/claude-opus-5.5';
export const CHECK_MODEL = 'anthropic/claude-opus-5.5';
/** Jev (sortItemJev) was the sorter from 1 Oct to 19 Nov 2026; it is kept for scripts/news-sorter-check.ts --jev only. */
export { JEV_MODEL as JEV_SORT_MODEL } from '@/lib/jev';
