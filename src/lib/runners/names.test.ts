import { describe, expect, it } from 'vitest';
import { linkRunners, mentionedSlugs, nameIndex } from './names';

const idx = nameIndex([
  { slug: 'jim-walmsley', name: 'Jim Walmsley', aliases: ['James Walmsley'] },
  { slug: 'kilian-jornet', name: 'Kilian Jornet', aliases: ['Kilian Jornet Burgada', 'Kilian'] },
  { slug: 'ruth-oneill', name: "Ruth O'Neill", aliases: [] },
  { slug: 'david-roche-a', name: 'David Roche', aliases: [] },
  { slug: 'david-roche-b', name: 'David Roche', aliases: [] },
]);
const link = (slug: string, text: string) => `<a href="/runners/${slug}" class="runner-link">${text}</a>`;

describe('the name index', () => {
  it('drops single words and names two runners share', () => {
    expect(idx.has('Kilian')).toBe(false);
    expect(idx.has('David Roche')).toBe(false);
    expect(idx.get('James Walmsley')).toBe('jim-walmsley');
  });
});

describe('linking a story', () => {
  it('links only the first mention of each runner', () => {
    const out = linkRunners('<p>Jim Walmsley won. Jim Walmsley said so.</p>', idx);
    expect(out).toBe(`<p>${link('jim-walmsley', 'Jim Walmsley')} won. Jim Walmsley said so.</p>`);
  });
  it('links a possessive and a curly apostrophe', () => {
    expect(linkRunners("<p>Jim Walmsley's win</p>", idx)).toBe(`<p>${link('jim-walmsley', 'Jim Walmsley')}'s win</p>`);
    expect(linkRunners(`<p>Ruth O’Neill led</p>`, idx)).toBe(`<p>${link('ruth-oneill', `Ruth O’Neill`)} led</p>`);
    expect(linkRunners(`<p>x</p><p>Ruth O‘Neill led</p>`, idx)).toContain(`href="/runners/ruth-oneill"`);
  });
  it('prefers the longest alias and counts it as the runner', () => {
    const out = linkRunners('<p>Kilian Jornet Burgada ran. Kilian Jornet again.</p>', idx);
    expect(out).toBe(`<p>${link('kilian-jornet', 'Kilian Jornet Burgada')} ran. Kilian Jornet again.</p>`);
  });
  it('never links inside a link, a heading or a caption, and moves on to the body', () => {
    const html = '<h2>Jim Walmsley</h2><p><a href="/x">Jim Walmsley</a></p><figcaption>Jim Walmsley</figcaption><p>Then Jim Walmsley.</p>';
    expect(linkRunners(html, idx)).toBe(`<h2>Jim Walmsley</h2><p><a href="/x">Jim Walmsley</a></p><figcaption>Jim Walmsley</figcaption><p>Then ${link('jim-walmsley', 'Jim Walmsley')}.</p>`);
  });
  it('needs whole words and leaves tag attributes alone', () => {
    expect(linkRunners('<p>Jim Walmsleyson</p>', idx)).toBe('<p>Jim Walmsleyson</p>');
    expect(linkRunners('<p><img alt="Jim Walmsley"></p>', idx)).toBe('<p><img alt="Jim Walmsley"></p>');
  });
  it('does not link a shared name', () => {
    expect(linkRunners('<p>David Roche won</p>', idx)).toBe('<p>David Roche won</p>');
  });
});

describe('mentioned runners', () => {
  it('are exactly the ones the story would link', () => {
    expect([...mentionedSlugs('<p>Jim Walmsley beat Kilian Jornet and David Roche.</p>', idx)].sort()).toEqual(['jim-walmsley', 'kilian-jornet']);
  });
});
