import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEntry } from '../scripts/lib/smoke.mjs';

function fakeFetch(table) {
  return async url => {
    const path = new URL(url).pathname;
    const r = table[path] || { status: 404 };
    return { status: r.status, headers: { get: k => (k === 'location' ? r.location : null) } };
  };
}
const base = 'https://preview.example';

test('200 on both slash forms passes (Review Focus 2)', async () => {
  const f = fakeFetch({ '/team/chad-harding': { status: 200 }, '/team/chad-harding/': { status: 200 } });
  assert.equal((await checkEntry({ path: '/team/chad-harding', status: 200 }, f, base)).ok, true);
});

test('one slash redirect to a 200 passes', async () => {
  const f = fakeFetch({ '/team/chad-harding': { status: 200 }, '/team/chad-harding/': { status: 301, location: '/team/chad-harding' } });
  assert.equal((await checkEntry({ path: '/team/chad-harding', status: 200 }, f, base)).ok, true);
});

test('404 fails with detail', async () => {
  const r = await checkEntry({ path: '/experience/category/Merger+%26+Acquisition', status: 200 }, fakeFetch({}), base);
  assert.equal(r.ok, false);
  assert.match(r.detail, /404/);
});

test('redirect to a different page fails for a 200 entry', async () => {
  const f = fakeFetch({ '/people': { status: 301, location: '/' }, '/people/': { status: 200 } });
  assert.equal((await checkEntry({ path: '/people', status: 200 }, f, base)).ok, false);
});

test('baseline 3xx entries must redirect to the same target', async () => {
  const f = fakeFetch({ '/home': { status: 301, location: '/' }, '/home/': { status: 301, location: '/' } });
  assert.equal((await checkEntry({ path: '/home', status: 301, location: 'https://www.peak-tech.com/' }, f, base)).ok, true);
});
