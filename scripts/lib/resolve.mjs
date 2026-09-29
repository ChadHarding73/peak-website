import { existsSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

function isFile(p) { return existsSync(p) && statSync(p).isFile(); }

export function resolveFile(root, urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  const base = resolve(root);
  const trimmed = p.length > 1 ? p.replace(/\/+$/, '') : p;
  const candidates = trimmed === '/' ? ['index.html'] : [trimmed, `${trimmed}.html`, `${trimmed}/index.html`];
  for (const c of candidates) {
    const full = resolve(join(base, c));
    if (!full.startsWith(base + sep)) return null;
    if (isFile(full)) return full;
  }
  return null;
}

export function parseRedirects(text) {
  return text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => {
    const [from, to, status = '301'] = l.split(/\s+/);
    return { from, to, status: Number(status) };
  });
}

export function matchRedirect(rules, urlPath) {
  const p = urlPath.length > 1 ? urlPath.replace(/\/+$/, '') : urlPath;
  return rules.find(r => r.from === p || r.from === decodeURIComponent(p)) || null;
}
