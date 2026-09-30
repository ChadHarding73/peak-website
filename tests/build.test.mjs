import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

function htmlFiles(dir) {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? htmlFiles(p) : p.endsWith('.html') ? [p] : [];
  });
}
const pages = htmlFiles('_site');
const read = p => readFileSync(p, 'utf8');

// No "exactly one h1" rule: the replica keeps Squarespace's heading structure (0 h1 on legal pages,
// several on careers), which matches the live site. Heading cleanup is a post-launch SEO task.
test('every page has header, main and footer', () => {
  for (const p of pages) {
    const h = read(p);
    assert.match(h, /<header class="site-header[ "]/, p);
    assert.match(h, /<main\b/, p);
    assert.match(h, /<footer class="site-footer[ "]/, p);
  }
});

test('no Squarespace or Typekit references survive in output', () => {
  for (const p of pages) assert.doesNotMatch(read(p), /squarespace-cdn\.com|static1\.squarespace\.com|use\.typekit\.net/, p);
});

test('SEO title and description carry over for a sample of each type', () => {
  for (const [src, out] of [['src/team/chad-harding.md', '_site/team/chad-harding/index.html'], ['src/experience/mobohubb-acquired-by-guardhouse.md', '_site/experience/mobohubb-acquired-by-guardhouse/index.html']]) {
    const { data } = matter(read(src));
    const h = read(out);
    if (data.seoTitle) assert.ok(h.includes(`<title>${data.seoTitle.replace(/&/g, '&amp;')}</title>`), `${out} title`);
    if (data.seoDescription) assert.ok(h.includes(`content="${data.seoDescription.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`), `${out} description`);
  }
});

test('canonical links use the lowercase path Netlify serves', () => {
  const h = readFileSync('_site/team/nick-bountouvas-Hagtv/index.html', 'utf8');
  assert.match(h, /<link rel="canonical" href="https:\/\/www\.peak-tech\.com\/team\/nick-bountouvas-hagtv">/);
});

test('every standalone page has real body content (guards the empty-body extraction bug)', () => {
  for (const slug of ['index', 'people', 'contact', 'careers', 'indemnification', 'arbitration', 'demo', 'error-page', 'investment-banking-analyst', 'investment-banking-associate']) {
    const file = slug === 'index' ? '_site/index.html' : `_site/${slug}/index.html`;
    const main = read(file).split('<main>')[1].split('</main>')[0];
    assert.ok(main.replace(/<[^>]+>/g, '').trim().length > 40, `${file} main is empty`);
  }
});

test('the 404 page carries the error-page copy', () => {
  assert.match(read('_site/404.html'), /We couldn’t find the page you were looking for/);
});
