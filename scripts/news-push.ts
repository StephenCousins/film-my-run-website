// Manual tool for the daily news push. Neither mode claims the day.
//   npx tsx scripts/news-push.ts --dry-run
//   npx tsx scripts/news-push.ts --to <token> --env sandbox|production
import { apnsConfig, sendApns } from '../src/lib/push/apns';
import { inSendWindow, londonClock, newsPayload, pickStory, prismaNewsPushDeps } from '../src/lib/push/news-push';
import { parseNewsPushArgs, tail } from '../src/lib/push/news-push-args';

async function main() {
  const args = parseNewsPushArgs(process.argv.slice(2));
  const config = apnsConfig();
  if (!config) throw new Error('APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY and APNS_TOPIC must all be set');
  const now = new Date();
  const deps = await prismaNewsPushDeps(now, config, true);

  if (args.mode === 'dry-run') {
    const clock = londonClock(now);
    console.log(`London: ${clock.day} ${Math.floor(clock.minutes / 60)}:${String(clock.minutes % 60).padStart(2, '0')}, in send window: ${inSendWindow(now)}`);
    console.log(`Already sent today: ${await deps.alreadySent(clock.day)}`);
    const story = pickStory(await deps.feed(), await deps.lastSentSlug());
    console.log(story ? `Would send: ${story.slug} - "${story.title}"` : 'No new story to send');
    const devices = await deps.devices();
    for (const env of ['sandbox', 'production'] as const) console.log(`${env}: ${devices.filter((d) => d.environment === env).length} devices`);
    return;
  }

  const top = (await deps.feed())[0];
  if (!top) throw new Error('The feed has no stories');
  const res = await sendApns(config, { token: args.token, environment: args.env, payload: newsPayload(top) });
  console.log(`Sent "${top.slug}" to ${tail(args.token)} (${args.env}): ${res.status}${res.reason ? ` ${res.reason}` : ''}`);
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(async () => { try { await (await import('../src/lib/db')).prisma.$disconnect(); } catch {} });
