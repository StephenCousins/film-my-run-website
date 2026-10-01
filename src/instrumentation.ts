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
      const attempts = { day: '', count: 0 };
      const dispatchTick = async () => {
        try {
          const r = await runNewsDispatch({
            ...(await liveNewsDispatchDeps(new Date(), dispatchToken, attempts)),
            alert: (message, extra) => { Sentry.captureMessage(message, { level: 'error', extra }); },
          });
          if (r.outcome === 'dispatched') console.log(`[news-dispatch] dispatched news-daily, ${attempts.day} attempt ${r.attempt}`);
        } catch (e) {
          Sentry.captureException(e);
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
        const tick = async () => {
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
  }
}

export const onRequestError = Sentry.captureRequestError;
