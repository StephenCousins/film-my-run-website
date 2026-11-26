import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { chatAdminMetadata, isChatAdmin } from '@/lib/chat/admin';
import { prisma } from '@/lib/db';
import { metaCredentials, metaTarget } from '@/lib/social/meta';
import { londonDayStart, SOCIAL_CONFIG } from '@/lib/social/rules';
import { isSocialPostingEnabled } from '@/lib/social/settings';
import { setSocialPosting } from './actions';

export const dynamic = 'force-dynamic';

// Gated here as well as in the page and the middleware: see chatAdminMetadata.
export async function generateMetadata(): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  return chatAdminMetadata(session, 'Social posts');
}

const STATUS_STYLE: Record<string, string> = {
  posted: 'text-success',
  partial: 'text-warning',
  skipped: 'text-muted',
  failed: 'text-error',
};

const when = (d: Date) => d.toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** News → Facebook + Instagram (docs/social-posts.md): the switch, today's count, and every post and skip. */
export default async function SocialPostsPage() {
  const session = await getServerSession(authOptions);
  if (!isChatAdmin(session)) notFound();

  const [enabled, today, rows, lastSkip] = await Promise.all([
    isSocialPostingEnabled(),
    prisma.social_posts.count({ where: { status: { in: ['posted', 'partial'] }, posted_at: { gte: londonDayStart(new Date()) } } }),
    prisma.social_posts.findMany({ orderBy: { created_at: 'desc' }, take: 100 }),
    prisma.social_posts.findFirst({ where: { status: 'skipped' }, orderBy: { created_at: 'desc' }, select: { reason: true, slug: true, created_at: true } }),
  ]);
  // Yes or no only: the token never reaches the page. The targets are the locked ones from env.
  const credsPresent = metaCredentials() !== null;
  const target = metaTarget();
  const lockRefusal = lastSkip?.reason?.startsWith('account lock:') ? lastSkip : null;
  const live = enabled && credsPresent;

  return (
    <main className="min-h-screen bg-background py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-2">Admin</p>
        <h1 className="font-display text-3xl font-semibold text-foreground">Social posts</h1>
        <p className="text-secondary mt-2">
          Each published news story with a real photo at least {SOCIAL_CONFIG.minPhotoWidth}px wide gets a card and a caption for
          Facebook and Instagram, at most {SOCIAL_CONFIG.maxPostsPerDay} a day. While posting is off, the card and captions are still
          made, so you can see below what would have gone out.
        </p>

        <form action={setSocialPosting.bind(null, !enabled)} className="card p-4 mt-6 flex items-center justify-between gap-4">
          <div className="text-sm text-secondary space-y-1">
            <p>
              Posting is <strong className="text-foreground">{enabled ? 'ON' : 'OFF'}</strong>.{' '}
              {live ? 'New stories go to Facebook and Instagram.' : enabled ? 'Nothing goes out until the Meta settings are added.' : 'Nothing goes out.'}
            </p>
            <p>
              Locked to Facebook Page:{' '}
              <strong className="text-foreground">{target.fbUsername ? `facebook.com/${target.fbUsername}` : 'not set'}</strong>
              {target.pageIdLast4 ? ` (ID …${target.pageIdLast4})` : ''}
            </p>
            <p>
              Locked to Instagram: <strong className="text-foreground">{target.igUsername ? `@${target.igUsername}` : 'not set'}</strong>
              {target.igUserIdLast4 ? ` (ID …${target.igUserIdLast4})` : ''}
            </p>
            <p>
              All five Meta settings present: <strong className="text-foreground">{credsPresent ? 'yes' : 'no'}</strong>
              {!credsPresent && ` (missing: ${Object.entries(target.present).filter(([, v]) => !v).map(([k]) => k).join(', ')})`}
            </p>
            <p>
              Today: {today} of {SOCIAL_CONFIG.maxPostsPerDay} posts (UK day).
            </p>
          </div>
          <button type="submit" className={enabled ? 'btn-secondary shrink-0' : 'btn-primary shrink-0'}>
            {enabled ? 'Switch off' : 'Switch on'}
          </button>
        </form>
        {lockRefusal && (
          <div className="card p-4 mt-3 border-error text-sm" role="alert">
            <p className="font-semibold text-error">Last skip was an account-lock refusal ({when(lockRefusal.created_at)}, {lockRefusal.slug})</p>
            <p className="text-secondary mt-1">{lockRefusal.reason}</p>
            <p className="text-secondary mt-1">
              Nothing was posted and posting was switched off. Check the Meta settings point at Film My Run&apos;s Page and Instagram
              before switching back on (docs/social-posts.md).
            </p>
          </div>
        )}
        <p className="text-xs text-muted mt-2">
          The posts are made by the news run on GitHub, so its secrets are what count; this page can only see the website&apos;s own
          settings on Railway. Before every post the news run asks Meta who the Page, the Instagram account and the token
          really are, and refuses (and switches posting off) unless they are the accounts above.
        </p>

        <div className="card overflow-x-auto mt-8">
          {rows.length === 0 ? (
            <p className="p-6 text-secondary">No stories have reached the social step yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="px-4 py-2 font-medium">Card</th>
                  <th className="px-4 py-2 font-medium">Story</th>
                  <th className="px-4 py-2 font-medium">Outcome</th>
                  <th className="px-4 py-2 font-medium">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3 w-24">
                      {r.card_url ? (
                        <a href={r.card_url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element -- a small admin thumbnail from R2 */}
                          <img src={r.card_url} alt={r.headline ?? 'Social card'} width={80} height={100} className="rounded border border-border" loading="lazy" />
                        </a>
                      ) : (
                        <span className="text-muted">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/news/${r.slug}`} className="text-foreground underline underline-offset-2">{r.headline || r.slug}</a>
                      <p className="text-xs text-muted mt-1">
                        {when(r.created_at)}
                        {r.tag ? ` · ${r.tag}` : ''}
                        {r.cost_usd || r.claude_cost_usd ? ` · OpenRouter $${r.cost_usd.toFixed(3)}, Claude $${r.claude_cost_usd.toFixed(3)}` : ''}
                      </p>
                      {r.caption_facebook && (
                        <details className="mt-1">
                          <summary className="text-xs text-secondary cursor-pointer">Captions</summary>
                          <p className="text-xs text-muted mt-2">Facebook</p>
                          <p className="text-xs text-secondary whitespace-pre-wrap">{r.caption_facebook}</p>
                          <p className="text-xs text-muted mt-2">Instagram</p>
                          <p className="text-xs text-secondary whitespace-pre-wrap">{r.caption_instagram}</p>
                        </details>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${STATUS_STYLE[r.status] ?? 'text-secondary'}`}>{r.status}</span>
                      {r.reason && <p className="text-xs text-secondary mt-1 max-w-xs break-words">{r.reason}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap space-y-1">
                      {r.facebook_url && (
                        <a href={r.facebook_url} target="_blank" rel="noopener noreferrer" className="block text-brand underline">Facebook</a>
                      )}
                      {r.instagram_url && (
                        <a href={r.instagram_url} target="_blank" rel="noopener noreferrer" className="block text-brand underline">Instagram</a>
                      )}
                      {!r.instagram_url && r.instagram_media_id && <span className="block text-xs text-muted">Instagram {r.instagram_media_id}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
