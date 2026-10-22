const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Title (without the " | Film My Run" suffix), meta description and the <main> text of a page. */
export function pageSummary(html: string): { title: string; description: string; text: string } {
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '').replace(/\s*\|\s*Film My Run\s*$/, '').trim();
  const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '').trim();
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
  const text = decode(main.replace(/<(script|style|svg)[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  return { title, description, text };
}
