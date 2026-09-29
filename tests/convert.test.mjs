import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { visibleText, decodeEntities } from '../scripts/lib/text.mjs';
import { splitFullUrl, isoDate, cleanBody, droppedTags, parseSeo, itemToFile } from '../scripts/lib/convert.mjs';

const exp = JSON.parse(readFileSync('tests/fixtures/experience-item.json', 'utf8'));
const per = JSON.parse(readFileSync('tests/fixtures/perspectives-item.json', 'utf8'));

test('splitFullUrl parses collection and slug, rejects unknown collections', () => {
  assert.deepEqual(splitFullUrl('/team/chad-harding'), { collection: 'team', slug: 'chad-harding' });
  assert.throws(() => splitFullUrl('/blog/x'), /unexpected fullUrl/);
});

test('isoDate converts epoch ms to UTC date', () => {
  assert.equal(isoDate(1787592365954), '2026-08-24');
});

test('cleanBody removes wrappers, classes, scripts and noscript duplicates', () => {
  const html = '<div class="sqs-block"><div class="sqs-block-content"><p class="x" style="a">Hello <strong>World</strong></p><img data-src="https://images.squarespace-cdn.com/a/b.png?format=1500w" src="data:x"><noscript><img src="https://images.squarespace-cdn.com/a/b.png"></noscript><script>bad()</script></div></div>';
  const out = cleanBody(html);
  assert.equal(out, '<p>Hello <strong>World</strong></p><img src="https://images.squarespace-cdn.com/a/b.png" alt="" />');
});

test('cleanBody preserves visible text of real fixtures', () => {
  for (const item of [exp, per]) assert.equal(visibleText(cleanBody(item.body)), visibleText(item.body));
});

test('droppedTags reports non-allowlisted, non-wrapper tags', () => {
  assert.deepEqual(droppedTags('<div><iframe src="x"></iframe><p>a</p><video></video></div>'), ['iframe', 'video']);
});

test('parseSeo reads title, description and og:image', () => {
  const html = '<head><title>Chad Harding &mdash; Peak Technology Partners</title><meta name="description" content=" Chad is a Managing Partner"><meta property="og:image" content="http://static1.squarespace.com/x.jpg?format=1500w"></head>';
  assert.deepEqual(parseSeo(html), { title: 'Chad Harding — Peak Technology Partners', description: 'Chad is a Managing Partner', ogImage: 'http://static1.squarespace.com/x.jpg?format=1500w' });
});

test('itemToFile round-trips curly quotes and ampersands exactly (Review Focus 3)', () => {
  const f = itemToFile(per, {}, 0);
  assert.equal(f.path, 'src/perspectives/the-saaspocalypse-accelerated-mergers-and-acquisitions.md');
  const parsed = matter(f.text);
  assert.equal(parsed.data.title, decodeEntities(per.title));
  assert.match(parsed.data.title, /“SaaSpocalypse” Didn’t Slow Down M&A/);
});

test('itemToFile maps fields and keeps order', () => {
  const f = itemToFile(exp, { title: 'T', description: 'D', ogImage: 'O' }, 7);
  const { data, content } = matter(f.text);
  assert.equal(data.date, '2026-08-24');
  assert.deepEqual(data.categories, exp.categories);
  assert.equal(data.image, exp.assetUrl);
  assert.equal(data.sqsOrder, 7);
  assert.equal(data.sqsId, exp.id);
  assert.equal(data.seoTitle, 'T');
  assert.equal(visibleText(content), visibleText(exp.body));
});

test('itemToFile drops lorem-ipsum placeholder excerpts, keeps real ones', () => {
  const lorem = { ...exp, fullUrl: '/team/x', excerpt: '<p>Lorem ipsum dolor sit amet</p>' };
  assert.equal(matter(itemToFile(lorem, {}, 0).text).data.excerpt, '');
  const real = { ...exp, excerpt: '<p>Real summary</p>' };
  assert.equal(matter(itemToFile(real, {}, 0).text).data.excerpt, '<p>Real summary</p>');
});
