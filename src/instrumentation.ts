import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: 0.1,
    });

    // Early news: the server dispatches the GitHub news workflow from 05:30 London if today's run hasn't completed
    // (GitHub's own cron starts hours late). Independent of the push.
    const dg = globalThis as { __newsDispatchTimer?: NodeJS.Timeout };
    const dispatchToken = process.env.NEWS_DISPATCH_TOKEN;
    if (process.env.NODE_ENV === 'production' && dispatchToken && !dg.__newsDispatchTimer) {
      const { runNewsDispatch, liveNewsDispatchDeps } = await import('@/lib/news/dispatch');
      const attempts = { day: '', count: 0, tries: 0, alerted: false };
      let running = false;
      const dispatchTick = async () => {
        if (running) return;
        running = true;
        try {
          const r = await runNewsDispatch({
            ...(await liveNewsDispatchDeps(new Date(), dispatchToken, attempts)),
            alert: (message, extra) => { Sentry.captureMessage(message, { level: 'error', extra }); },
          });
          if (r.outcome === 'dispatched') console.log(`[news-dispatch] dispatched news-daily, ${attempts.day} attempt ${r.attempt}`);
        } catch (e) {
          Sentry.captureException(e);
        } finally {
          running = false;
        }
      };
      dg.__newsDispatchTimer = setInterval(dispatchTick, 5 * 60_000);
      dg.__newsDispatchTimer.unref();
      console.log('[news-dispatch] timer on');
    }

    // Daily news push: a 5-minute tick that only acts in the London send window.
    // register() can run more than once in dev, so start the timer once per process.
    const g = globalThis as { __newsPushTimer?: NodeJS.Timeout };
    if (process.env.NODE_ENV === 'production' && process.env.NEWS_PUSH_ENABLED === '1' && !g.__newsPushTimer) {
      const { apnsConfig } = await import('@/lib/push/apns');
      const config = apnsConfig();
      if (!config) {
        console.log('[news-push] APNS_* not set, daily push disabled');
      } else {
        const { runNewsPush, prismaNewsPushDeps } = await import('@/lib/push/news-push');
        const { runBreakingPush, prismaBreakingPushDeps } = await import('@/lib/push/breaking-push');
        const tick = async () => {
          // Breaking news first (a story Stephen published by hand, any time 07:00-22:00), then the morning push.
          try {
            const b = await runBreakingPush(await prismaBreakingPushDeps(await prismaNewsPushDeps(new Date(), config)));
            if (b.outcome === 'sent') console.log(`[news-push] breaking ${b.slug} to ${b.recipients} devices, ${b.failures} failures`);
          } catch (e) {
            Sentry.captureException(e);
          }
          try {
            const r = await runNewsPush({
              ...(await prismaNewsPushDeps(new Date(), config)),
              alert: (message, extra) => { Sentry.captureMessage(message, { level: 'error', extra }); },
            });
            if (r.outcome === 'sent') console.log(`[news-push] sent ${r.slug} to ${r.recipients} devices, ${r.failures} failures`);
          } catch (e) {
            Sentry.captureException(e);
          }
        };
        g.__newsPushTimer = setInterval(tick, 5 * 60_000);
        g.__newsPushTimer.unref();
        console.log('[news-push] daily push timer on');
      }
    }
    // Go-live push: a 60-second tick on zwift.run's live feed. Independent of NEWS_PUSH_ENABLED.
    const lg = globalThis as { __livePushTimer?: NodeJS.Timeout };
    if (process.env.NODE_ENV === 'production' && process.env.LIVE_PUSH_ENABLED === '1' && !lg.__livePushTimer) {
      const { apnsConfig } = await import('@/lib/push/apns');
      const config = apnsConfig();
      if (!config) {
        console.log('[live-push] APNS_* not set, live push disabled');
      } else {
        const { runLivePush, prismaLivePushDeps } = await import('@/lib/push/live-push');
        const { prismaNewsPushDeps } = await import('@/lib/push/news-push');
        lg.__livePushTimer = setInterval(async () => {
          try {
            const r = await runLivePush(await prismaLivePushDeps(await prismaNewsPushDeps(new Date(), config)));
            if (r.outcome === 'sent') console.log(`[live-push] ${r.id} to ${r.recipients} devices, ${r.failures} failures`);
          } catch (e) {
            Sentry.captureException(e);
          }
        }, 60_000);
        lg.__livePushTimer.unref();
        console.log('[live-push] timer on');
      }
    }
    // Monday newsletter draft from 07:00 London, and an email to the admin at noon if there still isn't one
    // (src/lib/newsletter/weekly.ts). The GitHub workflow is only a late backup now; staging is once a day either way.
    const ng = globalThis as { __newsletterTimer?: NodeJS.Timeout };
    if (process.env.NODE_ENV === 'production' && !ng.__newsletterTimer) {
      const { runWeeklyNewsletter } = await import('@/lib/newsletter/weekly');
      const { stageDraft, issueToday, emailAdmin, baseUrl } = await import('@/lib/newsletter/stage');
      const { DEFAULT_SUBJECT } = await import('@/lib/newsletter-auto-populate');
      const state = { day: '', tries: 0, alerted: false };
      let running = false;
      const tick = async () => {
        if (running) return;
        running = true;
        try {
          const r = await runWeeklyNewsletter({
            now: new Date(),
            state,
            issueToday: async () => !!(await issueToday()),
            stage: async () => {
              const s = await stageDraft({ subject: DEFAULT_SUBJECT });
              console.log(`[newsletter] ${s.status} #${s.issueId}${s.status === 'draft' ? `, ${s.warnings.length} warnings` : ''}`);
            },
            alert: async () => {
              Sentry.captureMessage('[newsletter] no draft by noon', { level: 'error' });
              await emailAdmin(
                'No newsletter draft this Monday',
                `The weekly newsletter draft wasn't made this morning (3 tries from 07:00 failed).\n\n` +
                  `Make it by hand: https://github.com/StephenCousins/film-my-run-website/actions/workflows/weekly-newsletter.yml (Run workflow), ` +
                  `or ask Claude Code to stage it. Server logs on Railway show the error ([newsletter]).\n\n${baseUrl()}`,
              );
            },
          });
          if (r.outcome === 'error') {
            console.error(`[newsletter] ${r.error}`);
            Sentry.captureMessage('[newsletter] staging failed', { level: 'warning', extra: { error: r.error } });
          }
        } catch (e) {
          Sentry.captureException(e);
        } finally {
          running = false;
        }
      };
      ng.__newsletterTimer = setInterval(tick, 5 * 60_000);
      ng.__newsletterTimer.unref();
      console.log('[newsletter] Monday timer on');
    }

    // Ask Wilson log: delete rows older than 90 days, at start-up and then daily.
    const wg = globalThis as { __wilsonPurgeTimer?: NodeJS.Timeout };
    if (process.env.NODE_ENV === 'production' && !wg.__wilsonPurgeTimer) {
      const { purgeWilsonLog } = await import('@/lib/wilson-assistant/purge');
      const purge = () => purgeWilsonLog().then((n) => n && console.log(`[wilson-purge] deleted ${n} rows`)).catch((e) => { Sentry.captureException(e); });
      void purge();
      wg.__wilsonPurgeTimer = setInterval(purge, 24 * 3_600_000);
      wg.__wilsonPurgeTimer.unref();
    }
  }
}

export const onRequestError = Sentry.captureRequestError;
