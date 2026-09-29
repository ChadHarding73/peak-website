const strip = p => (p.length > 1 ? p.replace(/\/+$/, '') : p);
const pathOf = (loc, base) => strip(decodeURIComponent(new URL(loc, base).pathname));

async function resolveOnce(url, fetchFn, base) {
  const r = await fetchFn(url, { redirect: 'manual' });
  if (r.status >= 300 && r.status < 400) {
    const loc = r.headers.get('location');
    const r2 = await fetchFn(new URL(loc, base).toString(), { redirect: 'manual' });
    return { first: r.status, final: r2.status, to: pathOf(loc, base) };
  }
  return { first: r.status, final: r.status, to: null };
}

export async function checkEntry(entry, fetchFn = fetch, base) {
  const variants = entry.path === '/' ? ['/'] : [entry.path, `${entry.path}/`];
  const self = strip(decodeURIComponent(entry.path));
  for (const v of variants) {
    const r = await resolveOnce(base + v, fetchFn, base);
    if (entry.status >= 300 && entry.status < 400) {
      const want = pathOf(entry.location, base);
      if (r.first < 300 || r.first >= 400 || r.to !== want) return { path: v, ok: false, detail: `expected redirect to ${want}, got ${r.first} -> ${r.to}` };
      continue;
    }
    if (r.final !== 200) return { path: v, ok: false, detail: `status ${r.first}${r.to ? ` -> ${r.to} ${r.final}` : ''}` };
    if (r.to !== null && r.to !== self) return { path: v, ok: false, detail: `redirected away to ${r.to}` };
  }
  return { path: entry.path, ok: true, detail: '' };
}
