import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export function normalizeText(s) {
  return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

export function firstDifference(a, b) {
  if (a === b) return null;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return { index: i, old: a.slice(Math.max(0, i - 40), i + 60), new: b.slice(Math.max(0, i - 40), i + 60) };
}

function pad(png, w, h) {
  const out = new PNG({ width: w, height: h });
  out.data.fill(255);
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
}

export function diffRatio(a, b) {
  const w = Math.max(a.width, b.width);
  const h = Math.max(a.height, b.height);
  const diff = pixelmatch(pad(a, w, h).data, pad(b, w, h).data, null, w, h, { threshold: 0.1 });
  return { ratio: diff / (w * h), heightDelta: Math.abs(a.height - b.height) / h };
}

export function classify(r, { maxRatio = 0.02, maxHeightDelta = 0.05 } = {}) {
  const reasons = [];
  if (r.text) reasons.push('text differs');
  for (const k of ['desktop', 'mobile']) {
    if (r[k].ratio > maxRatio) reasons.push(`${k} pixels ${(r[k].ratio * 100).toFixed(1)}%`);
    if (r[k].heightDelta > maxHeightDelta) reasons.push(`${k} height ${(r[k].heightDelta * 100).toFixed(1)}%`);
  }
  return { status: reasons.length ? 'flag' : 'match', reasons };
}
