import { describe, expect, it } from 'vitest';
import { buildStephenEmail } from './notify';

describe('buildStephenEmail', () => {
  it('builds the subject, thread link and escaped html', () => {
    const r = buildStephenEmail({ threadId: 't1', name: 'Jo', email: 'jo@example.com', text: 'Hi <script>alert(1)</script>' });
    expect(r.subject).toBe('Ask Stephen: Jo');
    expect(r.text).toContain('Hi <script>alert(1)</script>');
    expect(r.text).toContain('https://filmmyrun.com/admin/inbox/t1');
    expect(r.html).toContain('https://filmmyrun.com/admin/inbox/t1');
    expect(r.html).not.toContain('<script>alert(1)</script>');
    expect(r.html).toContain('&lt;script&gt;');
  });
});
