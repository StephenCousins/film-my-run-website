// Shared utilities for shoe data accuracy — version parsing, conflict detection, URL matching

/**
 * Parse a shoe model name to extract base name and version info.
 *   "Clifton 9"           → { base: "Clifton",           version: "9",   versionNum: 9,  pattern: "number"   }
 *   "Tecton X2"           → { base: "Tecton X",          version: "2",   versionNum: 2,  pattern: "x-series" }
 *   "Fresh Foam X 1080 v13" → { base: "Fresh Foam X 1080", version: "v13", versionNum: 13, pattern: "v-prefix" }
 *   "Bushido III"          → { base: "Bushido",           version: "III", versionNum: 3,  pattern: "roman"    }
 *   "Mont Blanc Carbon"    → { base: "Mont Blanc Carbon", version: null,  versionNum: null, pattern: "none"  }
 */
export function parseModelVersion(model) {
  // "Tecton X2" — letter X immediately followed by digit(s)
  const xMatch = model.match(/^(.+?X)(\d+)$/);
  if (xMatch) {
    return { base: xMatch[1], version: xMatch[2], versionNum: parseInt(xMatch[2]), pattern: 'x-series' };
  }

  // "Fresh Foam X 1080 v13", "Trailfly G 300 V2" — v/V prefix
  const vMatch = model.match(/^(.+?)\s+[vV](\d+)$/);
  if (vMatch) {
    return { base: vMatch[1], version: `v${vMatch[2]}`, versionNum: parseInt(vMatch[2]), pattern: 'v-prefix' };
  }

  // "Bushido III", "Jackal II" — Roman numerals
  const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
  const romanMatch = model.match(/^(.+?)\s+(I{1,3}|IV|VI{0,3}|V|VIII|IX|X)$/);
  if (romanMatch && ROMAN_MAP[romanMatch[2]] !== undefined) {
    return { base: romanMatch[1], version: romanMatch[2], versionNum: ROMAN_MAP[romanMatch[2]], pattern: 'roman' };
  }

  // "Clifton 9", "Ghost 16", "Pegasus 41" — trailing number
  const numMatch = model.match(/^(.+?)\s+(\d+)$/);
  if (numMatch) {
    return { base: numMatch[1], version: numMatch[2], versionNum: parseInt(numMatch[2]), pattern: 'number' };
  }

  return { base: model, version: null, versionNum: null, pattern: 'none' };
}

/**
 * Generate model-name strings for adjacent versions.
 *   "Clifton 9" → ["Clifton 7", "Clifton 8", "Clifton 10", "Clifton 11", "Clifton 12"]
 */
export function getAdjacentVersionStrings(model) {
  const { base, versionNum, pattern } = parseModelVersion(model);
  if (versionNum === null) return [];

  const ROMANS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const result = [];

  for (let delta = -2; delta <= 3; delta++) {
    if (delta === 0) continue;
    const v = versionNum + delta;
    if (v < 1) continue;

    switch (pattern) {
      case 'x-series':
        result.push(`${base}${v}`);
        break;
      case 'v-prefix':
        result.push(`${base} v${v}`);
        result.push(`${base} V${v}`);
        break;
      case 'roman':
        if (v <= 10) result.push(`${base} ${ROMANS[v]}`);
        break;
      case 'number':
        result.push(`${base} ${v}`);
        break;
    }
  }
  return result;
}

/**
 * Check if text mentions an adjacent version WITHOUT mentioning the correct version.
 * Returns the conflicting version string, or null if no conflict.
 */
export function findVersionConflict(model, text) {
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

/**
 * Check if text mentions BOTH the correct model AND an adjacent version.
 * This suggests a comparison article — needs extra scrutiny.
 */
export function isComparisonArticle(model, text) {
  const textLower = text.toLowerCase();
  const modelLower = model.toLowerCase();
  if (!textLower.includes(modelLower)) return false;

  const adjacents = getAdjacentVersionStrings(model);
  return adjacents.some(adj => textLower.includes(adj.toLowerCase()));
}

/**
 * Check if a URL slug corresponds to a shoe model.
 *   url: "runrepeat.com/hoka-clifton-9", brand: "Hoka", model: "Clifton 9" → true
 */
export function urlMatchesShoe(url, brand, model) {
  const slug = `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-');
  return url.toLowerCase().includes(slug);
}

/**
 * Generate a slug from brand and model.
 */
export function shoeToSlug(brand, model) {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Sleep for ms milliseconds.
 */
export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
