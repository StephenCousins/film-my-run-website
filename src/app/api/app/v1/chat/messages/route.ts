import { withAppApi } from '@/lib/app-api/rate-limit';
import { handlePostMessage, liveChatDeps } from '@/lib/chat/handlers';

// "Ask Stephen" (docs/superpowers/specs/2026-09-16-pro-page-chat-design.md §3).
// Requires Pro proof (X-FMR-Pro); also limited to 5 per install per UTC day.
export const dynamic = 'force-dynamic';
export const POST = withAppApi((r) => handlePostMessage(r, liveChatDeps), { limit: 6 });
