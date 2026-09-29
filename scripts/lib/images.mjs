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

export function assignNames(refs) {
  const byUrl = new Map();
  const used = new Set();
  for (const { url, stem } of refs) {
    const key = originalUrl(url);
    if (byUrl.has(key)) continue;
    let name = localName(key, stem);
    for (let n = 2; used.has(name); n++) name = localName(key, `${stem}-${n}`);
    used.add(name);
    byUrl.set(key, name);
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
