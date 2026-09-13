export interface VersionInfo {
  base: string;
  version: string | null;
  versionNum: number | null;
  pattern: 'x-series' | 'v-prefix' | 'roman' | 'number' | 'none';
}

export function parseModelVersion(model: string): VersionInfo {
  const xMatch = model.match(/^(.+?X)(\d+)$/);
  if (xMatch) {
    return { base: xMatch[1], version: xMatch[2], versionNum: parseInt(xMatch[2]), pattern: 'x-series' };
  }

  const vMatch = model.match(/^(.+?)\s+[vV](\d+)$/);
  if (vMatch) {
    return { base: vMatch[1], version: `v${vMatch[2]}`, versionNum: parseInt(vMatch[2]), pattern: 'v-prefix' };
  }

  const ROMAN_MAP: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
  const romanMatch = model.match(/^(.+?)\s+(I{1,3}|IV|VI{0,3}|V|VIII|IX|X)$/);
  if (romanMatch && ROMAN_MAP[romanMatch[2]] !== undefined) {
    return { base: romanMatch[1], version: romanMatch[2], versionNum: ROMAN_MAP[romanMatch[2]], pattern: 'roman' };
  }

  const numMatch = model.match(/^(.+?)\s+(\d+)$/);
  if (numMatch) {
    return { base: numMatch[1], version: numMatch[2], versionNum: parseInt(numMatch[2]), pattern: 'number' };
  }

  return { base: model, version: null, versionNum: null, pattern: 'none' };
}

export function getAdjacentVersionStrings(model: string): string[] {
  const { base, versionNum, pattern } = parseModelVersion(model);
  if (versionNum === null) return [];

  const ROMANS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const result: string[] = [];

  for (let delta = -2; delta <= 3; delta++) {
    if (delta === 0) continue;
    const v = versionNum + delta;
    if (v < 1) continue;

    switch (pattern) {
      case 'x-series': result.push(`${base}${v}`); break;
      case 'v-prefix': result.push(`${base} v${v}`); result.push(`${base} V${v}`); break;
      case 'roman': if (v <= 10) result.push(`${base} ${ROMANS[v]}`); break;
      case 'number': result.push(`${base} ${v}`); break;
    }
  }
  return result;
}

export function findVersionConflict(model: string, text: string): string | null {
  const textLower = text.toLowerCase();
  const modelLower = model.toLowerCase();
  const adjacents = getAdjacentVersionStrings(model);

  for (const adj of adjacents) {
    if (textLower.includes(adj.toLowerCase()) && !textLower.includes(modelLower)) {
      return adj;
    }
  }
  return null;
}

export function isComparisonArticle(model: string, text: string): boolean {
  const textLower = text.toLowerCase();
  const modelLower = model.toLowerCase();
  if (!textLower.includes(modelLower)) return false;
  const adjacents = getAdjacentVersionStrings(model);
  return adjacents.some(adj => textLower.includes(adj.toLowerCase()));
}

export function isSameLine(a: string, b: string): boolean {
  return parseModelVersion(a).base.toLowerCase().trim() === parseModelVersion(b).base.toLowerCase().trim();
}
