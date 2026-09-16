import { describe, expect, it } from 'vitest';
import { escapeHtml } from './html';

describe('escapeHtml', () => {
  it('escapes &, <, >, and "', () => {
    expect(escapeHtml('Tom & Jerry <script>alert("hi")</script>')).toBe(
      'Tom &amp; Jerry &lt;script&gt;alert(&quot;hi&quot;)&lt;/script&gt;'
    );
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('How do I fuel a 100?')).toBe('How do I fuel a 100?');
  });
});
