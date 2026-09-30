export type NewsPushArgs =
  | { mode: 'dry-run' }
  | { mode: 'to'; token: string; env: 'sandbox' | 'production' };

/** Parses the script's argv (without node/script). Throws a readable message on bad input. */
export function parseNewsPushArgs(argv: string[]): NewsPushArgs {
  if (argv.includes('--dry-run')) return { mode: 'dry-run' };
  const val = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const token = val('--to');
  const env = val('--env');
  if (token && !token.startsWith('--') && (env === 'sandbox' || env === 'production')) return { mode: 'to', token, env };
  throw new Error('Usage: npx tsx scripts/news-push.ts --dry-run | --to <token> --env sandbox|production');
}

/** Never print a whole token. */
export const tail = (token: string) => `...${token.slice(-6)}`;
