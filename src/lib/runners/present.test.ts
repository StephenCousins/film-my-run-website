import { describe, expect, it } from 'vitest';
import { flagEmoji } from './flag';
import { personJsonLd } from './present';

describe('page helpers', () => {
  it('a flag from an ISO code, nothing without one', () => {
    expect(flagEmoji('GB')).toBe('🇬🇧');
    expect(flagEmoji('es')).toBe('🇪🇸');
    expect(flagEmoji(null)).toBe('');
    expect(flagEmoji('XYZ')).toBe('');
  });
  it('Person JSON-LD with nationality, photo and source links', () => {
    const ld = personJsonLd({ name: 'Ruth Croft', slug: 'ruth-croft', nationality: 'NZ', photos: [{ kind: 'portrait', url: 'https://r2/p.webp', credit: 'Photo: A', licence: null, source_url: 'https://x' }], bioText: 'Ruth Croft is a New Zealand trail runner.', sameAs: ['https://utmb.world/en/runner/99.ruth.croft'] }) as Record<string, unknown>;
    expect(ld).toMatchObject({ '@type': 'Person', name: 'Ruth Croft', url: 'https://filmmyrun.com/runners/ruth-croft', nationality: 'NZ', image: 'https://r2/p.webp', sameAs: ['https://utmb.world/en/runner/99.ruth.croft'] });
  });
});
