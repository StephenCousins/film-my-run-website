import { describe, it, expect, vi } from 'vitest';
import { renderDigest, discoverySummary, publishToken, verifyPublishToken, sendDigest, type SendDeps, DIGEST_TO } from './digest';
import type { JobReport } from './weekly';

const report = (over: Partial<JobReport> = {}): JobReport => ({
  discovered: 5,
  nominations: { feeds: 6, shops: 5, versionBumps: 3 },
  published: [{ slug: 'hoka-clifton-10', imageUrl: 'https://r2/x.jpg' }],
  publishedWithoutImage: [],
  linkedExisting: [],
  held: [{ id: 3, slug: 'nike-pegasus-42', reasons: ['reviews_lt_2'] }],
  errored: [],
  rejectedStale: 1,
  reviewsRefreshed: 2,
  imagesStored: ['a'],
  imagesCleared: ['b'],
  feedsEmpty: ['believe_in_run'],
  storesEmpty: ['shopify:nordarun.com (unreachable:503)', 'version-bump:kicksown.com'],
  durationMs: 1000,
  dryRun: false,
  ...over,
});

describe('digest', () => {
  it('summarises discovery in one line: counts by source kind, then the quiet feeds and stores', () => {
    expect(discoverySummary(report())).toBe('Discovered 5 from 14 nominations (feeds 6, shops 5, version bumps 3); feeds empty: believe_in_run; stores empty: shopify:nordarun.com (unreachable:503), version-bump:kicksown.com');
    expect(discoverySummary(report({ discovered: 0, nominations: { feeds: 0, shops: 0, versionBumps: 0 }, feedsEmpty: [], storesEmpty: [] }))).toBe('Discovered 0 from 0 nominations (feeds 0, shops 0, version bumps 0); feeds empty: none; stores empty: none');
    const d = renderDigest(report(), 'https://filmmyrun.com', () => '');
    expect(d.text).toContain('Discovered 5 from 14 nominations (feeds 6, shops 5, version bumps 3)');
    expect(d.html).toContain('Discovered 5 from 14 nominations (feeds 6, shops 5, version bumps 3)');
    expect(d.html).toContain('Stores that returned nothing (2)');
    expect(d.html).toContain('<li>shopify:nordarun.com (unreachable:503)</li>');
  });
  it('renders published, held with publish links, cleared images, empty feeds', () => {
    process.env.CRON_SECRET = 'test';
    const d = renderDigest(report(), 'https://filmmyrun.com', id => `https://filmmyrun.com/api/shoes/candidates/${id}/publish?token=${publishToken(id)}`);
    expect(d.subject).toContain('1 published');
    expect(d.subject).toContain('1 held');
    expect(d.subject).toContain('0 errors');
    expect(d.html).toContain('hoka-clifton-10');
    expect(d.html).toContain('<a href="https://filmmyrun.com/api/shoes/hoka-clifton-10"');
    expect(d.html).toContain('<a href="https://filmmyrun.com/tools/shoe-finder"');
    expect(d.html).not.toContain('/tools/shoe-finder/hoka-clifton-10');
    expect(d.text).toContain('data: https://filmmyrun.com/api/shoes/hoka-clifton-10 finder: https://filmmyrun.com/tools/shoe-finder');
    expect(d.html).toContain(`/api/shoes/candidates/3/publish?token=${publishToken(3)}`);
    expect(d.html).toContain('reviews_lt_2');
    expect(d.html).toContain('believe_in_run');
    expect(d.html).toContain('<li>b <a href="https://filmmyrun.com/api/shoes/b"');
    expect(d.text).toContain('hoka-clifton-10');
    expect(d.text).toContain(`/api/shoes/candidates/3/publish?token=${publishToken(3)}`);
  });
  it('escapes HTML in every string and flags a dry run', () => {
    process.env.CRON_SECRET = 'test';
    const d = renderDigest(report({ dryRun: true, errored: [{ slug: 'x<script>', error: 'boom & "bust"' }] }), 'https://filmmyrun.com', id => `t${id}`);
    expect(d.html).not.toContain('x<script>');
    expect(d.html).toContain('x&lt;script&gt;');
    expect(d.html).toContain('boom &amp; &quot;bust&quot;');
    expect(d.subject).toContain('dry run');
    expect(d.subject).toContain('1 error');
  });
  it('lists shoes published without an image and candidates linked to existing shoes', () => {
    process.env.CRON_SECRET = 'test';
    const d = renderDigest(report({ published: [{ slug: 'brooks-ghost-17', imageUrl: null }], publishedWithoutImage: ['brooks-ghost-17'], linkedExisting: ['asics-novablast-5'] }), 'https://filmmyrun.com', id => `t${id}`);
    expect(d.html).toContain('brooks-ghost-17');
    expect(d.text).toContain('no image');
    expect(d.text).toContain('asics-novablast-5');
  });
  it('an error note containing a URL is plain text, only held rows get the publish anchor', () => {
    process.env.CRON_SECRET = 'test';
    const d = renderDigest(report({ held: [], errored: [{ slug: 'x', error: 'fetch https://x failed' }] }), 'https://filmmyrun.com', id => `https://filmmyrun.com/p/${id}`);
    const errorsSection = d.html.slice(d.html.indexOf('Errors ('), d.html.indexOf('Images stored ('));
    expect(errorsSection).toContain('fetch https://x failed');
    expect(errorsSection).not.toContain('<a');
    const held = renderDigest(report(), 'https://filmmyrun.com', id => `https://filmmyrun.com/p/${id}`);
    expect(held.html).toContain('<a href="https://filmmyrun.com/p/3"');
  });
  it('without CRON_SECRET tokens cannot be made and never verify', () => {
    process.env.CRON_SECRET = 'test';
    const t = publishToken(3);
    delete process.env.CRON_SECRET;
    expect(() => publishToken(3)).toThrow('CRON_SECRET');
    expect(verifyPublishToken(3, t)).toBe(false);
    expect(verifyPublishToken(3, '')).toBe(false);
    process.env.CRON_SECRET = '';
    expect(verifyPublishToken(3, t)).toBe(false);
  });
  it('sendDigest skips without CRON_SECRET', async () => {
    delete process.env.CRON_SECRET;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sent: unknown[] = [];
    expect(await sendDigest(report(), { apiKey: 'key', baseUrl: 'b', send: async msg => { sent.push(msg); return { error: null }; } })).toBe(false);
    expect(sent).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
  it('tokens verify and reject', () => {
    process.env.CRON_SECRET = 'test';
    expect(verifyPublishToken(3, publishToken(3))).toBe(true);
    expect(verifyPublishToken(4, publishToken(3))).toBe(false);
    expect(verifyPublishToken(3, 'short')).toBe(false);
    expect(verifyPublishToken(3, '')).toBe(false);
  });
  it('tokens change with the secret', () => {
    process.env.CRON_SECRET = 'one';
    const a = publishToken(3);
    process.env.CRON_SECRET = 'two';
    expect(publishToken(3)).not.toBe(a);
    expect(verifyPublishToken(3, a)).toBe(false);
  });
  it('sendDigest sends to Stephen with the rendered subject', async () => {
    process.env.CRON_SECRET = 'test';
    const sent: unknown[] = [];
    const deps: SendDeps = { apiKey: 'key', baseUrl: 'https://filmmyrun.com', send: async msg => { sent.push(msg); return { error: null }; } };
    expect(await sendDigest(report(), deps)).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: DIGEST_TO, subject: expect.stringContaining('1 published') });
  });
  it('sendDigest rejects when Resend answers with an error instead of a throw', async () => {
    process.env.CRON_SECRET = 'test';
    const deps: SendDeps = { apiKey: 'key', baseUrl: 'https://filmmyrun.com', send: async () => ({ error: { name: 'validation_error', message: 'The from domain is not verified' } }) };
    await expect(sendDigest(report(), deps)).rejects.toThrow('Resend: validation_error: The from domain is not verified');
  });
  it('sendDigest skips on dry run and when there is no key', async () => {
    const sent: unknown[] = [];
    const send = async (msg: unknown) => { sent.push(msg); return { error: null }; };
    expect(await sendDigest(report({ dryRun: true }), { apiKey: 'key', baseUrl: 'b', send })).toBe(false);
    expect(await sendDigest(report(), { apiKey: undefined, baseUrl: 'b', send })).toBe(false);
    expect(sent).toEqual([]);
  });
});
