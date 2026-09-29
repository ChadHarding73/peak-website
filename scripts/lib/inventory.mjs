import { decodeEntities } from './text.mjs';

export const ORIGIN = 'https://www.peak-tech.com';
const HOSTS = new Set(['www.peak-tech.com', 'peak-tech.com']);
const SKIP = [/^\/config(\/|$)/, /^\/cart(\/|$)/, /^\/api\//, /^\/static\//, /^\/universal\//, /^\/commerce\//, /^\/account(\/|$)/];

export function toPath(href, base = ORIGIN) {
  let u;
  try { u = new URL(decodeEntities(href.trim()), base); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || !HOSTS.has(u.hostname)) return null;
  let p = u.pathname;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (SKIP.some(r => r.test(p))) return null;
  return p;
}

export function pathKey(p) {
  try { return decodeURIComponent(p); } catch { return p; }
}

export function parseSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => toPath(m[1])).filter(Boolean);
}

export function extractLinks(html, base = ORIGIN) {
  const out = [];
  for (const m of html.matchAll(/\bhref\s*=\s*"([^"]+)"/g)) {
    const p = toPath(m[1], base);
    if (p) out.push(p);
  }
  return out;
}

export function addUnique(map, p, source) {
  const k = pathKey(p);
  if (!map.has(k)) map.set(k, { path: p, source });
  return map;
}
