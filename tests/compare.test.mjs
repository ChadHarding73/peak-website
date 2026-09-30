import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { normalizeText, firstDifference, diffRatio, classify } from '../scripts/lib/compare.mjs';

function solid(w, h, rgb) {
  const p = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) p.data.set([...rgb, 255], i * 4);
  return p;
}

test('normalizeText collapses whitespace and nbsp but keeps punctuation exact', () => {
  assert.equal(normalizeText('  A  “quote”\n\n—  B '), 'A “quote” — B');
});

test('firstDifference returns null for equal and context for unequal', () => {
  assert.equal(firstDifference('abc', 'abc'), null);
  const d = firstDifference('hello world', 'hello there');
  assert.equal(d.index, 6);
  assert.match(d.old, /world/);
  assert.match(d.new, /there/);
});

test('diffRatio is 0 for identical, ~1 for opposite, pads different heights', () => {
  assert.equal(diffRatio(solid(10, 10, [0, 0, 0]), solid(10, 10, [0, 0, 0])).ratio, 0);
  assert.ok(diffRatio(solid(10, 10, [0, 0, 0]), solid(10, 10, [255, 255, 255])).ratio > 0.99);
  const r = diffRatio(solid(10, 10, [0, 0, 0]), solid(10, 20, [0, 0, 0]));
  assert.equal(r.heightDelta, 0.5);
});

test('classify flags text differences, high pixel ratio and height drift', () => {
  assert.equal(classify({ text: null, desktop: { ratio: 0.001, heightDelta: 0 }, mobile: { ratio: 0.001, heightDelta: 0 } }).status, 'match');
  const c = classify({ text: { index: 1, old: 'a', new: 'b' }, desktop: { ratio: 0.05, heightDelta: 0.1 }, mobile: { ratio: 0, heightDelta: 0 } });
  assert.equal(c.status, 'flag');
  assert.deepEqual(c.reasons, ['text differs', 'desktop pixels 5.0%', 'desktop height 10.0%']);
});
