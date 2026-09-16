import { withAppApi } from '@/lib/app-api/rate-limit';
import { handleGetThread, liveChatDeps } from '@/lib/chat/handlers';

// "Ask Stephen" (docs/superpowers/specs/2026-09-16-pro-page-chat-design.md §3).
// Install header only — a lapsed subscriber can still read what Stephen wrote.
export const dynamic = 'force-dynamic';
export const GET = withAppApi((r) => handleGetThread(r, liveChatDeps), { limit: 30 });
