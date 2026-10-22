import { describe, expect, it } from 'vitest';
import { allow, cleanReply, parseMessages } from './chat';
import { pageSummary } from './html';

describe('parseMessages', () => {
  it('accepts a conversation ending with the visitor', () => {
    expect(parseMessages({ messages: [{ role: 'user', content: ' hi ' }] })).toEqual([{ role: 'user', content: 'hi' }]);
  });
  it('rejects junk, a system role, and a conversation ending with the assistant', () => {
    expect(parseMessages({})).toBe('No message.');
    expect(parseMessages({ messages: [{ role: 'system', content: 'x' }] })).toBe('Invalid message.');
    expect(parseMessages({ messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] })).toBe('Invalid message.');
  });
  it('rejects a long message and keeps only the last 20', () => {
    expect(parseMessages({ messages: [{ role: 'user', content: 'x'.repeat(1001) }] })).toMatch(/under 1000/);
    const many = Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: String(i) }));
    expect((parseMessages({ messages: many }) as unknown[]).length).toBe(20);
  });
});

describe('cleanReply', () => {
  it('replaces em and spaced en dashes', () => {
    expect(cleanReply('He ran — and won – twice. 5–10 km')).toBe('He ran, and won, twice. 5–10 km');
  });
});

describe('allow', () => {
  it('allows 15 messages in ten minutes, then blocks until the window passes', () => {
    const t = 1_000_000_000;
    for (let i = 0; i < 15; i++) expect(allow('ip-a', t + i)).toBe(true);
    expect(allow('ip-a', t + 20)).toBe(false);
    expect(allow('ip-b', t + 20)).toBe(true);
    expect(allow('ip-a', t + 11 * 60_000)).toBe(true);
  });
});

describe('pageSummary', () => {
  it('pulls title, description and main text', () => {
    const html = '<title>Films &amp; More | Film My Run</title><meta name="description" content="Stephen&#x27;s films">' +
      '<nav>menu</nav><main><h1>Films</h1><script>x()</script><p>One&nbsp;two</p></main>';
    expect(pageSummary(html)).toEqual({ title: 'Films & More', description: "Stephen's films", text: 'Films One two' });
  });
});
