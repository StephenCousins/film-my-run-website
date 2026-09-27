export function flagEmoji(iso2: string | null): string {
  if (!iso2 || !/^[a-z]{2}$/i.test(iso2)) return '';
  return String.fromCodePoint(...[...iso2.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
