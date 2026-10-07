import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { toWebpRefs, webpSibling, isRaster } from '../scripts/lib/webp.mjs';

test('img src and CSS url() swap to the WebP sibling; og:image and links do not', () => {
  const has = () => true;
  const html = '<img src="/images/team/a-1.jpg" alt="x"><section style="--bg: url(\'/images/pages/b.png\');"><meta property="og:image" content="https://www.peak-tech.com/images/c.png"><a href="/images/d.jpg">d</a>';
  assert.equal(toWebpRefs(html, has), '<img src="/images/team/a-1.webp" alt="x"><section style="--bg: url(\'/images/pages/b.webp\');"><meta property="og:image" content="https://www.peak-tech.com/images/c.png"><a href="/images/d.jpg">d</a>');
});

test('an image without a WebP copy keeps its original src', () => {
  assert.equal(toWebpRefs('<img src="/images/x/new.png">', () => false), '<img src="/images/x/new.png">');
});

test('every JPG/PNG in src/images has a WebP copy (run npm run webp)', () => {
  const missing = [];
  for (const dir of readdirSync('src/images')) {
    const d = join('src/images', dir);
    if (!statSync(d).isDirectory()) continue;
    for (const f of readdirSync(d)) if (isRaster(f) && !existsSync(join(d, webpSibling(f)))) missing.push(join(dir, f));
  }
  assert.deepEqual(missing, []);
});
