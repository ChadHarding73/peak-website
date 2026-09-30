import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRetry } from '../scripts/lib/net.mjs';

test('withRetry retries transient failures, then succeeds', async () => {
  let n = 0;
  const v = await withRetry(async () => { if (++n < 3) throw new Error('fetch failed'); return 'ok'; }, { tries: 3, delayMs: 1 });
  assert.equal(v, 'ok');
  assert.equal(n, 3);
});

test('withRetry rethrows after the last try', async () => {
  await assert.rejects(withRetry(async () => { throw new Error('boom'); }, { tries: 2, delayMs: 1 }), /boom/);
});
