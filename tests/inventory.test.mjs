import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeEntities, visibleText } from '../scripts/lib/text.mjs';
import { toPath, pathKey, parseSitemap, extractLinks, addUnique } from '../scripts/lib/inventory.mjs';

test('decodeEntities handles named and numeric entities', () => {
  assert.equal(decodeEntities('M&amp;A &#8220;x&#8221; &rsquo; &#x2014;'), 'M&A “x” ’ —');
});

test('visibleText drops script/style/noscript and collapses whitespace', () => {
  assert.equal(visibleText('<p>Hi <b>there</b></p><script>x()</script><noscript><img></noscript>\n<p>A&amp;B</p>'), 'Hi there A&B');
});

test('toPath keeps internal paths, strips query/hash/trailing slash', () => {
  assert.equal(toPath('https://www.peak-tech.com/team/chad-harding/?x=1#top'), '/team/chad-harding');
  assert.equal(toPath('https://peak-tech.com/people'), '/people');
  assert.equal(toPath('/experience?offset=1690387721108'), '/experience');
  assert.equal(toPath('/'), '/');
});

test('toPath rejects external, mailto, tel and Squarespace system paths', () => {
  assert.equal(toPath('https://www.linkedin.com/company/x'), null);
  assert.equal(toPath('mailto:chad@peak-tech.com'), null);
  assert.equal(toPath('tel:+14155551212'), null);
  assert.equal(toPath('/config/pages'), null);
  assert.equal(toPath('/cart'), null);
});

test('toPath preserves percent-encoding exactly as linked (Review Focus 1)', () => {
  assert.equal(toPath('/experience/category/Merger+%26+Acquisition'), '/experience/category/Merger+%26+Acquisition');
  assert.equal(toPath('/experience/category/Merger+&amp;+Acquisition'), '/experience/category/Merger+&+Acquisition');
});

test('pathKey dedupes encoded and decoded forms; + stays literal', () => {
  assert.equal(pathKey('/experience/category/Merger+%26+Acquisition'), '/experience/category/Merger+&+Acquisition');
  assert.equal(pathKey('/experience/category/Merger+&+Acquisition'), '/experience/category/Merger+&+Acquisition');
});

test('parseSitemap returns paths', () => {
  const xml = '<urlset><url><loc>https://www.peak-tech.com/people</loc></url><url><loc> https://www.peak-tech.com/team/chad-harding </loc></url></urlset>';
  assert.deepEqual(parseSitemap(xml), ['/people', '/team/chad-harding']);
});

test('extractLinks decodes &amp; in hrefs and resolves relative links', () => {
  const html = '<a href="/experience/category/SaaS">x</a><a href="https://x.com">y</a><a href="/a?b=1&amp;c=2">z</a>';
  assert.deepEqual(extractLinks(html), ['/experience/category/SaaS', '/a']);
});

test('addUnique keeps first source for duplicate keys', () => {
  const m = new Map();
  addUnique(m, '/experience/category/Merger+%26+Acquisition', 'sitemap');
  addUnique(m, '/experience/category/Merger+&+Acquisition', 'crawl:/experience');
  assert.equal(m.size, 1);
  assert.equal([...m.values()][0].source, 'sitemap');
});

test('migration scripts refuse to run after launch unless explicitly overridden', async () => {
  const { guardMigration } = await import('../scripts/lib/inventory.mjs');
  assert.throws(() => guardMigration(['node', 'scripts/scrape.mjs']), /peak-tech\.com is now the Netlify site/);
  assert.doesNotThrow(() => guardMigration(['node', 'scripts/scrape.mjs', '--squarespace-migration']));
});
