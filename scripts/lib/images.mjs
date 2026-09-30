import { createHash } from 'node:crypto';
export const IMAGE_HOSTS = /https?:\/\/(?:images\.squarespace-cdn\.com|static1\.squarespace\.com)\/[^\s"'<>)?]+(?:\?[^\s"'<>)]*)?/g;

export function originalUrl(u) {
  const url = new URL(u.replace(/^http:/, 'https:'));
  url.search = '';
  return url.toString();
}

export function localName(u, stem) {
  const ext = (new URL(u).pathname.match(/\.([a-z0-9]+)$/i)?.[1] || 'bin').toLowerCase();
  return `${stem}.${ext === 'jpeg' ? 'jpg' : ext}`;
}

// A local name is the file's stem plus a fingerprint of its source URL. Different uploads can
// never share a name, and a re-run always maps a URL to the same file (so a cached file is
// always the right one). This replaced positional names, which re-runs silently reused.
export function assignNames(refs) {
  const byUrl = new Map();
  for (const { url, stem } of refs) {
    const key = originalUrl(url);
    if (byUrl.has(key)) continue;
    const fp = createHash('sha1').update(key).digest('hex').slice(0, 8);
    byUrl.set(key, localName(key, `${stem}-${fp}`));
  }
  return byUrl;
}

export function rewriteRefs(text, map) {
  return text.replace(IMAGE_HOSTS, m => map.get(originalUrl(m)) ?? m);
}

export const ORIGINAL_ACCEPT = 'image/png,image/jpeg,image/gif,image/svg+xml,image/*;q=0.5';

const EXT_TYPES = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', pdf: 'application/pdf' };

export function typeMatchesName(name, contentType) {
  const ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
  return EXT_TYPES[ext] === (contentType || '').split(';')[0].trim();
}

export function nameForType(name, contentType) {
  if (!name.endsWith('.bin')) return name;
  const type = (contentType || '').split(';')[0].trim();
  const ext = Object.keys(EXT_TYPES).find(k => EXT_TYPES[k] === type);
  return ext ? name.replace(/\.bin$/, `.${ext}`) : name;
}

export function acceptFor(url) {
  const ext = (new URL(url).pathname.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
  return EXT_TYPES[ext === 'jpeg' ? 'jpg' : ext] || ORIGINAL_ACCEPT;
}
