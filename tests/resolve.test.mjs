import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveFile, parseRedirects, matchRedirect } from '../scripts/lib/resolve.mjs';

const root = mkdtempSync(join(tmpdir(), 'site-'));
mkdirSync(join(root, 'team/chad-harding'), { recursive: true });
mkdirSync(join(root, 'experience/category/Merger+&+Acquisition'), { recursive: true });
writeFileSync(join(root, 'index.html'), 'home');
writeFileSync(join(root, 'team/chad-harding/index.html'), 'bio');
writeFileSync(join(root, 'experience/category/Merger+&+Acquisition/index.html'), 'cat');

test('resolves /, extensionless and trailing-slash forms (Review Focus 2)', () => {
  assert.equal(resolveFile(root, '/'), join(root, 'index.html'));
  assert.equal(resolveFile(root, '/team/chad-harding'), join(root, 'team/chad-harding/index.html'));
  assert.equal(resolveFile(root, '/team/chad-harding/'), join(root, 'team/chad-harding/index.html'));
});

test('resolves percent-encoded category paths (Review Focus 1)', () => {
  assert.equal(resolveFile(root, '/experience/category/Merger+%26+Acquisition'), join(root, 'experience/category/Merger+&+Acquisition/index.html'));
});

test('returns null for missing pages and path traversal', () => {
  assert.equal(resolveFile(root, '/nope'), null);
  assert.equal(resolveFile(root, '/../etc/passwd'), null);
});

test('parseRedirects and matchRedirect', () => {
  const rules = parseRedirects('# comment\n/home   /   301\n/old-page /new-page 301\n');
  assert.deepEqual(matchRedirect(rules, '/home'), { from: '/home', to: '/', status: 301 });
  assert.deepEqual(matchRedirect(rules, '/home/'), { from: '/home', to: '/', status: 301 });
  assert.equal(matchRedirect(rules, '/x'), null);
});
