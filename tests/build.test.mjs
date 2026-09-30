import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
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
import { execSync } from 'node:child_process';

test('contact form posts without JavaScript and is Netlify-detectable (Review Focus 5)', () => {
  const h = read('_site/contact/index.html');
  const form = h.match(/<form\b[^>]*>/)[0];
  assert.match(form, /name="contact"/);
  assert.match(form, /method="POST"/i);
  assert.match(form, /action="\/contact-thanks"/);
  assert.match(form, /data-netlify="true"/);
  assert.match(form, /netlify-honeypot="bot-field"/);
  assert.match(h, /<input[^>]+name="form-name"[^>]+value="contact"/);
  const body = h.slice(h.indexOf(form), h.indexOf('</form>'));
  for (const m of body.matchAll(/<(input|textarea|select)\b[^>]*>/g)) {
    if (/type="(submit|hidden)"/.test(m[0]) || /name="bot-field"/.test(m[0])) continue;
    assert.match(m[0], /\bname="[^"]+"/, `field without name: ${m[0]}`);
  }
});

test('non-production builds are noindex and load no analytics; production is the reverse', () => {
  execSync('npx @11ty/eleventy --quiet', { env: { ...process.env, CONTEXT: 'branch-deploy' } });
  let h = read('_site/index.html');
  assert.match(h, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(h, /googletagmanager\.com/);
  execSync('npx @11ty/eleventy --quiet', { env: { ...process.env, CONTEXT: 'production' } });
  h = read('_site/index.html');
  assert.doesNotMatch(h, /noindex/);
  assert.match(h, /googletagmanager\.com\/gtag\/js\?id=G-3K4D2PRNEL/);
});

test('the contact form carries the live form\'s fields, options and required flags', () => {
  const h = read('_site/contact/index.html');
  const body = h.slice(h.indexOf('<form'), h.indexOf('</form>'));
  for (const label of ['First Name', 'Last Name', 'Company', 'Email', 'What are you exploring?', 'Anything you&#39;d like us to know?']) assert.ok(body.includes(label) || body.includes(label.replace('&#39;', "'")), label);
  for (const opt of ['Sale', 'Capital Raise', 'Just gathering information']) assert.match(body, new RegExp(`<option[^>]*>${opt}</option>`));
  assert.equal((body.match(/\srequired(?=[\s>])/g) || []).length, 5);
  assert.match(body, /<button type="submit"[^>]*>Submit<\/button>/);
  assert.ok(existsSync('_site/contact-thanks/index.html'));
});
