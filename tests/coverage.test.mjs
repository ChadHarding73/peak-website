import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolveFile, parseRedirects, matchRedirect } from '../scripts/lib/resolve.mjs';

test('every baseline 200/3xx URL is served by _site or _redirects', () => {
  assert.ok(existsSync('_site/index.html'), 'run `npm run build` first');
  const urls = JSON.parse(readFileSync('baseline/urls.json', 'utf8'));
  const rules = parseRedirects(readFileSync('src/_redirects', 'utf8'));
  const missing = urls
    .filter(u => u.status === 200 || (u.status >= 300 && u.status < 400))
    .filter(u => !resolveFile('_site', u.path) && !matchRedirect(rules, u.path))
    .map(u => u.path);
  assert.deepEqual(missing, []);
});
