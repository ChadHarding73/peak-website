import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDocument } from 'htmlparser2';
import * as DU from 'domutils';
import serializer from 'dom-serializer';
const render = serializer.default || serializer;
import { visibleText } from '../scripts/lib/text.mjs';
import { convertPage, summaryArgs } from '../scripts/lib/sections.mjs';

const fx = name => readFileSync(`tests/fixtures/pages/${name}`, 'utf8');
const hasClass = (e, c) => (e.attribs?.class || '').split(/\s+/).includes(c);
const DYNAMIC = ['sqs-block-summary-v2', 'sqs-block-form', 'sqs-block-socialaccountlinks']; // code blocks pass through, so their text stays

// Expected text: the raw page with the blocks the converter replaces by live partials removed.
function staticText(html) {
  const doc = parseDocument(html);
  for (const el of DU.findAll(e => DYNAMIC.some(c => hasClass(e, c)), doc.children)) DU.removeElement(el);
  return visibleText(render(doc));
}
const ORDER = { perspectives: [], experience: ['mobohubb-acquired-by-guardhouse', 'x', 'y', 'z'] };

for (const page of ['home', 'people', 'contact', 'careers', 'indemnification', 'error-page']) {
  test(`convertPage preserves the static visible text of ${page}`, () => {
    const raw = fx(`${page}-main.html`);
    const { html } = convertPage(raw, ORDER);
    const stripped = html.replace(/\{%[\s\S]*?%\}/g, ' ');
    assert.equal(visibleText(stripped), staticText(raw));
  });
}

test('convertPage emits one band per Squarespace section, with theme, layout classes, background and padding', () => {
  const { html } = convertPage(fx('home-main.html'), ORDER);
  const bands = html.match(/<section class="band [^"]*"[^>]*>/g);
  assert.equal(bands.length, 6);
  assert.match(bands[0], /band--light/);
  assert.match(bands[0], /w-medium ha-left va-bottom/);
  assert.match(bands[0], /--bg: url\('https:\/\/images\.squarespace-cdn\.com\//);
  assert.match(bands[0], /--pt: calc\(10vmax \/ 5\)/);
  assert.match(html, /<div class="row"><div class="col" style="--span: 6; --of: 12">/);
});

test('convertPage strips Squarespace wrappers and ids from the output', () => {
  const { html } = convertPage(fx('home-main.html'), ORDER);
  assert.doesNotMatch(html, /sqs-block|yui_|data-block|website-component/);
});

test('convertPage keeps accent and alignment classes on text but no inline styles', () => {
  const { html } = convertPage(fx('home-main.html'), ORDER);
  assert.doesNotMatch(html.replace(/<section[^>]*>/g, ''), /style="white-space/);
});

test('convertPage replaces dynamic blocks with shortcodes/partials and reports no unknown blocks', () => {
  const home = convertPage(fx('home-main.html'), ORDER);
  assert.equal((home.html.match(/\{% summary /g) || []).length, 2);
  assert.match(home.html, /"perRow":3,"gutter":60/);
  assert.deepEqual(home.warnings.filter(w => w.startsWith('unknown')), []);
  const contact = convertPage(fx('contact-main.html'), ORDER);
  assert.match(contact.html, /\{% include "partials\/contact-form\.njk" %\}/);
  assert.match(contact.html, /assets\.calendly\.com\/assets\/external\/widget\.js/);
  assert.ok(contact.warnings.some(w => w.startsWith('code block')));
  assert.match(convertPage(fx('people-main.html'), ORDER).html, /\{% include "partials\/social\.njk" %\}/);
});

test('summaryArgs uses "latest N" when items are the newest N, else the exact slugs', () => {
  assert.deepEqual(summaryArgs(['/experience/mobohubb-acquired-by-guardhouse', '/experience/x'], ['summary-block-setting-design-autogrid', 'summary-block-setting-primary-metadata-date', 'summary-block-setting-metadata-position-below-content'], ORDER),
    { collection: 'experience', latest: 2, design: 'autogrid', meta: 'date', metaPosition: 'below-content', excerpt: false, readMore: false });
  assert.deepEqual(summaryArgs(['/perspectives/b', '/perspectives/a'], ['summary-block-setting-design-carousel', 'summary-block-setting-show-excerpt', 'summary-block-setting-show-read-more-link', 'summary-block-setting-primary-metadata-cats', 'summary-block-setting-metadata-position-below-title'], { perspectives: ['a', 'b'] }),
    { collection: 'perspectives', slugs: ['b', 'a'], design: 'carousel', meta: 'cats', metaPosition: 'below-title', excerpt: true, readMore: true });
});

test('a fluid-engine section becomes a grid whose cells keep their mobile and desktop placement', () => {
  const { html } = convertPage(fx('home-main.html'), ORDER);
  const grid = html.match(/<div class="fe-grid"[^>]*>([\s\S]*?)<\/section>/)[1];
  const cells = grid.match(/<div class="fe-cell" style="[^"]*">/g);
  assert.equal(cells.length, 3);
  assert.match(cells[0], /--m: 1\/2\/3\/10; --d: 4\/5\/8\/17/);
  assert.match(grid, /Recent Transactions[\s\S]*View All Transactions[\s\S]*\{% summary /);
});

import { convertLayout } from '../scripts/lib/sections.mjs';
import { cleanBody } from '../scripts/lib/convert.mjs';

test('convertLayout keeps an item body\'s columns and all of its text', () => {
  for (const f of ['team-item.json', 'experience-item.json', 'perspectives-item.json', 'quote-item.json', 'gallery-item.json', 'gallery-captions-item.json']) {
    const item = JSON.parse(readFileSync(`tests/fixtures/${f}`, 'utf8'));
    const { html, warnings } = convertLayout(item.body);
    assert.equal(visibleText(html), visibleText(cleanBody(item.body)), f);
    assert.deepEqual(warnings.filter(w => w.startsWith('unknown')), [], f);
  }
  const bio = convertLayout(JSON.parse(readFileSync('tests/fixtures/team-item.json', 'utf8')).body).html;
  assert.match(bio, /<div class="col" style="--span: \d+; --of: 12"><div class="b b--image"><figure class="image"><img src="https:\/\/images\.squarespace-cdn\.com/);
});

test('convertPage keeps ids for blocks that the custom CSS targets', () => {
  const { html } = convertPage(fx('home-main.html'), ORDER, { keepIds: new Set(['yui_3_17_2_1_1607119205190_12427']) });
  assert.match(html, /id="b-yui_3_17_2_1_1607119205190_12427"/);
});

test('a collection list section becomes the collection-list partial; the bands around it stay', () => {
  const { html } = convertPage(fx('experience-list-main.html'), ORDER);
  assert.equal((html.match(/\{% include "partials\/collection-list\.njk" %\}/g) || []).length, 1);
  assert.match(html, /Dealmakers/);
  assert.match(html, /<section class="band band--bright/);
  assert.doesNotMatch(html, /Merger &amp; Acquisition, SaaS/);
});

test('quote and gallery blocks become a blockquote and an image list', () => {
  const q = convertLayout(JSON.parse(readFileSync('tests/fixtures/quote-item.json', 'utf8')).body).html;
  assert.match(q, /<blockquote class="quote">/);
  const g = convertLayout(JSON.parse(readFileSync('tests/fixtures/gallery-item.json', 'utf8')).body).html;
  assert.match(g, /<div class="gallery gallery--slider">(<figure class="image"><img src="https:\/\/images\.squarespace-cdn\.com[^"]+" alt="[^"]*" loading="lazy">(<figcaption>[^<]*<\/figcaption>)?<\/figure>)+<\/div>/);
});

test('the footer keeps the Finalis disclosure preformatted, exactly as authored', () => {
  const { html } = convertPage(fx('footer.html'), ORDER);
  assert.match(html, /<pre><code>Securities are offered through <a href="https:\/\/www\.finalis\.com\/" target="_blank">Finalis Securities LLC<\/a>/);
  assert.match(html, /Finalis Business Continuity Plan[\s\S]*FINRA BrokerCheck[\s\S]*Form CRS/);
});

test('nested columns are sized relative to their parent column, as Squarespace does', () => {
  const { html } = convertPage(fx('home-main.html'), ORDER);
  assert.match(html, /<div class="col" style="--span: 12; --of: 12"><div class="row"><div class="col" style="--span: 6; --of: 12">/);
  const { html: err } = convertPage(fx('error-page-main.html'), ORDER);
  assert.match(err, /<div class="col" style="--span: 6; --of: 12"><div class="row"><div class="col" style="--span: 4; --of: 6">/);
});

test('every block keeps its own padded wrapper, as Squarespace blocks do (no collapsing gaps)', () => {
  const { html } = convertPage(fx('home-main.html'), ORDER, { keepIds: new Set(['yui_3_17_2_1_1607119205190_12427']) });
  assert.match(html, /<div class="b b--html"><h1>/);
  assert.match(html, /<div class="b b--spacer"><div class="spacer vsize-1"><\/div><\/div>/);
  assert.match(html, /<div class="b b--summary-v2" id="b-yui_3_17_2_1_1607119205190_12427">\{% summary /);
});

test('a custom section height N (padding calc(Nvmax / 10)) also sets min-height: Nvh', () => {
  const bands = convertPage(fx('home-main.html'), ORDER).html.match(/<section class="band [^"]*"[^>]*>/g);
  assert.match(bands[1], /--pt: calc\(65vmax \/ 10\); --pb: calc\(65vmax \/ 10\); min-height: 65vh;/);
  assert.doesNotMatch(bands[0], /min-height/);
});

test('a fluid-engine grid carries its mobile and desktop row counts', () => {
  const { html } = convertPage(fx('home-main.html'), ORDER);
  assert.match(html, /<div class="fe-grid" style="--rows-m: 15; --rows-d: 16">/);
});

test('text alignment survives sanitizing (only text-align; other inline styles still dropped)', () => {
  const { html } = convertPage(fx('experience-list-main.html'), ORDER);
  assert.match(html, /<h2 style="text-align:center"><strong>Transactions<\/strong><\/h2>|<h2 style="text-align:center">[^<]*Transactions/);
  assert.doesNotMatch(html.replace(/<section[^>]*>/g, ''), /white-space/);
});
