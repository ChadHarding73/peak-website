import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSummary } from '../scripts/lib/cards.mjs';

const item = (slug, data) => ({ url: `/experience/${slug}/`, data: { title: slug, image: `/images/experience/${slug}.png`, categories: [], excerpt: '', date: new Date('2026-08-24T00:00:00Z'), ...data } });
const collections = {
  experience: [item('a', { title: 'M&A <deal>' }), item('b'), item('c')],
  team: [item('chad', { categories: ['Managing Partner'] })],
};

test('latest N renders the first N items in collection order with lowercase canonical links', () => {
  const html = renderSummary(collections, JSON.stringify({ collection: 'experience', latest: 2, design: 'autogrid', meta: 'date', metaPosition: 'below-content', excerpt: false, readMore: false, perRow: 3, gutter: 60 }));
  assert.equal((html.match(/class="card"/g) || []).length, 2);
  assert.match(html, /M&amp;A &lt;deal&gt;/);
  assert.match(html, /href="\/experience\/a"/);
  assert.match(html, /<time class="card__meta" datetime="2026-08-24">August 24, 2026<\/time>/);
  assert.match(html, /class="summary summary--autogrid summary--experience" style="--per-row: 3; --gutter: 60px"/);
});

test('explicit slugs render in the given order and skip unknown slugs', () => {
  const html = renderSummary(collections, JSON.stringify({ collection: 'experience', slugs: ['c', 'missing', 'a'], design: 'carousel', meta: 'none', metaPosition: 'above-title', excerpt: true, readMore: true }));
  const titles = [...html.matchAll(/class="card__title"><a [^>]*>([^<]*)</g)].map(m => m[1]);
  assert.deepEqual(titles, ['c', 'M&amp;A &lt;deal&gt;']);
  assert.match(html, /class="card__more" href="\/experience\/c">Read more →<\/a>/);
  assert.match(html, /summary--carousel/);
});

test('category metadata shows below the title', () => {
  const html = renderSummary(collections, JSON.stringify({ collection: 'team', latest: 1, design: 'autogrid', meta: 'cats', metaPosition: 'below-title', excerpt: false, readMore: false }));
  assert.match(html, /class="card__title"><a href="\/experience\/chad">chad<\/a><\/h3><p class="card__meta">Managing Partner<\/p>/);
});
