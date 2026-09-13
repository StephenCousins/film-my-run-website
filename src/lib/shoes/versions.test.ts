import { describe, it, expect } from 'vitest';
import { parseModelVersion, findVersionConflict, isSameLine, getAdjacentVersionStrings } from './versions';

describe('parseModelVersion', () => {
  it('parses plain numbers', () => {
    expect(parseModelVersion('Clifton 10')).toMatchObject({ base: 'Clifton', versionNum: 10, pattern: 'number' });
  });
  it('parses v-prefix', () => {
    expect(parseModelVersion('Fresh Foam X 1080 V14')).toMatchObject({ base: 'Fresh Foam X 1080', versionNum: 14, pattern: 'v-prefix' });
  });
  it('parses roman numerals', () => {
    expect(parseModelVersion('Ultra Raptor II')).toMatchObject({ base: 'Ultra Raptor', versionNum: 2, pattern: 'roman' });
  });
  it('parses X-series', () => {
    expect(parseModelVersion('Mafate X2')).toMatchObject({ base: 'Mafate X', versionNum: 2, pattern: 'x-series' });
  });
  it('treats a trailing GTX as no version', () => {
    expect(parseModelVersion('Speedgoat 6 GTX').pattern).toBe('none');
  });
});

describe('findVersionConflict', () => {
  it('flags a neighbouring version when the exact model is absent', () => {
    expect(findVersionConflict('Ghost 16', 'Brooks Ghost 15 review')).toBe('Ghost 15');
  });
  it('does not flag when the exact model is present', () => {
    expect(findVersionConflict('Ghost 16', 'Ghost 16 vs Ghost 15')).toBeNull();
  });
});

describe('isSameLine', () => {
  it('matches the same base with different versions', () => {
    expect(isSameLine('Clifton 9', 'Clifton 10')).toBe(true);
  });
  it('rejects different bases', () => {
    expect(isSameLine('Clifton 10', 'Bondi 9')).toBe(false);
  });
  it('is case-insensitive', () => {
    expect(isSameLine('clifton 9', 'CLIFTON 10')).toBe(true);
  });
});

describe('getAdjacentVersionStrings', () => {
  it('returns neighbours -2..+3 excluding self', () => {
    expect(getAdjacentVersionStrings('Ghost 16')).toEqual(['Ghost 14', 'Ghost 15', 'Ghost 17', 'Ghost 18', 'Ghost 19']);
  });
});
