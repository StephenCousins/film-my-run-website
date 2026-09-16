import { describe, expect, it } from 'vitest';
import { buildReplyEmail } from './reply-email';

describe('buildReplyEmail', () => {
  it('carries the reply text and points back to the app', () => {
    const r = buildReplyEmail({ name: 'Jo', text: 'Fuel little and often <3' });
    expect(r.subject).toBe('Stephen has replied');
    expect(r.text).toContain('Fuel little and often <3');
    expect(r.text).toContain('Open Film My Run to see the whole conversation.');
    expect(r.html).toContain('Open Film My Run to see the whole conversation.');
    expect(r.html).toContain('&lt;3');
  });
});
